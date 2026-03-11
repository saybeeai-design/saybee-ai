import { Router, RequestHandler } from 'express';
import { createCheckoutSession, stripeWebhook, getBillingHistory } from '../controllers/paymentController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Webhook must be public for Stripe to reach it
router.post('/webhook', stripeWebhook as unknown as RequestHandler);

// Protected routes
router.use(protect as RequestHandler);
router.post('/create-checkout-session', createCheckoutSession as unknown as RequestHandler);
router.get('/history', getBillingHistory as unknown as RequestHandler);

export default router;
