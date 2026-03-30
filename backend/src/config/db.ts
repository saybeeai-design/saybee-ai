import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  getDatabaseErrorMessage,
  isRecoverableDatabaseError,
} from '../utils/databaseErrors';

const PRISMA_QUERY_RETRIES = Number(process.env.DB_QUERY_RETRY_COUNT ?? 1);
const PRISMA_QUERY_RETRY_DELAY_MS = Number(process.env.DB_QUERY_RETRY_DELAY_MS ?? 250);

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaReconnectPromise?: Promise<void>;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeDatabaseUrl = (rawDatabaseUrl?: string): string => {
  if (!rawDatabaseUrl) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  const databaseUrl = new URL(rawDatabaseUrl);

  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
  }

  // Neon is more stable for long-lived deployments when Prisma goes through the pooler.
  if (databaseUrl.hostname.endsWith('neon.tech') && !databaseUrl.hostname.includes('-pooler.')) {
    const hostParts = databaseUrl.hostname.split('.');

    if (hostParts[0]?.startsWith('ep-')) {
      hostParts[0] = `${hostParts[0]}-pooler`;
      databaseUrl.hostname = hostParts.join('.');
    } else {
      console.warn('[DB] DATABASE_URL is not using a Neon pooler hostname.');
    }
  }

  if (databaseUrl.searchParams.get('sslmode') !== 'require') {
    databaseUrl.searchParams.set('sslmode', 'require');
  }

  return databaseUrl.toString();
};

const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
process.env.DATABASE_URL = normalizedDatabaseUrl;

let prisma: PrismaClient;

export const reconnectPrismaClient = async (reason = 'recovery'): Promise<void> => {
  if (globalForPrisma.prismaReconnectPromise) {
    return globalForPrisma.prismaReconnectPromise;
  }

  globalForPrisma.prismaReconnectPromise = (async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect failures while refreshing a broken connection.
    }

    await prisma.$connect();
    console.log(`[DB] Prisma connection refreshed (${reason})`);
  })().finally(() => {
    globalForPrisma.prismaReconnectPromise = undefined;
  });

  return globalForPrisma.prismaReconnectPromise;
};

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: normalizedDatabaseUrl,
      },
    },
    log: [
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });

  client.$use(async (params, next) => {
    let attempt = 0;

    while (true) {
      try {
        return await next(params);
      } catch (error) {
        if (!isRecoverableDatabaseError(error) || attempt >= PRISMA_QUERY_RETRIES) {
          throw error;
        }

        attempt += 1;
        const operationName = `${params.model ?? 'raw'}.${params.action}`;

        console.warn(
          `[DB] Transient database error on ${operationName}. Retrying (${attempt}/${PRISMA_QUERY_RETRIES})...`
        );

        try {
          await reconnectPrismaClient(`query retry: ${operationName}`);
        } catch (reconnectError) {
          console.error(
            `[DB] Query retry reconnect failed for ${operationName}: ${getDatabaseErrorMessage(reconnectError)}`
          );
          throw reconnectError;
        }

        if (PRISMA_QUERY_RETRY_DELAY_MS > 0) {
          await sleep(PRISMA_QUERY_RETRY_DELAY_MS);
        }
      }
    }
  });

  return client;
};

prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

console.log(
  `[DB] Prisma configured with ${
    normalizedDatabaseUrl.includes('-pooler.') ? 'pooled' : 'direct'
  } PostgreSQL connection`
);

export default prisma;
