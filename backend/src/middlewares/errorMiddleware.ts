import { Request, Response, NextFunction } from 'express';
import {
  isRecoverableDatabaseError,
  markDatabaseUnhealthy,
  reconnectDatabaseInBackground,
} from '../services/dbService';
import {
  getDatabaseErrorMessage,
  isSchemaMismatchDatabaseError,
} from '../utils/databaseErrors';
import { logger } from '../utils/logger';
import { RequestWithContext } from './requestContextMiddleware';

const isProduction = process.env.NODE_ENV === 'production';

export const errorHandler = (err: unknown, req: RequestWithContext, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err as any);
    return;
  }

  if (isRecoverableDatabaseError(err)) {
    markDatabaseUnhealthy(err);
    reconnectDatabaseInBackground('request error');

    res.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database connection was interrupted. Please retry in a few seconds.',
    });
    return;
  }

  if (isSchemaMismatchDatabaseError(err)) {
    markDatabaseUnhealthy(err);
    logger.error('db.schema_mismatch', {
      message: getDatabaseErrorMessage(err),
      requestId: req.requestId,
    });

    res.status(503).json({
      code: 'DATABASE_SCHEMA_MISMATCH',
      message:
        'Database schema is out of date for the current backend release. Apply Prisma schema changes and retry.',
    });
    return;
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const error = err instanceof Error ? err : new Error('Internal Server Error');

  res.status(statusCode);

  logger.error('request.failed', {
    message: error.message,
    requestId: req.requestId,
    stack: isProduction ? undefined : error.stack,
  });

  res.json({
    requestId: req.requestId,
    message: statusCode >= 500 && isProduction ? 'Internal Server Error' : error.message,
    stack: isProduction ? null : error.stack ?? null,
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
