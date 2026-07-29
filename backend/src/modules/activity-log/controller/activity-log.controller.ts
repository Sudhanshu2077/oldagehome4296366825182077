import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ActivityLogService from '../service/activity-log.service.js';
import { ok } from '../../../kernel/response/api-response.js';

export class ActivityLogController {
  constructor(private readonly service: ActivityLogService = new ActivityLogService()) {}

  register(app: FastifyInstance): void {
    app.get('/activity-logs', { preHandler: [app.authenticate, app.requireTenantRead] }, this.list.bind(this));
  }

  async list(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = req.query as { event?: string; userId?: string };
    const items = await this.service.list(req, { event: query.event, userId: query.userId });
    reply.send(ok(items));
  }
}

export default ActivityLogController;
