import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { loadConfig } from '../config/env.js';

async function swaggerPlugin(app: FastifyInstance): Promise<void> {
  const cfg = loadConfig();

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'IGOHMS API',
        description: 'Maharashtra Integrated Old Age Home Management System — REST API',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${cfg.port}`, description: 'local' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
}

const plugin: FastifyPluginAsync = swaggerPlugin;

export default fp(plugin, { name: 'swagger', fastify: '4.x' });
