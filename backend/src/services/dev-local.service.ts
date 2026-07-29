import { MongoMemoryServer } from 'mongodb-memory-server';
import { getLogger } from '../config/logger.js';

let memoryServer: MongoMemoryServer | null = null;

export function isDevLocalMode(): boolean {
  return process.env.DEV_LOCAL_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

export async function startLocalMongoIfEnabled(): Promise<boolean> {
  if (!isDevLocalMode()) return false;

  const logger = getLogger();
  logger.warn('DEV_LOCAL_MODE enabled — starting in-memory MongoDB. NEVER enable this in production.');

  memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'igohms_dev' } });
  const uri = memoryServer.getUri();
  process.env.MONGODB_URI = uri;
  logger.info({ uri }, 'in-memory mongo started');
  return true;
}

export async function stopLocalMongo(): Promise<void> {
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
