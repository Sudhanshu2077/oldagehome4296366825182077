import { Types } from 'mongoose';
import { InOutEntryModel, InOutCounterModel, type InOutEntryDoc } from '../entity/inout-entry.entity.js';

export interface InOutEntryRow {
  id: string;
  tenantId: string;
  entryNumber: string;
  status: string;
  employeeId: string | null;
  employeeCode: string;
  employeeName: string;
  outDate: Date | null;
  outTime: string;
  place: string;
  reason: string;
  outSignature: string;
  returnDate: Date | null;
  returnTime: string;
  inSignature: string;
  remarks: string;
  createdBy: string | null;
  updatedBy: string | null;
  outSubmittedBy: string | null;
  outSubmittedAt: Date | null;
  returnSubmittedBy: string | null;
  returnSubmittedAt: Date | null;
  changes: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InOutListFilter {
  from?: Date;
  to?: Date;
  status?: string;
  employeeId?: string;
  search?: string;
  late?: boolean;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

export function toInOutEntryRow(doc: InOutEntryDoc): InOutEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    entryNumber: doc.entryNumber,
    status: doc.status,
    employeeId: doc.employeeId ? doc.employeeId.toString() : null,
    employeeCode: doc.employeeCode ?? '',
    employeeName: doc.employeeName ?? '',
    outDate: doc.outDate ?? null,
    outTime: doc.outTime ?? '',
    place: doc.place ?? '',
    reason: doc.reason ?? '',
    outSignature: doc.outSignature ?? '',
    returnDate: doc.returnDate ?? null,
    returnTime: doc.returnTime ?? '',
    inSignature: doc.inSignature ?? '',
    remarks: doc.remarks ?? '',
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
    outSubmittedBy: doc.outSubmittedBy ? doc.outSubmittedBy.toString() : null,
    outSubmittedAt: doc.outSubmittedAt ?? null,
    returnSubmittedBy: doc.returnSubmittedBy ? doc.returnSubmittedBy.toString() : null,
    returnSubmittedAt: doc.returnSubmittedAt ?? null,
    changes: doc.changes ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class InOutRepository {
  async nextEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await InOutCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return `IO${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(input: Record<string, unknown>): Promise<InOutEntryRow> {
    const doc = await InOutEntryModel.create(input);
    return toInOutEntryRow(doc.toObject() as InOutEntryDoc);
  }

  async list(
    tenantIds: string[],
    filter: InOutListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: InOutEntryRow[]; total: number }> {
    const query: Record<string, unknown> = { deletedAt: null };
    if (tenantIds.length === 1) {
      query.tenantId = toObjectId(tenantIds[0]!);
    } else if (tenantIds.length > 1) {
      query.tenantId = { $in: tenantIds.map((id) => toObjectId(id)) };
    } else {
      return { items: [], total: 0 };
    }
    if (filter.status) query.status = filter.status;
    if (filter.employeeId) query.employeeId = toObjectId(filter.employeeId);
    if (filter.search) {
      const rx = { $regex: filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      query.$or = [
        { employeeName: rx },
        { employeeCode: rx },
        { place: rx },
        { reason: rx },
        { remarks: rx },
      ];
    }
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.outDate = range;
    }
    const [docs, total] = await Promise.all([
      InOutEntryModel.find(query).sort({ outDate: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      InOutEntryModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toInOutEntryRow(d as unknown as InOutEntryDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<InOutEntryRow | null> {
    const doc = await InOutEntryModel.findOne({ _id: id, tenantId: toObjectId(tenantId), deletedAt: null }).lean();
    return doc ? toInOutEntryRow(doc as unknown as InOutEntryDoc) : null;
  }

  async findByIds(tenantIds: string[], id: string): Promise<InOutEntryRow | null> {
    const doc = await InOutEntryModel.findOne({ _id: id, tenantId: { $in: tenantIds.map((t) => toObjectId(t)) }, deletedAt: null }).lean();
    return doc ? toInOutEntryRow(doc as unknown as InOutEntryDoc) : null;
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<InOutEntryRow | null> {
    const doc = await InOutEntryModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toInOutEntryRow(doc as unknown as InOutEntryDoc) : null;
  }

  async findActiveOut(tenantId: string, employeeId: string, excludeId?: string): Promise<InOutEntryRow | null> {
    const query: Record<string, unknown> = {
      tenantId: toObjectId(tenantId),
      employeeId: toObjectId(employeeId),
      status: 'OUT',
      deletedAt: null,
    };
    if (excludeId) query._id = { $ne: excludeId };
    const doc = await InOutEntryModel.findOne(query).sort({ createdAt: -1 }).lean();
    return doc ? toInOutEntryRow(doc as unknown as InOutEntryDoc) : null;
  }

  async lateReturns(tenantIds: string[], from: Date, to: Date): Promise<InOutEntryRow[]> {
    const query: Record<string, unknown> = {
      deletedAt: null,
      status: 'RETURNED',
    };
    if (tenantIds.length === 1) {
      query.tenantId = toObjectId(tenantIds[0]!);
    } else if (tenantIds.length > 1) {
      query.tenantId = { $in: tenantIds.map((id) => toObjectId(id)) };
    } else {
      return [];
    }
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      query.returnDate = range;
    }
    const docs = await InOutEntryModel.find(query).sort({ returnDate: -1 }).limit(500).lean();
    return docs.map((d) => toInOutEntryRow(d as unknown as InOutEntryDoc));
  }
}

export default InOutRepository;