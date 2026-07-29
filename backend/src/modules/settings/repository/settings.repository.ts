import { SettingModel, type SettingDoc } from '../entity/setting.entity.js';
import { resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { FilterQuery } from 'mongoose';
import type { FastifyRequest } from 'fastify';

export interface SettingRow {
  id: string;
  tenantId: string | null;
  scope: 'institution' | 'government';
  group: string;
  key: string;
  value: unknown;
  valueType: string;
  updatedAt: Date;
}

function toRow(doc: SettingDoc): SettingRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    scope: doc.scope as 'institution' | 'government',
    group: doc.group,
    key: doc.key,
    value: doc.value,
    valueType: doc.valueType,
    updatedAt: doc.updatedAt,
  };
}

export interface UpsertSettingInput {
  scope: 'institution' | 'government';
  group: string;
  key: string;
  value: unknown;
  valueType?: string;
}

export class SettingsRepository {
  async list(req: FastifyRequest, filter: { scope?: string | undefined; group?: string | undefined }): Promise<SettingRow[]> {
    const tenantId = resolvedTenantId(req);
    const q: FilterQuery<SettingDoc> = {
      ...(filter.scope ? { scope: filter.scope } : {}),
      ...(filter.group ? { group: filter.group } : {}),
      ...(req.sessionUser?.tier === 'government' ? {} : { tenantId }),
    };
    const docs = await SettingModel.find(q).sort({ group: 1, key: 1 }).lean();
    return docs.map((d) => toRow(d as SettingDoc));
  }

  async upsert(req: FastifyRequest, input: UpsertSettingInput): Promise<SettingRow> {
    const tenantId = input.scope === 'government' ? null : resolvedTenantId(req);
    const filter = { tenantId, scope: input.scope, group: input.group, key: input.key };
    const updated = await SettingModel.findOneAndUpdate(
      filter,
      { $set: { value: input.value, valueType: input.valueType ?? 'string', updatedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    return toRow(updated as SettingDoc);
  }

  async delete(req: FastifyRequest, scope: string, group: string, key: string): Promise<void> {
    const tenantId = resolvedTenantId(req);
    await SettingModel.deleteOne({ tenantId, scope, group, key });
  }
}

export default SettingsRepository;
