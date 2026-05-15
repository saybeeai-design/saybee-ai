import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { aiFailure, generateChatReply } from '../services/aiService';

export const createChatReply = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      res.status(400).json(aiFailure('Message is required', { message: '' }));
      return;
    }

    const result = await generateChatReply(message);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
