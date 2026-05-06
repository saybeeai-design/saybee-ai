import { Router } from 'express';
import passport from 'passport';
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  googleAuthCallback,
  resolveFrontendUrl,
} from '../controllers/authController';
import {
  getDatabaseErrorMessage,
  isSchemaMismatchDatabaseError,
} from '../utils/databaseErrors';

const router = Router();

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (error, user) => {
      const frontendUrl = resolveFrontendUrl();

      if (error) {
        const message = getDatabaseErrorMessage(error);

        if (isSchemaMismatchDatabaseError(error)) {
          console.error(
            `[Auth] Google OAuth callback blocked by database schema mismatch: ${message}. Render must run "npx prisma db push" against the production database.`
          );
        } else {
          console.error(`[Auth] Google OAuth callback failed: ${message}`);
        }

        res.redirect(`${frontendUrl}/auth-callback?error=Google_Auth_Failed`);
        return;
      }

      if (!user) {
        res.redirect(`${frontendUrl}/auth-callback?error=Google_Auth_Failed`);
        return;
      }

      req.user = user;
      next();
    })(req, res, next);
  },
  googleAuthCallback
);

export default router;
