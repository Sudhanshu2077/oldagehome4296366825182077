import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';
import {
  AppError,
  InternalError,
  ValidationError,
  toErrorResponse,
  isAppError,
} from '../kernel/errors/app-error.js';
import { getLogger } from '../config/logger.js';

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (req): Promise<void> => {
    const incoming = req.headers['x-request-id'] as string | undefined;
    req.id = incoming && incoming.length > 0 ? incoming : randomUUID();
  });

  app.setErrorHandler((err, req, reply) => {
    const logger = getLogger();
    const requestId = req.id;

    if (isAppError(err)) {
      if (err.statusCode >= 500) {
        logger.error({ err, requestId }, 'application error');
      } else {
        logger.warn({ err, requestId }, 'application error');
      }
      reply.code(err.statusCode).send(toErrorResponse(err, requestId));
      return;
    }

    if (err.validation) {
      const details = (err.validation as unknown[]).map((v) => {
        const inst = v as { instancePath?: string; message?: string; keyword?: string };
        return {
          field: inst.instancePath,
          message: inst.message ?? 'validation failed',
          code: inst.keyword,
        };
      });
      logger.warn({ requestId, details }, 'request validation failed');
      const wrapped = new ValidationError('request validation failed', details);
      reply.code(wrapped.statusCode).send(toErrorResponse(wrapped, requestId));
      return;
    }

    if (err.code === 'FST_ERR_CORS_INVALID_ORIGIN') {
      reply.code(403).send({
        error: 'forbidden',
        message: 'origin not allowed',
        requestId,
      });
      return;
    }

    if (err.statusCode === 429) {
      const rateErr = new (class extends AppError {
        readonly statusCode = 429;
        readonly code = 'rate_limited';
      })('too many requests');
      logger.warn({ requestId }, 'rate limited');
      reply.code(429).send(toErrorResponse(rateErr, requestId));
      return;
    }

    logger.error({ err, requestId }, 'unhandled error');
    const fallback = new InternalError('internal server error');
    reply.code(fallback.statusCode).send(toErrorResponse(fallback, requestId));
  });

  app.setNotFoundHandler((req, reply) => {
    const wrapped = new (class extends AppError {
      readonly statusCode = 404;
      readonly code = 'not_found';
    })(`route ${req.method} ${req.url} not found`);
    reply.code(404).send(toErrorResponse(wrapped, req.id));
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler', fastify: '4.x' });
