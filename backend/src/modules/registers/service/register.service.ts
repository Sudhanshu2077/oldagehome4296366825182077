import type { FastifyInstance, FastifyRequest } from 'fastify';
import RegisterRepository, { type RegisterEntryRow } from '../repository/register.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { isRegisterScopeId, REGISTER_SCOPE_IDS, type RegisterScopeId } from '../../../kernel/types/rbac.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { normalizePageQuery } from '../../../kernel/pagination/pagination.js';

export const REGISTER_TITLES: Record<RegisterScopeId, { en: string; mr: string }> = {
  R1: { en: 'Admission Register', mr: 'प्रवेश नोंदवही' },
  R2: { en: 'Discharge Register', mr: 'डिस्चार्ज नोंदवही' },
  R3: { en: 'Medical Register', mr: 'वैद्यकीय नोंदवही' },
  R4: { en: 'Medicine Register', mr: 'औषध नोंदवही' },
  R5: { en: 'Diet Register', mr: 'आहार नोंदवही' },
  R6: { en: 'Visitor Register', mr: 'भेटीची नोंदवही' },
  R7: { en: 'Donation Register', mr: 'देणगी नोंदवही' },
  R8: { en: 'Expense Register', mr: 'खर्च नोंदवही' },
  R9: { en: 'Staff Attendance Register', mr: 'कर्मचारी उपस्थिती नोंदवही' },
  R10: { en: 'Asset Register', mr: 'मालमत्ता नोंदवही' },
  R11: { en: 'Grievance Register', mr: 'तक्रार नोंदवही' },
  R12: { en: 'Death Register', mr: 'मृत्यू नोंदवही' },
  R13: { en: 'Miscellaneous Register', mr: 'इतर नोंदवही' },
};

export class RegisterService {
  constructor(private readonly repo: RegisterRepository = new RegisterRepository()) {}

  private canWrite(req: FastifyRequest, register: RegisterScopeId): boolean {
    const su = req.sessionUser;
    if (!su) return false;
    if (su.tier !== 'institution') return false;
    if (su.role === 'assistant-manager') return true;
    if (su.role === 'department-user') return su.registerWriteScopes.includes(register);
    return false;
  }

  private parseRegister(param: string): RegisterScopeId {
    const normalized = param.toUpperCase().startsWith('R') ? param.toUpperCase() : `R${param}`;
    if (!isRegisterScopeId(normalized)) throw new ValidationError(`unknown register: ${param}`);
    return normalized;
  }

  async listRegisters(req: FastifyRequest) {
    if (!req.sessionUser) throw new ForbiddenError();
    if (req.sessionUser.tier !== 'institution' && req.sessionUser.tier !== 'government') throw new ForbiddenError('register access denied');
    return REGISTER_SCOPE_IDS.map((id) => ({ id, title: REGISTER_TITLES[id].en, titleMr: REGISTER_TITLES[id].mr }));
  }

  async listEntries(req: FastifyRequest, registerParam: string, query: Record<string, unknown>) {
    if (!req.sessionUser) throw new ForbiddenError();
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const register = this.parseRegister(registerParam);
    const { page, pageSize } = normalizePageQuery(query);
    const result = await this.repo.list(tenantId, register, page, pageSize);
    return { ...result, page, pageSize, totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize) };
  }

  async createEntry(app: FastifyInstance, req: FastifyRequest, registerParam: string, fields: Record<string, unknown>): Promise<RegisterEntryRow> {
    const register = this.parseRegister(registerParam);
    if (!this.canWrite(req, register)) throw new ForbiddenError('write access denied for this register');
    const tenantId = assertTenantWriteAccess(req);
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new ValidationError('fields must be an object');

    const entry = await this.repo.create({ tenantId, register, fields, createdBy: req.sessionUser!.userId });
    await app.auditHook(req, 'create', `register:${register}`, entry.id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register, action: 'created', entry });
    return entry;
  }

  async updateEntry(app: FastifyInstance, req: FastifyRequest, id: string, fields: Record<string, unknown>): Promise<RegisterEntryRow> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('entry not found');
    const register = existing.register as RegisterScopeId;
    if (!this.canWrite(req, register)) throw new ForbiddenError('write access denied for this register');
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new ValidationError('fields must be an object');

    const updated = await this.repo.update(tenantId, id, fields, req.sessionUser!.userId);
    if (!updated) throw new NotFoundError('entry not found');
    await app.auditHook(req, 'update', `register:${register}`, id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register, action: 'updated', entry: updated });
    return updated;
  }

  async deleteEntry(app: FastifyInstance, req: FastifyRequest, id: string): Promise<void> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('entry not found');
    const register = existing.register as RegisterScopeId;
    if (!this.canWrite(req, register)) throw new ForbiddenError('write access denied for this register');

    const deleted = await this.repo.softDelete(tenantId, id, req.sessionUser!.userId);
    if (!deleted) throw new NotFoundError('entry not found');
    await app.auditHook(req, 'delete', `register:${register}`, id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register, action: 'deleted', entryId: id });
  }
}

export default RegisterService;
