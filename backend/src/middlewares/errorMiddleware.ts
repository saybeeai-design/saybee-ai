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

const isProduction = process.env.NODE_ENV === 'production';

export const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
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
    console.error(`[DB] Schema mismatch detected: ${getDatabaseErrorMessage(err)}`);

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

  console.error(`[Error] ${error.message}`);

  res.json({
    message: statusCode >= 500 && isProduction ? 'Internal Server Error' : error.message,
    stack: isProduction ? null : error.stack ?? null,
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
