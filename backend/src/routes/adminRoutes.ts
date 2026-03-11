import { Router, RequestHandler } from 'express';
import { 
  getSystemMetrics, 
  getPlatformUsers, 
  getPlatformInterviews,
  markPaid,
  addCredits,
  banUser,
  deleteUser
} from '../controllers/adminController';
import { protect } from '../middlewares/authMiddleware';
import { requireAdmin } from '../middlewares/adminMiddleware';

const router = Router();

// Protect all admin routes
router.use(protect as RequestHandler, requireAdmin as RequestHandler);

// We keep /metrics as an alias or replace it with /analytics if exactly matched
router.get('/analytics', getSystemMetrics as unknown as RequestHandler);
router.get('/metrics', getSystemMetrics as unknown as RequestHandler);
router.get('/users', getPlatformUsers as unknown as RequestHandler);
router.get('/interviews', getPlatformInterviews as unknown as RequestHandler);

router.post('/users/:id/mark-paid', markPaid as unknown as RequestHandler);
router.post('/users/:id/add-credits', addCredits as unknown as RequestHandler);
router.post('/users/:id/ban', banUser as unknown as RequestHandler);
router.delete('/users/:id', deleteUser as unknown as RequestHandler);

export default router;
