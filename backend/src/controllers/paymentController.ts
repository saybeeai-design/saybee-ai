import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { razorpay, isRazorpayStub, PLANS } from '../services/razorpayService';
import { sendPaymentSuccessEmail } from '../services/emailService';

// ─── POST /api/payments/create-order ─────────────────────────────────────────
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

    // Stub / test mode — return a fake order so the frontend can test the flow
    if (isRazorpayStub) {
      console.log(`[Razorpay Stub] Creating order for plan: ${plan}, amount: ₹${planConfig.amount / 100}`);
      res.status(200).json({
        orderId: `stub_order_${Date.now()}`,
        amount: planConfig.amount,
        currency: planConfig.currency,
        plan,
        stub: true,
      });
      return;
    }

    const order = await razorpay!.orders.create({
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
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/payments/verify ────────────────────────────────────────────────
export const verifyPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      plan: string;
    };

    const planConfig = PLANS[plan?.toLowerCase()];
    if (!planConfig) {
      res.status(400).json({ message: 'Invalid plan.' });
      return;
    }

    // ── Signature Verification ──────────────────────────────────────────────
    if (!isRazorpayStub) {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
        return;
      }
    } else {
      console.log(`[Razorpay Stub] Skipping signature verification for stub order.`);
    }

    // ── Update DB ──────────────────────────────────────────────────────────
    const updatedUser = await prisma.user.update({
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
    });

    // ── Log Subscription ───────────────────────────────────────────────────
    await prisma.subscription.create({
      data: {
        userId,
        plan: planConfig.subscriptionType,
        status: 'ACTIVE',
      },
    });

    // ── Log Usage ──────────────────────────────────────────────────────────
    await prisma.usageLog.create({
      data: {
        userId,
        action: 'PAYMENT_SUCCESS',
        details: JSON.stringify({
          plan,
          credits: planConfig.credits,
          amount: planConfig.amount,
          razorpay_payment_id,
          razorpay_order_id,
        }),
      },
    });

    // ── Send Email ─────────────────────────────────────────────────────────
    try {
      await sendPaymentSuccessEmail(
        updatedUser.email,
        updatedUser.name ?? 'there',
        planConfig.subscriptionType,
        planConfig.credits,
        planConfig.amount
      );
    } catch (emailErr) {
      console.error('[Email] Failed to send payment success email:', emailErr);
      // Non-fatal — don't block the response
    }

    res.status(200).json({
      message: 'Payment verified successfully!',
      user: updatedUser,
      creditsAdded: planConfig.credits,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/payments/history ────────────────────────────────────────────────
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

    res.status(200).json({ subscriptions });
  } catch (error) {
    next(error);
  }
};
