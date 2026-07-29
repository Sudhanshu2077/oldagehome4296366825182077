import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getDashboardProvider } from '../service/dashboard.service.js';
import { ok } from '../../../kernel/response/api-response.js';

export class DashboardController {
  register(app: FastifyInstance): void {
    app.get('/dashboard', { preHandler: [app.authenticate] }, this.get.bind(this));
  }

  async get(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const payload = await getDashboardProvider().build(req);
    reply.send(ok(payload));
  }
}

export default DashboardController;
