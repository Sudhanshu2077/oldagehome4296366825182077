import { pathToFileURL } from 'node:url';
import { buildApp } from './config/app.js';
import { loadConfig } from './config/env.js';
import { getLogger, resetLoggerForTests } from './config/logger.js';
import { connectMongo, disconnectMongo } from './services/mongo.service.js';
import { startLocalMongoIfEnabled, stopLocalMongo, isDevLocalMode } from './services/dev-local.service.js';
import { runRbacSeed } from '../scripts/run-rbac-seed.js';

export async function startServer(): Promise<void> {
  const devLocal = await startLocalMongoIfEnabled();

  const cfg = loadConfig();
  const logger = getLogger();

  await connectMongo();
  logger.info({ uri: cfg.mongoUri.replace(/.*@/, '***@') }, 'mongo connected');

  if (devLocal) {
    await runRbacSeed();
    logger.warn('DEV_LOCAL_MODE active — RBAC seeded into in-memory MongoDB');
  }

  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutdown initiated');
    await app.close();
    await disconnectMongo();
    await stopLocalMongo();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: cfg.port, host: '0.0.0.0' });
    logger.info({ port: cfg.port, env: cfg.nodeEnv, devLocalMode: isDevLocalMode() }, 'server listening');
  } catch (err) {
    logger.error({ err }, 'server failed to start');
    await disconnectMongo();
    await stopLocalMongo();
    process.exit(1);
  }
}

const invokedAsMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (invokedAsMain) {
  void startServer();
}

export { resetLoggerForTests };
