import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import TenantService from '../service/tenant.service.js';
import type { CreateInstitutionInput, UpdateInstitutionInput } from '../repository/tenant.repository.js';
import { ok } from '../../../kernel/response/api-response.js';
import { ValidationError } from '../../../kernel/errors/app-error.js';

export class TenantController {
  constructor(private readonly service: TenantService = new TenantService()) {}

  register(app: FastifyInstance): void {
    app.get('/tenants/me', { preHandler: [app.authenticate, app.requireTenantScope] }, this.me.bind(this));
    app.get('/tenants', { preHandler: [app.authenticate, app.requireCrossTenantRead] }, this.listGov.bind(this));
    app.get('/tenants/:id', { preHandler: [app.authenticate, app.requireCrossTenantRead] }, this.getById.bind(this));
    app.post('/tenants', { preHandler: [app.authenticate, app.requireCrossTenantRead] }, this.create.bind(this));
    app.patch('/tenants/:id', { preHandler: [app.authenticate, app.requireCrossTenantRead] }, this.update.bind(this));
  }

  async me(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.getCurrent(req)));
  }

  async listGov(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listGovScoped(req)));
  }

  async getById(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    reply.send(ok(await this.service.getById(id)));
  }

  async create(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = req.body as CreateInstitutionInput | undefined;
    if (!body?.name || !body?.code) {
      throw new ValidationError('name and code are required', [
        { field: 'name', message: 'required' },
        { field: 'code', message: 'required' },
      ]);
    }
    reply.code(201).send(ok(await this.service.create(body)));
  }

  async update(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    reply.send(ok(await this.service.update(id, req.body as UpdateInstitutionInput)));
  }
}

export default TenantController;
