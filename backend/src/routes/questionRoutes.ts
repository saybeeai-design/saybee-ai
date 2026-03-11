import { Router, RequestHandler } from 'express';
import { generateNextQuestion, getInterviewQuestions } from '../controllers/questionController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect as RequestHandler);

// POST   /api/questions/interviews/:id/question  — Generate next question
router.post('/interviews/:id/question', generateNextQuestion as unknown as RequestHandler);

// GET    /api/questions/interviews/:id           — Get all questions
router.get('/interviews/:id', getInterviewQuestions as unknown as RequestHandler);

export default router;
