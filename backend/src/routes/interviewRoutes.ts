import { Router, RequestHandler } from 'express';
import { upload } from '../middlewares/uploadMiddleware';
import { transcribeAudio } from '../services/whisperService';
import {
  startInterview,
  getInterview,
  listInterviews,
  finishInterview,
} from '../controllers/interviewController';
import { generateNextQuestion, getInterviewQuestions } from '../controllers/questionController';
import { generateAIQuestion, nextInterviewTurn } from '../controllers/aiController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect as RequestHandler);

// ── Session management ──────────────────────────────────────────────────────
router.post('/start', startInterview as unknown as RequestHandler);           // POST /api/interviews/start
router.get('/', listInterviews as unknown as RequestHandler);                 // GET  /api/interviews
router.get('/:id', getInterview as unknown as RequestHandler);                // GET  /api/interviews/:id
router.post('/:id/finish', finishInterview as unknown as RequestHandler);     // POST /api/interviews/:id/finish

// ── Question flow (placeholder) ─────────────────────────────────────────────
router.post('/:id/question', generateNextQuestion as unknown as RequestHandler);        // POST /api/interviews/:id/question
router.get('/:id/questions', getInterviewQuestions as unknown as RequestHandler);       // GET  /api/interviews/:id/questions

// ── AI-powered endpoints ─────────────────────────────────────────────────────
router.post('/:id/generate-question', generateAIQuestion as unknown as RequestHandler); // POST /api/interviews/:id/generate-question (Gemini)
router.post('/:id/next-turn', nextInterviewTurn as unknown as RequestHandler);          // POST /api/interviews/:id/next-turn (full loop)

// ── Speech-to-Text ───────────────────────────────────────────────────────────
router.post('/speech-to-text', upload.single('audio'), (async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'No audio file provided',
      });
    }

    const filePath = req.file.path;
    const transcript = await transcribeAudio(filePath);

    res.json({
      success: true,
      data: { transcript },
      error: null,
      transcript,
    });
  } catch (error) {
    console.error("Whisper transcription error:", error);
    res.status(503).json({
      success: false,
      data: { transcript: '' },
      error: 'Transcription is temporarily unavailable. Please retry the recording.',
      transcript: '',
    });
  }
}) as RequestHandler);

export default router;
