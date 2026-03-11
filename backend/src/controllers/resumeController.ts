import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { uploadFileToCloud } from '../services/storageService';
// ─── POST /api/resumes/upload ─────────────────────────────────────────────────
export const uploadResume = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded. Please upload a PDF file.' });
      return;
    }

    const fileName = req.file.originalname;
    
    // Upload buffer to cloud storage
    const fileUrl = await uploadFileToCloud(req.file.buffer, req.file.originalname, req.file.mimetype);

    const resume = await prisma.resume.create({
      data: {
        userId,
        fileName,
        fileUrl,
        // parsedData will be populated by the resume-parsing service (future step)
      },
    });

    res.status(201).json({
      message: 'Resume uploaded successfully',
      resume,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/resumes ────────────────────────────────────────────────────────
export const getResumes = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ resumes });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/resumes/:id ─────────────────────────────────────────────────
export const deleteResume = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;

    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) {
      res.status(404).json({ message: 'Resume not found' });
      return;
    }

    await prisma.resume.delete({ where: { id: id as string } });

    res.status(200).json({ message: 'Resume deleted successfully' });
  } catch (error) {
    next(error);
  }
};
