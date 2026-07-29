import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import AuditLogService from '../service/audit-log.service.js';
import { ok } from '../../../kernel/response/api-response.js';

export class AuditLogController {
  constructor(private readonly service: AuditLogService = new AuditLogService()) {}

  register(app: FastifyInstance): void {
    app.get('/audit-logs', { preHandler: [app.authenticate, app.requireTenantRead] }, this.list.bind(this));
  }

  async list(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = req.query as { entity?: string; action?: string; userId?: string };
    const items = await this.service.list(req, {
      entity: query.entity,
      action: query.action,
      userId: query.userId,
    });
    reply.send(ok(items));
  }
}

export default AuditLogController;
