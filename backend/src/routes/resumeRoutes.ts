import { Router, RequestHandler } from 'express';
import { uploadResume, getResumes, deleteResume } from '../controllers/resumeController';
import { protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

// All resume routes require authentication
router.use(protect as RequestHandler);

// POST /api/resumes/upload
router.post('/upload', upload.single('resume'), uploadResume as unknown as RequestHandler);

// GET /api/resumes
router.get('/', getResumes as unknown as RequestHandler);

// DELETE /api/resumes/:id
router.delete('/:id', deleteResume as unknown as RequestHandler);

export default router;
