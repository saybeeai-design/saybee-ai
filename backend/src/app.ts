import 'dotenv/config';
import './config/env';
import express, { Application, NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from './config/passport';
import { errorHandler, notFound } from './middlewares/errorMiddleware';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';
import answerRoutes from './routes/answerRoutes';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import couponRoutes from './routes/couponRoutes';
import interviewRoutes from './routes/interviewRoutes';
import paymentRoutes from './routes/paymentRoutes';
import resumeRoutes from './routes/resumeRoutes';
import userRoutes from './routes/userRoutes';
import { ensureDatabaseConnection, getDatabaseStatus } from './services/dbService';
import { requestContext, RequestWithContext } from './middlewares/requestContextMiddleware';
import { logger } from './utils/logger';

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
});

const app: Application = express();

// Render forwards the client IP through a proxy, so trust the first hop.
app.set('trust proxy', 1);

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(requestContext);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(helmet());
app.use((req: RequestWithContext, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request.completed', {
      durationMs: Date.now() - start,
      method: req.method,
      path: req.originalUrl,
      requestId: req.requestId,
      statusCode: res.statusCode,
    });
  });
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});
app.use('/api', limiter);

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many AI requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('SayBee AI Backend is running! Access the API at /api/health');
});

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await ensureDatabaseConnection();
  } catch {
    // Keep the process healthy and surface the DB state in the payload instead.
  }

  const databaseStatus = getDatabaseStatus();

  res.status(200).json({
    status: databaseStatus.connected ? 'ok' : 'degraded',
    database: databaseStatus.connected ? 'connected' : 'disconnected',
    details: databaseStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

const databaseRequiredApiPrefixes = [
  '/admin',
  '/auth',
  '/coupons',
  '/interviews',
  '/payments',
  '/questions',
  '/resumes',
  '/users',
];

const requiresDatabaseConnection = (path: string): boolean =>
  databaseRequiredApiPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

app.use('/api', async (req: Request, _res: Response, next: NextFunction) => {
  if (req.path === '/health') {
    next();
    return;
  }

  if (!requiresDatabaseConnection(req.path)) {
    next();
    return;
  }

  try {
    await ensureDatabaseConnection();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/chat', aiLimiter, chatRoutes);
app.use('/api/interviews', aiLimiter, interviewRoutes);
app.use('/api/questions', aiLimiter, answerRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);

Sentry.setupExpressErrorHandler(app);
app.use(notFound);
app.use(errorHandler);

export default app;
