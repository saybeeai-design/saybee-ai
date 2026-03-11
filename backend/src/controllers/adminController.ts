import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

// ─── GET /api/admin/metrics ─────────────────────────────────────────────────
export const getSystemMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const totalInterviews = await prisma.interview.count();
    const totalResumes = await prisma.resume.count();
    
    // AI Usage Stats
    const totalQuestions = await prisma.question.count();
    const totalTranscripts = await prisma.transcript.count();

    const metrics = {
      users: totalUsers,
      interviews: totalInterviews,
      resumes: totalResumes,
      aiUsage: {
        generatedQuestions: totalQuestions,
        processedTranscripts: totalTranscripts
      }
    };

    res.status(200).json(metrics);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/users ───────────────────────────────────────────────────
export const getPlatformUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Basic pagination could be added here
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credits: true,
        // @ts-ignore
        isPaid: true,
        createdAt: true,
        _count: {
          select: { interviews: true, resumes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/interviews ──────────────────────────────────────────────
export const getPlatformInterviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const interviews = await prisma.interview.findMany({
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent 50 for admin dashboard preview
    });

    res.status(200).json({ interviews });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/users/:id/mark-paid ──────────────────────────────────────
export const markPaid = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.update({
      where: { id },
      // @ts-ignore
      data: { isPaid: true }
    });
    res.status(200).json({ message: 'User marked as paid', user });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/users/:id/add-credits ────────────────────────────────────
export const addCredits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { amount } = req.body;
    const user = await prisma.user.update({
      where: { id },
      // Use parsed amount or fallback
      data: { credits: { increment: amount ? Number(amount) : 0 } }
    });
    res.status(200).json({ message: 'Credits added successfully', user });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/users/:id/ban ────────────────────────────────────────────
export const banUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.update({
      where: { id },
      data: { role: 'BANNED' }
    });
    res.status(200).json({ message: 'User banned successfully', user });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
