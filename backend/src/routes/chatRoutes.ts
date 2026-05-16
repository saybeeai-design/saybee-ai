import { Router, RequestHandler } from 'express';
import { createChatReply, streamChatReplyController } from '../controllers/chatController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect as RequestHandler);
router.post('/', createChatReply as unknown as RequestHandler);
router.post('/stream', streamChatReplyController as unknown as RequestHandler);

export default router;
