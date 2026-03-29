import express, { Application, Request, Response } from 'express';
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middlewares/errorMiddleware';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import resumeRoutes from './routes/resumeRoutes';
import interviewRoutes from './routes/interviewRoutes';
import answerRoutes from './routes/answerRoutes';
import aiRoutes from './routes/aiRoutes';
import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';
import couponRoutes from './routes/couponRoutes';
import passport from './config/passport';

dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'SMTP_USER',
  'SMTP_PASS'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app: Application = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// ─── Security Enhancements ────────────────────────────────────────────────────
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP to 150 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 AI requests per window
  message: 'Too many AI requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Welcome Root ─────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('SayBee AI Backend is running! Access the API at /api/health');
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'SayBee AI Backend is running ✅',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);            // Auth (public)
app.use('/api/users', userRoutes);           // User profile
app.use('/api/resumes', resumeRoutes);       // Resume upload/management
app.use('/api/interviews', aiLimiter, interviewRoutes); // Interview sessions + questions + AI
app.use('/api/questions', aiLimiter, answerRoutes);     // Answer submission + AI evaluation
app.use('/api/ai', aiLimiter, aiRoutes);               // STT + TTS utilities
app.use('/api/admin', adminRoutes);         // Admin dashboard endpoints
app.use('/api/payments', paymentRoutes);    // Stripe Subscriptions
app.use('/api/coupons', couponRoutes);      // Promotional Coupons

// ─── Error Handling ───────────────────────────────────────────────────────────
Sentry.setupExpressErrorHandler(app);
app.use(notFound);
app.use(errorHandler);

export default app;
