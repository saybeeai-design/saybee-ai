import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { hashPassword, comparePassword, generateToken } from '../utils/helpers';
import { sendPasswordReset, sendSignupConfirmation } from '../services/emailService';
import { Prisma, User } from '@prisma/client';

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
  email: true,
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' });
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

    // Send Welcome Email (Non-blocking ideally, but awaited for simplicity here)
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

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
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

// ─── GET /api/auth/google/callback ────────────────────────────────────────────
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

    // Redirect to frontend auth-callback route with the token
    res.redirect(`${frontendUrl}/auth-callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    next(error);
  }
};

export { resolveFrontendUrl };

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: forgotPasswordUserSelect,
    });
    if (!user) {
      // Return 200 anyway to prevent email enumeration
      res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
      return;
    }

    // In a real app, you would create a token in the DB and attach it to the email.
    // For this stub, we just simulate the flow.
    const resetToken = `stub_reset_${Date.now()}`;
    await sendPasswordReset(user.email, resetToken).catch(err => console.error(err));

    res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required' });
      return;
    }

    // Since this is a stub, we won't verify the DB token, but we would hash the new password and update the user.
    // In real app, find user by resetToken. For now, just return success if string > 8.
    if (newPassword.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' });
      return;
    }

    // Stub: We can't update without knowing the user, so we just acknowledge it.
    res.status(200).json({ message: 'Password reset successfully (Stub logic executed)' });
  } catch (error) {
    next(error);
  }
};
