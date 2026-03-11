import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { hashPassword } from '../utils/helpers';

// ─── GET /api/users/profile ───────────────────────────────────────────────────
export const getProfile = async (
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credits: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { resumes: true, interviews: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/users/profile ───────────────────────────────────────────────────
export const updateProfile = async (
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

    const { name, password } = req.body;

    const updateData: { name?: string; password?: string } = {};
    if (name) updateData.name = name;
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ message: 'Password must be at least 8 characters' });
        return;
      }
      updateData.password = await hashPassword(password);
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: 'No valid fields to update' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, updatedAt: true },
    });

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    next(error);
  }
};
