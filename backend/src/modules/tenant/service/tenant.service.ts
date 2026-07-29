import { ConflictError, ForbiddenError, NotFoundError } from '../../../kernel/errors/app-error.js';
import TenantRepository, {
  type CreateInstitutionInput,
  type UpdateInstitutionInput,
  type InstitutionRow,
} from '../repository/tenant.repository.js';
import type { FastifyRequest } from 'fastify';

export class TenantService {
  constructor(private readonly repo: TenantRepository = new TenantRepository()) {}

  async getCurrent(req: FastifyRequest): Promise<InstitutionRow> {
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError('authentication required');
    if (su.tier === 'government') throw new ForbiddenError('government tier has no single current institution');
    if (!su.tenantId) throw new NotFoundError('user has no institution');
    const row = await this.repo.findById(su.tenantId);
    if (!row) throw new NotFoundError('institution not found');
    return row;
  }

  async listGovScoped(req: FastifyRequest): Promise<InstitutionRow[]> {
    if (!req.sessionUser || req.sessionUser.tier !== 'government') throw new ForbiddenError('gov-tier only');
    return this.repo.listForGovRead(req);
  }

  async create(input: CreateInstitutionInput): Promise<InstitutionRow> {
    const existing = await this.repo.findByCode(input.code);
    if (existing) throw new ConflictError(`institution code already in use: ${input.code}`);
    return this.repo.create(input);
  }

  async update(id: string, input: UpdateInstitutionInput): Promise<InstitutionRow> {
    const updated = await this.repo.update(id, input);
    if (!updated) throw new NotFoundError('institution not found');
    return updated;
  }

  async getById(id: string): Promise<InstitutionRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError('institution not found');
    return row;
  }

  async getByCodeOrNull(code: string): Promise<InstitutionRow | null> {
    return this.repo.findByCode(code);
  }
}

export default TenantService;
