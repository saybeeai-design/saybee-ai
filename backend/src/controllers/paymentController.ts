import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { getRazorpayClient, razorpayWebhookSecret, PLANS } from '../services/razorpayService';
import { sendPaymentSuccessEmail } from '../services/emailService';

type PaymentPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: string;
};

const createSignature = (orderId: string, paymentId: string): string =>
  crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

export const verifyCheckoutSignature = (payload: PaymentPayload): boolean => {
  const expectedSignature = createSignature(payload.razorpay_order_id, payload.razorpay_payment_id);
  return expectedSignature === payload.razorpay_signature;
};

const processPayment = async (params: {
  userId: string;
  plan: string;
  paymentId: string;
  orderId: string;
  eventId?: string;
  rawPayload?: unknown;
}): Promise<{ creditsAdded: number; user: { id: string; name: string | null; email: string; credits: number; subscriptionType: string; isPaid: boolean; role: string } }> => {
  const { userId, plan, paymentId, orderId, eventId, rawPayload } = params;
  const planConfig = PLANS[plan.toLowerCase()];
  if (!planConfig) throw new Error('Invalid plan');

  const existingRecord = await prisma.paymentRecord.findUnique({
    where: { paymentId },
    select: { id: true },
  });

  if (existingRecord) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        subscriptionType: true,
        isPaid: true,
        role: true,
      },
    });

    return { creditsAdded: 0, user };
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: planConfig.credits },
        isPaid: true,
        subscriptionType: planConfig.subscriptionType,
      },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        subscriptionType: true,
        isPaid: true,
        role: true,
      },
    }),
    prisma.subscription.create({
      data: {
        userId,
        plan: planConfig.subscriptionType,
        status: 'ACTIVE',
      },
    }),
    prisma.paymentRecord.create({
      data: {
        paymentId,
        orderId,
        provider: 'RAZORPAY',
        eventType: 'PAYMENT_CAPTURED',
        eventId,
        email: '',
        amount: planConfig.amount,
        creditsAdded: planConfig.credits,
        status: 'PROCESSED',
        rawPayload: rawPayload as any,
        userId,
      },
    }),
    prisma.usageLog.create({
      data: {
        userId,
        action: 'PAYMENT_SUCCESS',
        details: JSON.stringify({
          plan,
          credits: planConfig.credits,
          amount: planConfig.amount,
          paymentId,
          orderId,
        }),
      },
    }),
  ]);

  await prisma.paymentRecord.update({
    where: { paymentId },
    data: { email: updatedUser.email },
  });

  return { creditsAdded: planConfig.credits, user: updatedUser };
};

export const createOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { plan } = req.body as { plan: string };
    const planConfig = PLANS[plan?.toLowerCase()];

    if (!planConfig) {
      res.status(400).json({
        message: `Invalid plan. Valid options: ${Object.keys(PLANS).join(', ')}`,
      });
      return;
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: planConfig.amount,
      currency: planConfig.currency,
      receipt: `rcpt_${userId.slice(0, 8)}_${Date.now()}`,
      notes: { userId, plan },
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
      keyId: process.env.RAZORPAY_KEY_ID || null,
      stub: false,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const payload = req.body as PaymentPayload;
    const planConfig = PLANS[payload.plan?.toLowerCase()];
    if (!planConfig) {
      res.status(400).json({ message: 'Invalid plan.' });
      return;
    }

    if (!verifyCheckoutSignature(payload)) {
      res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
      return;
    }

    const razorpay = getRazorpayClient();
    const payment = await razorpay.payments.fetch(payload.razorpay_payment_id);
    if (payment.order_id !== payload.razorpay_order_id || payment.status !== 'captured') {
      res.status(400).json({ message: 'Payment verification failed. Payment not captured.' });
      return;
    }

    if (payment.amount !== planConfig.amount) {
      res.status(400).json({ message: 'Payment amount mismatch.' });
      return;
    }

    const result = await processPayment({
      userId,
      plan: payload.plan,
      paymentId: payload.razorpay_payment_id,
      orderId: payload.razorpay_order_id,
      rawPayload: payload,
    });

    if (result.creditsAdded > 0) {
      try {
        await sendPaymentSuccessEmail(
          result.user.email,
          result.user.name ?? 'there',
          planConfig.subscriptionType,
          planConfig.credits,
          planConfig.amount
        );
      } catch (emailErr) {
        console.error('[Email] Failed to send payment success email:', emailErr);
      }
    }

    res.status(200).json({
      message: result.creditsAdded > 0 ? 'Payment verified successfully!' : 'Payment already processed.',
      user: result.user,
      creditsAdded: result.creditsAdded,
    });
  } catch (error) {
    next(error);
  }
};

export const webhookPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!razorpayWebhookSecret) {
      res.status(500).json({ message: 'RAZORPAY_WEBHOOK_SECRET is not configured' });
      return;
    }

    const signature = req.header('x-razorpay-signature');
    const eventId = req.header('x-razorpay-event-id') || undefined;
    if (!signature || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ message: 'Invalid webhook payload' });
      return;
    }

    const expected = crypto.createHmac('sha256', razorpayWebhookSecret).update(req.body).digest('hex');
    if (expected !== signature) {
      res.status(400).json({ message: 'Invalid webhook signature' });
      return;
    }

    const event = JSON.parse(req.body.toString('utf8')) as any;
    if (event.event !== 'payment.captured') {
      res.status(200).json({ message: 'Ignored event' });
      return;
    }

    const payment = event.payload?.payment?.entity;
    const notes = payment?.notes || {};
    const userId = notes.userId as string | undefined;
    const plan = notes.plan as string | undefined;
    const paymentId = payment?.id as string | undefined;
    const orderId = payment?.order_id as string | undefined;

    if (!userId || !plan || !paymentId || !orderId) {
      res.status(400).json({ message: 'Missing webhook payment metadata' });
      return;
    }

    const result = await processPayment({
      userId,
      plan,
      paymentId,
      orderId,
      eventId,
      rawPayload: event,
    });

    res.status(200).json({ message: 'Webhook processed', creditsAdded: result.creditsAdded });
  } catch (error) {
    next(error);
  }
};

export const getBillingHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    const payments = await prisma.paymentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json({ subscriptions, payments });
  } catch (error) {
    next(error);
  }
};
