import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { loadConfig } from '../config/env.js';

async function securityPlugin(app: FastifyInstance): Promise<void> {
  const cfg = loadConfig();

  app.addHook('onRequest', async (req, reply): Promise<void> => {
    void reply.header('X-Content-Type-Options', 'nosniff');
    void reply.header('X-Frame-Options', 'DENY');
    void reply.header('Referrer-Policy', 'no-referrer');
    void reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    if (cfg.nodeEnv === 'production') {
      void reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    }
  });

  app.addHook('preHandler', async (req): Promise<void> => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      const origin = req.headers.origin;
      if (origin && origin !== cfg.clientOrigin) {
        req.log.warn({ origin, expected: cfg.clientOrigin }, 'cross-origin mutation blocked');
      }
    }
  });
}

const plugin: FastifyPluginAsync = securityPlugin;

export default fp(plugin, { name: 'security-headers', fastify: '4.x' });
