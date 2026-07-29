import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { checkMongoHealth } from '../services/mongo.service.js';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptimeSeconds: number;
  mongo: { ok: boolean; readyState: number; host: string | null; name: string | null };
}

const VERSION = process.env.npm_package_version ?? '0.0.1';

export const healthPlugin: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  app.get<{ Reply: HealthResponse }>(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              version: { type: 'string' },
              uptimeSeconds: { type: 'number' },
              mongo: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean' },
                  readyState: { type: 'number' },
                  host: { type: ['string', 'null'] },
                  name: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      const mongo = await checkMongoHealth();
      const body: HealthResponse = {
        status: mongo.ok ? 'ok' : 'degraded',
        version: VERSION,
        uptimeSeconds: Math.round(process.uptime()),
        mongo: {
          ok: mongo.ok,
          readyState: mongo.readyState,
          host: mongo.host,
          name: mongo.name,
        },
      };
      reply.code(mongo.ok ? 200 : 503).send(body);
    },
  );
};
