import { Router, RequestHandler } from 'express';
import { createCoupon, getCoupons, toggleCouponActivity, validateCoupon } from '../controllers/couponController';
import { protect } from '../middlewares/authMiddleware';
import { requireAdmin } from '../middlewares/adminMiddleware';

const router = Router();

// Public validation
router.post('/validate', protect as RequestHandler, validateCoupon as unknown as RequestHandler);

// Admin only routes
router.use(protect as RequestHandler, requireAdmin as RequestHandler);
router.post('/', createCoupon as unknown as RequestHandler);
router.get('/', getCoupons as unknown as RequestHandler);
router.patch('/:id/toggle', toggleCouponActivity as unknown as RequestHandler);

export default router;
