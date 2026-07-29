import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import RbacService from '../service/rbac.service.js';
import { ok } from '../../../kernel/response/api-response.js';

export class RbacController {
  constructor(private readonly service: RbacService = new RbacService()) {}

  register(app: FastifyInstance): void {
    app.get('/rbac/roles', { preHandler: [app.authenticate] }, this.listRoles.bind(this));
    app.get('/rbac/departments', { preHandler: [app.authenticate] }, this.listDepartments.bind(this));
    app.get('/rbac/permissions', { preHandler: [app.authenticate] }, this.listPermissions.bind(this));
    app.get('/rbac/roles/:roleId/permissions', { preHandler: [app.authenticate] }, this.listRolePermissions.bind(this));
    app.get('/rbac/module-permissions', { preHandler: [app.authenticate] }, this.listModulePermissions.bind(this));
  }

  async listRoles(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listRoles()));
  }

  async listDepartments(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listDepartments()));
  }

  async listPermissions(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listPermissions()));
  }

  async listRolePermissions(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { roleId } = req.params as { roleId: string };
    reply.send(ok(await this.service.listRolePermissions(roleId)));
  }

  async listModulePermissions(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = req.query as { tenantId?: string | null; userId?: string; roleId?: string };
    reply.send(ok(await this.service.listModulePermissions({
      tenantId: query.tenantId,
      userId: query.userId,
      roleId: query.roleId,
    })));
  }
}

export default RbacController;
