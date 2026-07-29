import type { FastifyInstance } from 'fastify';
import notificationService from '../service/notification.service.js';
import { ok } from '../../../kernel/response/api-response.js';
import { ForbiddenError, ValidationError } from '../../../kernel/errors/app-error.js';

export class NotificationController {
  register(app: FastifyInstance): void {
    app.get('/notifications', { preHandler: [app.authenticate] }, async (req, reply) => {
      const su = req.sessionUser;
      if (!su) throw new ForbiddenError();
      const rows = await notificationService.list(su.userId);
      reply.send(ok(rows));
    });

    app.patch<{ Params: { id: string } }>('/notifications/:id/read', { preHandler: [app.authenticate] }, async (req, reply) => {
      const su = req.sessionUser;
      if (!su) throw new ForbiddenError();
      const read = await notificationService.markRead(req.params.id, su.userId);
      reply.send(ok({ read }));
    });

    app.post<{
      Body: {
        userIds?: string[];
        channel?: 'in-app' | 'email' | 'sms' | 'whatsapp' | 'push';
        title: string;
        body?: string;
        data?: Record<string, unknown>;
      };
    }>('/notifications/send', { preHandler: [app.authenticate, app.requirePermission('notification', 'write', '*')] }, async (req, reply) => {
      const su = req.sessionUser;
      if (!su) throw new ForbiddenError();
      const { userIds, channel, title, body, data } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) throw new ValidationError('userIds array required');
      if (!title) throw new ValidationError('title required');
      const tenantId = su.tenantId;
      const results = await Promise.all(
        userIds.map((userId) => notificationService.send({ tenantId, userId, channel, title, body, data })),
      );
      reply.send(ok({ sent: results.length }));
    });
  }
}

export default NotificationController;
