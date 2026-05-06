import { Router, RequestHandler } from 'express';
import multer from 'multer';
import {
  transcribeAudioFile,
  speakText,
  uploadChatFile,
} from '../controllers/aiController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const fileUpload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, and DOC files are allowed'));
    }
  }
});

router.use(protect as RequestHandler);

// POST /api/ai/transcribe  — Upload audio file → get text transcript (Whisper)
router.post('/transcribe', audioUpload.single('audio'), transcribeAudioFile as unknown as RequestHandler);

// POST /api/ai/speak       — Text → speech audio (Google TTS / stub)
router.post('/speak', speakText as unknown as RequestHandler);

// POST /api/ai/upload      — Upload files for chat
router.post('/upload', fileUpload.single('file'), uploadChatFile as unknown as RequestHandler);

export default router;
