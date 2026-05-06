const RECOVERABLE_DATABASE_CODES = new Set([
  '57P01',
  '57P02',
  '57P03',
  'P1001',
  'P1002',
  'P1017',
]);

const SCHEMA_MISMATCH_DATABASE_CODES = new Set(['P2022']);

const RECOVERABLE_DATABASE_MESSAGES = [
  'terminating connection due to administrator command',
  'server has closed the connection',
  'connection has been closed',
  'connection closed',
  'error in postgresql connection',
  "can't reach database server",
  'the database server closed the connection',
  'connection terminated unexpectedly',
];

const SCHEMA_MISMATCH_DATABASE_MESSAGES = [
  'does not exist in the current database',
  'database schema',
];

export type DatabaseErrorInfo = {
  at: string;
  code?: string;
  message: string;
};

export const getDatabaseErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Unknown database error');
  }

  return String(error ?? 'Unknown database error');
};

export const getDatabaseErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const directCode = (error as { code?: unknown }).code;
  if (typeof directCode === 'string') {
    return directCode;
  }

  const cause = (error as { cause?: unknown }).cause;
  if (typeof cause === 'object' && cause !== null) {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === 'string') {
      return causeCode;
    }
  }

  return undefined;
};

const getDatabaseErrorText = (error: unknown): string =>
  `${getDatabaseErrorCode(error) ?? ''} ${getDatabaseErrorMessage(error)}`.toLowerCase();

export const isRecoverableDatabaseError = (error: unknown): boolean => {
  const code = getDatabaseErrorCode(error);
  if (code && RECOVERABLE_DATABASE_CODES.has(code.toUpperCase())) {
    return true;
  }

  const errorText = getDatabaseErrorText(error);

  return RECOVERABLE_DATABASE_MESSAGES.some((token) => errorText.includes(token));
};

export const isSchemaMismatchDatabaseError = (error: unknown): boolean => {
  const code = getDatabaseErrorCode(error);
  if (code && SCHEMA_MISMATCH_DATABASE_CODES.has(code.toUpperCase())) {
    return true;
  }

  const errorText = getDatabaseErrorText(error);

  return SCHEMA_MISMATCH_DATABASE_MESSAGES.some((token) => errorText.includes(token));
};

export const createDatabaseErrorInfo = (error: unknown): DatabaseErrorInfo => ({
  at: new Date().toISOString(),
  code: getDatabaseErrorCode(error),
  message: getDatabaseErrorMessage(error),
});
