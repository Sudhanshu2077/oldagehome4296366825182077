import { NotFoundError, ForbiddenError } from '../../../kernel/errors/app-error.js';
import { tenantFilter } from '../../../plugins/tenant.plugin.js';
import type { FastifyRequest } from 'fastify';
import UserRepository, { toUserRow, type CreateUserInput, type UpdateUserInput, type UserRow } from '../repository/user.repository.js';
import type { UserDoc } from '../entity/user.entity.js';
import { UserModel } from '../entity/user.entity.js';

export class UserService {
  constructor(private readonly repo: UserRepository = new UserRepository()) {}

  async listForCurrentTenant(req: FastifyRequest): Promise<UserRow[]> {
    const filter = tenantFilter(req, {});
    const docs = await UserModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map((d) => toUserRow(d as unknown as UserDoc));
  }

  async findById(req: FastifyRequest, id: string): Promise<UserRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError('user not found');
    this.assertTenantAccess(req, row.tenantId);
    return row;
  }

  async create(req: FastifyRequest, input: CreateUserInput): Promise<UserRow> {
    const actor = req.sessionUser;
    if (!actor) throw new ForbiddenError('authentication required');
    if (input.tenantId && input.tenantId !== actor.tenantId && actor.tier !== 'government') {
      throw new ForbiddenError('cannot create user in another tenant');
    }
    if (actor.tier === 'external') throw new ForbiddenError('external tier cannot create users');
    return this.repo.create({ ...input, createdBy: actor.userId });
  }

  async update(req: FastifyRequest, id: string, input: UpdateUserInput): Promise<UserRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('user not found');
    this.assertTenantAccess(req, existing.tenantId);
    const patch = req.sessionUser && req.sessionUser.userId !== id ? { ...input, updatedBy: req.sessionUser.userId } : input;
    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundError('user not found after update');
    return updated;
  }

  async deactivate(req: FastifyRequest, id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('user not found');
    this.assertTenantAccess(req, existing.tenantId);
    if (!req.sessionUser) throw new ForbiddenError('authentication required');
    await this.repo.update(id, { isActive: false, updatedBy: req.sessionUser.userId });
  }

  async recordLogin(id: string, ip: string, deviceId: string): Promise<void> {
    await this.repo.recordLogin(id, ip, deviceId);
  }

  private assertTenantAccess(req: FastifyRequest, targetTenantId: string | null): void {
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError('authentication required');
    if (su.tier === 'government') return;
    if (targetTenantId !== su.tenantId) throw new ForbiddenError('cross-tenant user access denied');
  }
}

export default UserService;
