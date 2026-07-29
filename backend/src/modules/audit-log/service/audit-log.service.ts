import AuditLogRepository, { type AuditLogRow, type WriteAuditInput } from '../repository/audit-log.repository.js';
import type { FastifyRequest } from 'fastify';

export class AuditLogService {
  constructor(private readonly repo: AuditLogRepository = new AuditLogRepository()) {}

  async write(req: FastifyRequest, input: WriteAuditInput): Promise<AuditLogRow> {
    return this.repo.write(req, input);
  }

  async list(req: FastifyRequest, filter: { entity?: string | undefined; action?: string | undefined; userId?: string | undefined }): Promise<AuditLogRow[]> {
    return this.repo.list(req, filter);
  }
}

export default AuditLogService;
