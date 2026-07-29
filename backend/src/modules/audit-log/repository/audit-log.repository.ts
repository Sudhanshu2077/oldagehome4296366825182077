import type { FilterQuery } from 'mongoose';
import { AuditLogModel, type AuditLogDoc } from '../entity/audit-log.entity.js';
import { tenantFilter, jurisdictionFilter, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import type { FastifyRequest } from 'fastify';

export interface AuditLogRow {
  id: string;
  tenantId: string | null;
  userId: string | null;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string;
  device: string;
  browser: string;
  ip: string;
  geo: unknown;
  requestId: string;
  timestamp: Date;
}

export interface WriteAuditInput {
  action: string;
  entity: string;
  entityId?: string | undefined;
  before?: unknown;
  after?: unknown;
  reason?: string;
  device?: string;
  browser?: string;
  ip?: string;
  geo?: unknown;
  requestId?: string;
}

function toRow(doc: AuditLogDoc): AuditLogRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    userId: doc.userId ? doc.userId.toString() : null,
    role: doc.role,
    action: doc.action,
    entity: doc.entity,
    entityId: doc.entityId,
    before: doc.before,
    after: doc.after,
    reason: doc.reason,
    device: doc.device,
    browser: doc.browser,
    ip: doc.ip,
    geo: doc.geo,
    requestId: doc.requestId,
    timestamp: doc.timestamp,
  };
}

export class AuditLogRepository {
  async write(req: FastifyRequest, input: WriteAuditInput): Promise<AuditLogRow> {
    const su = req.sessionUser;
    const tenantId = su?.tenantId ?? null;
    const doc = await AuditLogModel.create({
      tenantId,
      userId: su?.userId ?? null,
      role: su?.role ?? '',
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? '',
      before: input.before ?? null,
      after: input.after ?? null,
      reason: input.reason ?? '',
      device: input.device ?? '',
      browser: input.browser ?? '',
      ip: input.ip ?? '',
      geo: input.geo ?? null,
      requestId: input.requestId ?? req.id,
    });
    return toRow(doc.toObject() as AuditLogDoc);
  }

  async list(req: FastifyRequest, filter: {
    entity?: string | undefined;
    action?: string | undefined;
    userId?: string | undefined;
  }): Promise<AuditLogRow[]> {
    if (!req.sessionUser) return [];
    let q: FilterQuery<AuditLogDoc>;
    if (req.sessionUser.tier === 'government') {
      const base = jurisdictionFilter<AuditLogDoc>(req, {});
      q = { ...base, ...(filter.entity ? { entity: filter.entity } : {}), ...(filter.action ? { action: filter.action } : {}), ...(filter.userId ? { userId: filter.userId } : {}) } as FilterQuery<AuditLogDoc>;
    } else {
      const tenantId = resolvedTenantId(req);
      if (!tenantId) return [];
      q = tenantFilter<AuditLogDoc>(req, {
        ...(filter.entity ? { entity: filter.entity } : {}),
        ...(filter.action ? { action: filter.action } : {}),
        ...(filter.userId ? { userId: filter.userId } : {}),
      });
    }
    const docs = await AuditLogModel.find(q).sort({ timestamp: -1 }).limit(500).lean();
    return docs.map((d) => toRow(d as AuditLogDoc));
  }
}

export default AuditLogRepository;
