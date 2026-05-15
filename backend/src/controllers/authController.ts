import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { hashPassword, comparePassword, generateToken } from '../utils/helpers';
import { sendPasswordReset, sendSignupConfirmation } from '../services/emailService';
import { Prisma, User } from '@prisma/client';
import { assertNonEmptyString, isValidEmail, isValidPassword, sanitizeName } from '../utils/validation';

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

const resolveFrontendUrl = (): string => {
  const configuredFrontendUrl = process.env.FRONTEND_URL?.trim();
  const firstCorsOrigin = process.env.CORS_ORIGIN?.split(',')[0]?.trim();
  const candidates = [configuredFrontendUrl, firstCorsOrigin, 'http://localhost:3000'].filter(
    (value): value is string => Boolean(value)
  );

  const isLocalUrl = (value: string): boolean =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);

  const preferredUrl =
    process.env.NODE_ENV === 'production'
      ? candidates.find((value) => !isLocalUrl(value)) || candidates[0]
      : candidates[0];

  return preferredUrl.replace(/\/+$/, '');
};

const issueAuthCookie = (res: Response, token: string): void => {
  res.cookie('sb_access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const signupLookupSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
});

const loginUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  password: true,
  role: true,
  createdAt: true,
});

const forgotPasswordUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
});

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const name = sanitizeName(req.body?.name);

    if (!isValidEmail(email) || !isValidPassword(password)) {
      res.status(400).json({ message: 'A valid email and a password with at least 8 characters are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: signupLookupSelect,
    });
    if (existingUser) {
      res.status(409).json({ message: 'A user with this email already exists' });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    issueAuthCookie(res, token);

    await sendSignupConfirmation(user.email, user.name || 'User').catch((err) => console.error('Email error:', err));

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isValidEmail(email) || !assertNonEmptyString(password)) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: loginUserSelect,
    });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = user.password ? await comparePassword(password, user.password) : false;
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    issueAuthCookie(res, token);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuthCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const frontendUrl = resolveFrontendUrl();
    const user = req.user as Pick<User, 'id' | 'email' | 'role'> | undefined;
    if (!user) {
      res.redirect(`${frontendUrl}/auth-callback?error=Google_Auth_Failed`);
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    issueAuthCookie(res, token);
    res.redirect(`${frontendUrl}/auth-callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    next(error);
  }
};

export { resolveFrontendUrl };

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) {
      res.status(400).json({ message: 'A valid email is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: forgotPasswordUserSelect,
    });

    if (!user) {
      res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    await sendPasswordReset(user.email, rawToken);

    res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!assertNonEmptyString(token) || !isValidPassword(newPassword)) {
      res.status(400).json({ message: 'Token and a valid password are required' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      res.status(400).json({ message: 'Reset token is invalid or expired' });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};
