import { Router, RequestHandler } from 'express';
import { getProfile, updateProfile } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// All user routes require authentication
router.use(protect as RequestHandler);

// GET /api/users/profile
router.get('/profile', getProfile as unknown as RequestHandler);

// PUT /api/users/profile
router.put('/profile', updateProfile as unknown as RequestHandler);

export default router;
