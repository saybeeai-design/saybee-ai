import { Router, RequestHandler } from 'express';
import multer from 'multer';
import {
  transcribeAudioFile,
  speakText,
} from '../controllers/aiController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(protect as RequestHandler);

// POST /api/ai/transcribe  — Upload audio file → get text transcript (Whisper)
router.post('/transcribe', audioUpload.single('audio'), transcribeAudioFile as unknown as RequestHandler);

// POST /api/ai/speak       — Text → speech audio (Google TTS / stub)
router.post('/speak', speakText as unknown as RequestHandler);

export default router;
