import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

export type RequestWithContext = Request & { requestId?: string };

export const requestContext = (req: RequestWithContext, res: Response, next: NextFunction): void => {
  const existingId = req.header('x-request-id');
  const requestId = existingId && existingId.trim().length > 0 ? existingId : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};
