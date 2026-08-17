import { Types } from 'mongoose';
import { SchemaRegisterEntryModel, SchemaRegisterCounterModel, type SRegCode, type SchemaRegisterEntryDoc } from '../entity/schema-register.entity.js';

export interface SRegEntryRow {
  id: string;
  tenantId: string;
  code: string;
  entryNumber: string;
  status: string;
  date: Date | null;
  month: string;
  values: Record<string, unknown>;
  signatures: Record<string, string>;
  remarks: string;
  createdBy: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  finalizedBy: string | null;
  finalizedAt: Date | null;
  changes: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SRegEntryFilter {
  from?: Date;
  to?: Date;
  status?: string;
  search?: string;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

function mapToRecord(m: unknown): Record<string, unknown> {
  if (m instanceof Map) {
    return Object.fromEntries(m.entries());
  }
  if (m && typeof m === 'object') {
    return { ...(m as Record<string, unknown>) };
  }
  return {};
}

export function toSRegEntryRow(doc: SchemaRegisterEntryDoc): SRegEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    code: doc.code,
    entryNumber: doc.entryNumber,
    status: doc.status,
    date: doc.date ?? null,
    month: doc.month ?? '',
    values: mapToRecord(doc.values),
    signatures: mapToRecord(doc.signatures) as Record<string, string>,
    remarks: doc.remarks ?? '',
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    submittedBy: doc.submittedBy ? doc.submittedBy.toString() : null,
    submittedAt: doc.submittedAt ?? null,
    reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : null,
    reviewedAt: doc.reviewedAt ?? null,
    finalizedBy: doc.finalizedBy ? doc.finalizedBy.toString() : null,
    finalizedAt: doc.finalizedAt ?? null,
    changes: doc.changes ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class SchemaRegisterRepository {
  async nextEntryNumber(tenantId: string, code: SRegCode): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await SchemaRegisterCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), code, year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return `${code === 'food-taste' ? 'FT' : 'SV'}${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(input: Record<string, unknown>): Promise<SRegEntryRow> {
    const doc = await SchemaRegisterEntryModel.create(input);
    return toSRegEntryRow(doc.toObject() as SchemaRegisterEntryDoc);
  }

  async list(
    tenantIds: string[],
    code: SRegCode,
    filter: SRegEntryFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: SRegEntryRow[]; total: number }> {
    const query: Record<string, unknown> = { deletedAt: null, code };
    if (tenantIds.length === 1) {
      query.tenantId = toObjectId(tenantIds[0]!);
    } else if (tenantIds.length > 1) {
      query.tenantId = { $in: tenantIds.map((id) => toObjectId(id)) };
    } else {
      return { items: [], total: 0 };
    }
    if (filter.status) query.status = filter.status;
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.date = range;
    }
    if (filter.search) {
      const rx = { $regex: filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      query.$or = [{ entryNumber: rx }, { 'values.personName': rx }, { remarks: rx }];
    }
    const [docs, total] = await Promise.all([
      SchemaRegisterEntryModel.find(query).sort({ date: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      SchemaRegisterEntryModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toSRegEntryRow(d as unknown as SchemaRegisterEntryDoc)), total };
  }

  async findById(tenantId: string, code: SRegCode, id: string): Promise<SRegEntryRow | null> {
    const doc = await SchemaRegisterEntryModel.findOne({ _id: id, tenantId: toObjectId(tenantId), code, deletedAt: null }).lean();
    return doc ? toSRegEntryRow(doc as unknown as SchemaRegisterEntryDoc) : null;
  }

  async findByIds(tenantIds: string[], code: SRegCode, id: string): Promise<SRegEntryRow | null> {
    const doc = await SchemaRegisterEntryModel.findOne({ _id: id, tenantId: { $in: tenantIds.map((t) => toObjectId(t)) }, code, deletedAt: null }).lean();
    return doc ? toSRegEntryRow(doc as unknown as SchemaRegisterEntryDoc) : null;
  }

  async update(tenantId: string, code: SRegCode, id: string, set: Record<string, unknown>): Promise<SRegEntryRow | null> {
    const doc = await SchemaRegisterEntryModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), code, deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toSRegEntryRow(doc as unknown as SchemaRegisterEntryDoc) : null;
  }
}

export default SchemaRegisterRepository;
