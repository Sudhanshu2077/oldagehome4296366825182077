import mongoose, { type Connection } from 'mongoose';
import { loadConfig } from '../config/env.js';
import { getLogger } from '../config/logger.js';

export interface MongoHealth {
  ok: boolean;
  readyState: number;
  host: string | null;
  name: string | null;
}

let active: Connection | null = null;

export async function connectMongo(): Promise<Connection> {
  if (active && active.readyState === 1) {
    return active;
  }

  const cfg = loadConfig();
  const logger = getLogger();

  try {
    await mongoose.connect(cfg.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });
    active = mongoose.connection;
    active.on('error', (err) => {
      logger.error({ err }, 'mongo connection error');
    });
    active.on('disconnected', () => {
      logger.warn('mongo disconnected');
    });
    active.on('reconnected', () => {
      logger.info('mongo reconnected');
    });
    return active;
  } catch (err) {
    logger.error({ err }, 'mongo initial connection failed');
    throw err;
  }
}

export async function disconnectMongo(): Promise<void> {
  if (active) {
    await mongoose.disconnect();
    active = null;
  }
}

export async function checkMongoHealth(): Promise<MongoHealth> {
  let conn = active ?? mongoose.connection;

  if (readyStateOkay(conn.readyState)) {
    return {
      ok: true,
      readyState: conn.readyState,
      host: conn.host || null,
      name: conn.name || null,
    };
  }

  try {
    conn = await connectMongo();
    await conn.db.admin().ping();
    return {
      ok: true,
      readyState: conn.readyState,
      host: conn.host || null,
      name: conn.name || null,
    };
  } catch {
    return {
      ok: false,
      readyState: conn.readyState,
      host: conn.host || null,
      name: conn.name || null,
    };
  }
}

function readyStateOkay(state: number): boolean {
  return state === 1;
}

export function getActiveConnection(): Connection | null {
  return active;
}
