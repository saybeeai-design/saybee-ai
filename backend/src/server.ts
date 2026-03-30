import 'dotenv/config';
import { Server } from 'http';
import app from './app';
import {
  connectToDatabase,
  reconnectDatabaseInBackground,
  shutdownDatabase,
} from './services/dbService';

const PORT = process.env.PORT || 5000;
let server: Server | null = null;

function startServer(): void {
  server = app.listen(PORT, () => {
    console.log(`SayBee AI Backend running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  void connectToDatabase({ reason: 'startup' })
    .then(() => {
      console.log('Database connected via Prisma');
    })
    .catch((error) => {
      console.error('Database startup connection failed. Continuing in degraded mode:', error);
      reconnectDatabaseInBackground('startup recovery');
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

startServer();
