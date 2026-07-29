import type { FilterQuery } from 'mongoose';
import { ActivityLogModel, type ActivityLogDoc } from '../entity/activity-log.entity.js';
import { tenantFilter, jurisdictionFilter, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import type { FastifyRequest } from 'fastify';

export interface ActivityLogRow {
  id: string;
  tenantId: string | null;
  userId: string | null;
  event: string;
  meta: unknown;
  ip: string;
  deviceId: string;
  requestId: string;
  timestamp: Date;
}

export interface WriteActivityInput {
  event: string;
  meta?: Record<string, unknown> | undefined;
  ip?: string | undefined;
  deviceId?: string | undefined;
  requestId?: string | undefined;
}

function toRow(doc: ActivityLogDoc): ActivityLogRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    userId: doc.userId ? doc.userId.toString() : null,
    event: doc.event,
    meta: doc.meta,
    ip: doc.ip,
    deviceId: doc.deviceId,
    requestId: doc.requestId,
    timestamp: doc.timestamp,
  };
}

export class ActivityLogRepository {
  async write(req: FastifyRequest, input: WriteActivityInput): Promise<ActivityLogRow> {
    const su = req.sessionUser;
    const doc = await ActivityLogModel.create({
      tenantId: su?.tenantId ?? null,
      userId: su?.userId ?? null,
      event: input.event,
      meta: input.meta ?? null,
      ip: input.ip ?? req.ip,
      deviceId: input.deviceId ?? su?.sessionDeviceId ?? '',
      requestId: input.requestId ?? req.id,
    });
    return toRow(doc.toObject() as ActivityLogDoc);
  }

  async list(req: FastifyRequest, filter: { event?: string | undefined; userId?: string | undefined }): Promise<ActivityLogRow[]> {
    if (!req.sessionUser) return [];
    let q: FilterQuery<ActivityLogDoc>;
    if (req.sessionUser.tier === 'government') {
      const base = jurisdictionFilter<ActivityLogDoc>(req, {});
      q = { ...base, ...(filter.event ? { event: filter.event } : {}), ...(filter.userId ? { userId: filter.userId } : {}) } as FilterQuery<ActivityLogDoc>;
    } else {
      const tenantId = resolvedTenantId(req);
      if (!tenantId) return [];
      q = tenantFilter<ActivityLogDoc>(req, {
        ...(filter.event ? { event: filter.event } : {}),
        ...(filter.userId ? { userId: filter.userId } : {}),
      });
    }
    const docs = await ActivityLogModel.find(q).sort({ timestamp: -1 }).limit(500).lean();
    return docs.map((d) => toRow(d as ActivityLogDoc));
  }
}

export default ActivityLogRepository;
