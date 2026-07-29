import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { loadConfig } from './env.js';
import { getLogger } from './logger.js';
import { initFirebaseAdmin } from '../services/firebase.service.js';
import { setStorageDriver } from '../services/storage.service.js';
import { createLocalFsDriver } from '../services/storage-local.driver.js';
import { setSessionUserStore } from '../modules/user/service/session-store-bridge.js';
import errorHandlerPlugin from '../plugins/error-handler.plugin.js';
import securityPlugin from '../plugins/security.plugin.js';
import authPlugin from '../plugins/auth.plugin.js';
import tenantScopePlugin from '../plugins/tenant.plugin.js';
import { healthPlugin } from '../plugins/health.plugin.js';
import auditHookPlugin from '../plugins/audit-hook.plugin.js';
import realtimePlugin from '../plugins/realtime.plugin.js';
import swaggerPlugin from '../plugins/swagger.plugin.js';
import registerModules from '../modules/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const cfg = loadConfig();
  const logger = getLogger();

  const app = Fastify({
    logger: logger as FastifyBaseLogger,
    disableRequestLogging: cfg.nodeEnv !== 'production',
    ajv: { customOptions: { removeAdditional: true, useDefaults: true, coerceTypes: true } },
    trustProxy: cfg.nodeEnv === 'production',
    genReqId: () => randomUUID(),
  });

  await app.register(helmet, {
    contentSecurityPolicy: cfg.nodeEnv === 'production',
    hsts: cfg.nodeEnv === 'production',
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: cfg.rateLimitMax,
    timeWindow: `${cfg.rateLimitWindowMinutes} minute`,
    global: true,
    allowList: ['127.0.0.1', ...(cfg.nodeEnv === 'test' ? (['::1'] as string[]) : [])],
  });

  await app.register(jwt, { secret: cfg.sessionSigningKey || 'dev-only-insecure-secret-change-me' });

  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024, files: 1 } });

  initFirebaseAdmin();

  const storageRoot = process.env.STORAGE_LOCAL_ROOT ?? resolve(process.cwd(), '.storage');
  setStorageDriver(createLocalFsDriver({ rootDir: storageRoot }));

  await app.register(errorHandlerPlugin);
  await app.register(securityPlugin);
  await app.register(authPlugin);
  await app.register(tenantScopePlugin);
  await app.register(auditHookPlugin);
  await app.register(realtimePlugin);
  await app.register(swaggerPlugin);

  setSessionUserStore(app);

  await app.register(healthPlugin, { prefix: '' });
  await registerModules(app);

  return app;
}
