import prisma, { reconnectPrismaClient } from '../config/db';
import {
  createDatabaseErrorInfo,
  DatabaseErrorInfo,
  getDatabaseErrorMessage,
  isRecoverableDatabaseError,
} from '../utils/databaseErrors';
import { ensureDatabaseSchemaCompatibility } from './schemaCompatibilityService';

type DatabaseState = 'idle' | 'connecting' | 'ready' | 'degraded' | 'shutting_down';

type ConnectOptions = {
  force?: boolean;
  reason?: string;
  retries?: number;
  retryDelayMs?: number;
};

const STARTUP_RETRIES = Number(process.env.DB_CONNECT_MAX_RETRIES ?? 5);
const STARTUP_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 5000);
const REQUEST_RETRIES = Number(process.env.DB_REQUEST_RECONNECT_RETRIES ?? 2);
const REQUEST_RETRY_DELAY_MS = Number(process.env.DB_REQUEST_RECONNECT_DELAY_MS ?? 1000);
const HEALTH_CHECK_INTERVAL_MS = Number(process.env.DB_HEALTH_CHECK_INTERVAL_MS ?? 30000);

let databaseState: DatabaseState = 'idle';
let lastDatabaseError: DatabaseErrorInfo | null = null;
let lastSuccessfulCheckAt: number | null = null;
let reconnectPromise: Promise<void> | null = null;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const setDatabaseReady = (): void => {
  databaseState = 'ready';
  lastSuccessfulCheckAt = Date.now();
  lastDatabaseError = null;
};

export { isRecoverableDatabaseError };

export const markDatabaseUnhealthy = (error: unknown): void => {
  if (databaseState !== 'shutting_down') {
    databaseState = 'degraded';
  }

  lastDatabaseError = createDatabaseErrorInfo(error);
};

const pingDatabase = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
  setDatabaseReady();
};

export const connectToDatabase = async (options: ConnectOptions = {}): Promise<void> => {
  const {
    force = false,
    reason = 'startup',
    retries = STARTUP_RETRIES,
    retryDelayMs = STARTUP_RETRY_DELAY_MS,
  } = options;

  if (databaseState === 'ready' && !force) {
    return;
  }

  if (databaseState === 'shutting_down') {
    return;
  }

  if (reconnectPromise) {
    return reconnectPromise;
  }

  reconnectPromise = (async () => {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= retries) {
      attempt += 1;
      databaseState = 'connecting';

      try {
        await reconnectPrismaClient(reason);
        await pingDatabase();
        await ensureDatabaseSchemaCompatibility(reason);
        console.log(`[DB] Connection ready (${reason})`);
        return;
      } catch (error) {
        lastError = error;
        markDatabaseUnhealthy(error);

        if (attempt > retries) {
          break;
        }

        console.warn(
          `[DB] Connection attempt ${attempt}/${retries + 1} failed (${reason}). Retrying in ${retryDelayMs}ms.`
        );
        await sleep(retryDelayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(getDatabaseErrorMessage(lastError));
  })().finally(() => {
    reconnectPromise = null;
  });

  return reconnectPromise;
};

export const reconnectDatabaseInBackground = (reason = 'recovery'): void => {
  if (databaseState === 'shutting_down') {
    return;
  }

  void connectToDatabase({
    force: true,
    reason,
    retries: REQUEST_RETRIES,
    retryDelayMs: REQUEST_RETRY_DELAY_MS,
  }).catch((error) => {
    console.error(`[DB] Background reconnect failed: ${getDatabaseErrorMessage(error)}`);
  });
};

export const ensureDatabaseConnection = async (): Promise<void> => {
  if (databaseState !== 'ready') {
    await connectToDatabase({
      force: true,
      reason: 'request reconnect',
      retries: REQUEST_RETRIES,
      retryDelayMs: REQUEST_RETRY_DELAY_MS,
    });
    return;
  }

  const shouldPing =
    lastSuccessfulCheckAt === null || Date.now() - lastSuccessfulCheckAt >= HEALTH_CHECK_INTERVAL_MS;

  if (!shouldPing) {
    return;
  }

  try {
    await pingDatabase();
  } catch (error) {
    markDatabaseUnhealthy(error);
    await connectToDatabase({
      force: true,
      reason: 'health check reconnect',
      retries: REQUEST_RETRIES,
      retryDelayMs: REQUEST_RETRY_DELAY_MS,
    });
  }
};

export const getDatabaseStatus = () => ({
  connected: databaseState === 'ready',
  lastError: lastDatabaseError,
  lastSuccessfulCheckAt: lastSuccessfulCheckAt ? new Date(lastSuccessfulCheckAt).toISOString() : null,
  state: databaseState,
});

export const shutdownDatabase = async (): Promise<void> => {
  databaseState = 'shutting_down';
  reconnectPromise = null;
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect failures during shutdown.
  }
};
