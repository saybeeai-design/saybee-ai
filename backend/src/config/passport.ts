import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Prisma } from '@prisma/client';
import prisma from './db';
import dotenv from 'dotenv';
import {
  getDatabaseErrorMessage,
  isSchemaMismatchDatabaseError,
} from '../utils/databaseErrors';

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// In production, callbackURL should be an absolute URL like https://api.saybeeai.com/api/auth/google/callback
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !callbackURL) {
  throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL must be configured');
}

const googleAuthUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
});

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      let authContext = `googleId=${profile.id}`;

      try {
        const email = profile.emails?.[0].value;
        if (!email) {
          return done(new Error('No email found from Google profile'), false as any);
        }

        authContext = `email=${email}, googleId=${profile.id}`;

        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
          select: googleAuthUserSelect,
        });

        if (user) {
          return done(null, user);
        }

        user = await prisma.user.findUnique({
          where: { email },
          select: googleAuthUserSelect,
        });

        if (user) {
          user = await prisma.user.update({
            where: { email },
            data: {
              googleId: profile.id,
              provider: 'GOOGLE',
            },
            select: googleAuthUserSelect,
          });
          return done(null, user);
        }

        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName || email.split('@')[0],
            googleId: profile.id,
            provider: 'GOOGLE',
          },
          select: googleAuthUserSelect,
        });

        return done(null, user);
      } catch (error) {
        const message = getDatabaseErrorMessage(error);

        if (isSchemaMismatchDatabaseError(error)) {
          console.error(
            `[Auth] Google OAuth database schema mismatch (${authContext}): ${message}. Apply the latest Prisma schema to the production database.`
          );
        } else {
          console.error(`[Auth] Google OAuth user sync failed (${authContext}): ${message}`);
        }

        return done(error as Error, false as any);
      }
    }
  )
);

export default passport;
