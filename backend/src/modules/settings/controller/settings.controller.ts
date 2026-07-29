import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import SettingsService from '../service/settings.service.js';
import type { UpsertSettingInput } from '../repository/settings.repository.js';
import { ok } from '../../../kernel/response/api-response.js';

export class SettingsController {
  constructor(private readonly service: SettingsService = new SettingsService()) {}

  register(app: FastifyInstance): void {
    app.get('/settings', { preHandler: [app.authenticate, app.requireTenantRead] }, this.list.bind(this));
    app.put('/settings', { preHandler: [app.authenticate] }, this.upsert.bind(this));
    app.delete('/settings', { preHandler: [app.authenticate] }, this.remove.bind(this));
  }

  async list(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = req.query as { scope?: string; group?: string };
    const items = await this.service.list(req, { scope: query.scope, group: query.group });
    reply.send(ok(items));
  }

  async upsert(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const item = await this.service.upsert(req, req.body as UpsertSettingInput);
    reply.send(ok(item));
  }

  async remove(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = req.query as { scope: string; group: string; key: string };
    await this.service.delete(req, query.scope, query.group, query.key);
    reply.code(204).send();
  }
}

export default SettingsController;
