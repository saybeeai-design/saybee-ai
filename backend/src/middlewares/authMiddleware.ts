import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/helpers';

// Extend the Express Request type to include the user
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey || rest.length === 0) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

export const protect = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies.sb_access_token;

  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = headerToken || cookieToken;

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token is invalid or expired' });
  }
};
