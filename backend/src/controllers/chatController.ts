import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { aiFailure, generateChatReply, streamChatReply } from '../services/aiService';

export const createChatReply = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const hasMessages = Array.isArray(req.body?.messages);

    if (!message && !hasMessages) {
      res.status(400).json(aiFailure('Message is required', { message: '' }));
      return;
    }

    const result = await generateChatReply({
      language: req.body?.language,
      message,
      messages: req.body?.messages,
      mode: req.body?.mode,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const streamChatReplyController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await streamChatReply(res, {
      language: req.body?.language,
      message: req.body?.message,
      messages: req.body?.messages,
      mode: req.body?.mode,
    });
  } catch (error) {
    next(error);
  }
};
