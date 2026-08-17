import { Types } from 'mongoose';
import { VisitBookEntryModel, VisitBookCounterModel, type VisitBookEntryDoc } from '../entity/visit-book-entry.entity.js';

export interface VisitBookEntryRow {
  id: string;
  tenantId: string;
  entryNumber: string;
  status: string;
  entryDate: Date | null;
  officerName: string;
  officerPost: string;
  remark: string;
  createdBy: string | null;
  updatedBy: string | null;
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

export interface VisitBookListFilter {
  from?: Date;
  to?: Date;
  officer?: string;
  status?: string;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

export function toVisitBookEntryRow(doc: VisitBookEntryDoc): VisitBookEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    entryNumber: doc.entryNumber,
    status: doc.status,
    entryDate: doc.entryDate ?? null,
    officerName: doc.officerName,
    officerPost: doc.officerPost,
    remark: doc.remark,
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
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

export class VisitBookRepository {
  async nextEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await VisitBookCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return `VB${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(input: Record<string, unknown>): Promise<VisitBookEntryRow> {
    const doc = await VisitBookEntryModel.create(input);
    return toVisitBookEntryRow(doc.toObject() as VisitBookEntryDoc);
  }

  async list(
    tenantIds: string[],
    filter: VisitBookListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: VisitBookEntryRow[]; total: number }> {
    const query: Record<string, unknown> = { deletedAt: null };
    if (tenantIds.length === 1) {
      query.tenantId = toObjectId(tenantIds[0]!);
    } else if (tenantIds.length > 1) {
      query.tenantId = { $in: tenantIds.map((id) => toObjectId(id)) };
    } else {
      return { items: [], total: 0 };
    }
    if (filter.status) query.status = filter.status;
    if (filter.officer) {
      query.officerName = { $regex: filter.officer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.entryDate = range;
    }    const [docs, total] = await Promise.all([
      VisitBookEntryModel.find(query).sort({ entryDate: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      VisitBookEntryModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toVisitBookEntryRow(d as unknown as VisitBookEntryDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<VisitBookEntryRow | null> {
    const doc = await VisitBookEntryModel.findOne({ _id: id, tenantId: toObjectId(tenantId), deletedAt: null }).lean();
    return doc ? toVisitBookEntryRow(doc as unknown as VisitBookEntryDoc) : null;
  }

  async findByIds(tenantIds: string[], id: string): Promise<VisitBookEntryRow | null> {
    const doc = await VisitBookEntryModel.findOne({ _id: id, tenantId: { $in: tenantIds.map((t) => toObjectId(t)) }, deletedAt: null }).lean();
    return doc ? toVisitBookEntryRow(doc as unknown as VisitBookEntryDoc) : null;
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<VisitBookEntryRow | null> {
    const doc = await VisitBookEntryModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toVisitBookEntryRow(doc as unknown as VisitBookEntryDoc) : null;
  }
}

export default VisitBookRepository;
