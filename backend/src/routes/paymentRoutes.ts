import { Router, RequestHandler } from 'express';
import { createOrder, verifyPayment, getBillingHistory, webhookPayment } from '../controllers/paymentController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/webhook', webhookPayment as unknown as RequestHandler);

// All remaining payment routes require authentication
router.use(protect as RequestHandler);

// POST /api/payments/create-order  → Razorpay order creation
router.post('/create-order', createOrder as unknown as RequestHandler);

// POST /api/payments/verify  → Signature verification + credit allocation
router.post('/verify', verifyPayment as unknown as RequestHandler);

// GET /api/payments/history  → User's billing history
router.get('/history', getBillingHistory as unknown as RequestHandler);

export default router;
