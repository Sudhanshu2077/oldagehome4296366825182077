import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import UserService from '../service/user.service.js';
import type { CreateUserInput, UpdateUserInput } from '../repository/user.repository.js';
import type { DepartmentCode, RoleId, RegisterScopeId } from '../../../kernel/types/rbac.js';
import { ok } from '../../../kernel/response/api-response.js';
import { ValidationError } from '../../../kernel/errors/app-error.js';
import type { GovernmentJurisdiction } from '../../../kernel/types/session.js';

export interface CreateUserBody {
  firebaseUid: string;
  email: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  roleId: RoleId;
  tenantId?: string | null;
  departmentCode?: string | null;
  jurisdiction?: GovernmentJurisdiction | null;
  grantedPermissions?: string[];
  registerWriteScopes?: RegisterScopeId[];
}

export class UserController {
  constructor(private readonly service: UserService = new UserService()) {}

  register(app: FastifyInstance): void {
    app.get('/users', { preHandler: [app.authenticate, app.requireTenantRead] }, this.list.bind(this));
    app.get('/users/:id', { preHandler: [app.authenticate, app.requireTenantRead] }, this.getById.bind(this));
    app.post('/users', { preHandler: [app.authenticate, app.requireTenantScope] }, this.create.bind(this));
    app.patch('/users/:id', { preHandler: [app.authenticate, app.requireTenantScope] }, this.update.bind(this));
    app.delete('/users/:id', { preHandler: [app.authenticate, app.requireTenantScope] }, this.deactivate.bind(this));
  }

  async list(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listForCurrentTenant(req)));
  }

  async getById(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    reply.send(ok(await this.service.findById(req, id)));
  }

  async create(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = req.body as CreateUserBody | undefined;
    if (!body?.firebaseUid || !body?.email || !body?.roleId) {
      throw new ValidationError('firebaseUid, email, roleId required');
    }
    const input: CreateUserInput = {
      firebaseUid: body.firebaseUid,
      email: body.email,
      emailVerified: body.emailVerified ?? false,
      displayName: body.displayName ?? '',
      photoUrl: body.photoUrl ?? '',
      roleId: body.roleId,
      tenantId: body.tenantId ?? null,
      departmentCode: (body.departmentCode as DepartmentCode | null) ?? null,
      jurisdiction: body.jurisdiction ?? null,
      grantedPermissions: body.grantedPermissions ?? [],
      registerWriteScopes: body.registerWriteScopes ?? [],
    };
    reply.code(201).send(ok(await this.service.create(req, input)));
  }

  async update(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<CreateUserBody> & { isActive?: boolean };
    const input: UpdateUserInput = {};
    if (body.roleId !== undefined) input.roleId = body.roleId;
    if (body.tenantId !== undefined) input.tenantId = body.tenantId;
    if (body.departmentCode !== undefined) input.departmentCode = body.departmentCode as DepartmentCode | null;
    if (body.jurisdiction !== undefined) input.jurisdiction = body.jurisdiction;
    if (body.grantedPermissions !== undefined) input.grantedPermissions = body.grantedPermissions;
    if (body.registerWriteScopes !== undefined) input.registerWriteScopes = body.registerWriteScopes;
    if (body.isActive !== undefined) input.isActive = body.isActive;
    reply.send(ok(await this.service.update(req, id, input)));
  }

  async deactivate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    await this.service.deactivate(req, id);
    reply.code(204).send();
  }
}

export default UserController;
