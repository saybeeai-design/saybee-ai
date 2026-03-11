import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import prisma from '../config/db';

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. Admin access required.' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
