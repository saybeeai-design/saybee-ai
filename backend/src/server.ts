import 'dotenv/config';
import { Server } from 'http';
import app from './app';
import {
  connectToDatabase,
  getDatabaseStatus,
  reconnectDatabaseInBackground,
  shutdownDatabase,
} from './services/dbService';
import { getDatabaseErrorMessage } from './utils/databaseErrors';

const PORT = process.env.PORT || 5000;
let server: Server | null = null;

const logDatabaseStartupStatus = (): void => {
  const status = getDatabaseStatus();
  const lastError = status.lastError?.message ? ` | lastError=${status.lastError.message}` : '';

  console.log(`[DB] Startup status: state=${status.state}, connected=${status.connected}${lastError}`);
};

async function startServer(): Promise<void> {
  console.log('[Server] Starting SayBee AI backend...');

  try {
    console.log('[DB] Verifying Prisma connection before accepting traffic...');
    await connectToDatabase({ reason: 'startup' });
    console.log('Database connected via Prisma');
  } catch (error) {
    console.error(
      `[DB] Startup connection failed. Continuing in degraded mode: ${getDatabaseErrorMessage(error)}`
    );
    reconnectDatabaseInBackground('startup recovery');
  }

  logDatabaseStartupStatus();

  server = app.listen(PORT, () => {
    console.log(`SayBee AI Backend running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

const shutdownServer = async (signal: string): Promise<void> => {
  console.log(`[Server] Received ${signal}. Shutting down gracefully...`);

  if (!server) {
    await shutdownDatabase();
    process.exit(0);
    return;
  }

  server.close(async () => {
    await shutdownDatabase();
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => {
  void shutdownServer('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdownServer('SIGTERM');
});

void startServer().catch((error) => {
  console.error(`[Server] Failed to start: ${getDatabaseErrorMessage(error)}`);
  process.exit(1);
});
