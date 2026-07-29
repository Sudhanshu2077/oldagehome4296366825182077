import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import { loadConfig } from '../config/env.js';
import { getLogger } from '../config/logger.js';

async function realtimePlugin(app: FastifyInstance): Promise<void> {
  const cfg = loadConfig();
  const logger = getLogger();

  const io = new Server(app.server, {
    path: '/socket.io',
    cors: { origin: cfg.clientOrigin, credentials: true },
  });

  const registersNs = io.of('/registers');

  registersNs.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      const claims = app.jwt.verify<{ sub: string; tenantId: string | null; role: string }>(token);
      (socket.data as { user?: unknown }).user = claims;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  registersNs.on('connection', (socket) => {
    const claims = socket.data.user as { sub: string; tenantId: string | null; role: string } | undefined;
    if (claims?.tenantId) {
      void socket.join(`tenant:${claims.tenantId}`);
      logger.info({ userId: claims.sub, tenantId: claims.tenantId }, 'socket joined tenant room');
    }
  });

  app.decorate('io', io);

  app.addHook('onClose', async () => {
    await io.close();
  });
}

const plugin: FastifyPluginAsync = realtimePlugin;

export default fp(plugin, { name: 'realtime', fastify: '4.x' });
