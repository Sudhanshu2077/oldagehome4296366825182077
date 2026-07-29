import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import RegisterService from '../service/register.service.js';
import { ok, okPaginated } from '../../../kernel/response/api-response.js';
import { ValidationError } from '../../../kernel/errors/app-error.js';

export class RegisterController {
  constructor(private readonly service: RegisterService = new RegisterService()) {}

  register(app: FastifyInstance): void {
    const auth = [app.authenticate, app.requireTenantRead];

    app.get('/registers', { preHandler: auth }, async (req, reply) => {
      reply.send(ok(await this.service.listRegisters(req)));
    });

    app.get<{ Params: { register: string }; Querystring: Record<string, unknown> }>(
      '/registers/:register/entries',
      { preHandler: auth },
      async (req, reply) => {
        const result = await this.service.listEntries(req, req.params.register, req.query);
        reply.send(okPaginated(result));
      },
    );

    app.post<{ Params: { register: string }; Body: { fields?: Record<string, unknown> } }>(
      '/registers/:register/entries',
      { preHandler: [app.authenticate, app.requireTenantScope] },
      async (req, reply) => {
        if (!req.body?.fields) throw new ValidationError('fields required');
        const entry = await this.service.createEntry(app, req, req.params.register, req.body.fields);
        reply.code(201).send(ok(entry));
      },
    );

    app.put<{ Params: { id: string }; Body: { fields?: Record<string, unknown> } }>(
      '/registers/entries/:id',
      { preHandler: [app.authenticate, app.requireTenantScope] },
      async (req, reply) => {
        if (!req.body?.fields) throw new ValidationError('fields required');
        const entry = await this.service.updateEntry(app, req, req.params.id, req.body.fields);
        reply.send(ok(entry));
      },
    );

    app.delete<{ Params: { id: string } }>(
      '/registers/entries/:id',
      { preHandler: [app.authenticate, app.requireTenantScope] },
      async (req, reply) => {
        await this.service.deleteEntry(app, req, req.params.id);
        reply.code(204).send();
      },
    );
  }
}

export default RegisterController;
