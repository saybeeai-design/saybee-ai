import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_stub', {
  apiVersion: '2025-02-24.acacia' as any, // Using generic typing for resilience
});

const isStubMode = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('stub');

// ─── POST /api/payments/create-checkout-session ──────────────────────────────
export const createCheckoutSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { planId } = req.body; // e.g. 'PRO' or 'ENTERPRISE'
    
    // In a real app, map planId to Stripe Price ID
    const priceId = planId === 'PRO' ? 'price_pro_stub' : 'price_enterprise_stub';

    if (isStubMode) {
      // Return a simulated URL that immediately triggers a success fallback
      res.status(200).json({ url: `/dashboard/billing/success?session_id=stub_session_${Date.now()}` });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
      client_reference_id: userId,
      metadata: { userId, planId }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/payments/webhook ─────────────────────────────────────────────
// Note: Webhook needs to be parsed using express.raw() in app.ts before reaching here if verifying signatures.
export const stripeWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let event;

    if (isStubMode) {
      // Just simulate webhook logic
      event = req.body;
      if (!event.type) event.type = 'checkout.session.completed';
    } else {
      const sig = req.headers['stripe-signature'] as string;
      try {
        event = stripe.webhooks.constructEvent(
          req.body, // In real scenario req.body needs to be Buffer
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err: any) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.userId;
      const planId = session.metadata?.planId || 'PRO';

      if (userId) {
        // Upgrade User
        await prisma.user.update({
          where: { id: userId },
          data: { 
            stripeCustomerId: session.customer as string,
            credits: { increment: planId === 'PRO' ? 10 : 50 } // Allocate credits
          }
        });

        // Upsert Subscription
        await prisma.subscription.create({
          data: {
            userId,
            plan: planId,
            status: 'ACTIVE',
            stripeSubscriptionId: session.subscription as string,
          }
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/payments/history ─────────────────────────────────────────────
export const getBillingHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' }
    });

    res.status(200).json({ subscriptions });
  } catch (error) {
    next(error);
  }
};
