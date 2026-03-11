import { Router, RequestHandler } from 'express';
import { submitAnswer, getAnswer } from '../controllers/answerController';
import { evaluateQuestionAnswer } from '../controllers/aiController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect as RequestHandler);

// POST  /api/questions/:id/answer    — Submit answer
router.post('/:id/answer', submitAnswer as unknown as RequestHandler);

// GET   /api/questions/:id/answer    — Get answer
router.get('/:id/answer', getAnswer as unknown as RequestHandler);

// POST  /api/questions/:id/evaluate  — AI evaluate an existing answer (Gemini)
router.post('/:id/evaluate', evaluateQuestionAnswer as unknown as RequestHandler);

export default router;
