import { Types } from 'mongoose';
import { InwardEntryModel, InwardCounterModel, type InwardEntryDoc } from '../entity/inward-entry.entity.js';

export interface InwardEntryRow {
  id: string;
  tenantId: string;
  entryNumber: string;
  status: string;
  fileNo: string;
  senderName: string;
  letterNo: string;
  receivedDate: Date | null;
  subject: string;
  issuedTo: string;
  attachments: unknown[];
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

export interface InwardListFilter {
  from?: Date;
  to?: Date;
  year?: number;
  month?: number;
  status?: string;
  search?: string;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

function toObjectIdOrNull(v: string | null | undefined): string | null {
  return v ? v.toString() : null;
}

export function toInwardEntryRow(doc: InwardEntryDoc): InwardEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    entryNumber: doc.entryNumber,
    status: doc.status,
    fileNo: doc.fileNo ?? '',
    senderName: doc.senderName ?? '',
    letterNo: doc.letterNo ?? '',
    receivedDate: doc.receivedDate ?? null,
    subject: doc.subject ?? '',
    issuedTo: doc.issuedTo ?? '',
    attachments: doc.attachments ?? [],
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

export class InwardRepository {
  async nextEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await InwardCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return `IN${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(input: Record<string, unknown>): Promise<InwardEntryRow> {
    const doc = await InwardEntryModel.create(input);
    return toInwardEntryRow(doc.toObject() as InwardEntryDoc);
  }

  async list(
    tenantIds: string[],
    filter: InwardListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: InwardEntryRow[]; total: number }> {
    const query: Record<string, unknown> = { deletedAt: null };
    if (tenantIds.length === 1) {
      query.tenantId = toObjectId(tenantIds[0]!);
    } else if (tenantIds.length > 1) {
      query.tenantId = { $in: tenantIds.map((id) => toObjectId(id)) };
    } else {
      return { items: [], total: 0 };
    }
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const rx = { $regex: filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      query.$or = [
        { fileNo: rx },
        { senderName: rx },
        { letterNo: rx },
        { subject: rx },
        { issuedTo: rx },
      ];
    }
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.receivedDate = range;
    }
    if (filter.year) {
      const start = new Date(Date.UTC(filter.year, 0, 1));
      const end = new Date(Date.UTC(filter.year, 11, 31, 23, 59, 59, 999));
      const range: Record<string, Date> = { $gte: start, $lte: end };
      if (filter.month) {
        range.$gte = new Date(Date.UTC(filter.year, filter.month - 1, 1));
        range.$lte = new Date(Date.UTC(filter.year, filter.month, 0, 23, 59, 59, 999));
      }
      query.receivedDate = range;
    }
    const [docs, total] = await Promise.all([
      InwardEntryModel.find(query).sort({ receivedDate: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      InwardEntryModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toInwardEntryRow(d as unknown as InwardEntryDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<InwardEntryRow | null> {
    const doc = await InwardEntryModel.findOne({ _id: id, tenantId: toObjectId(tenantId), deletedAt: null }).lean();
    return doc ? toInwardEntryRow(doc as unknown as InwardEntryDoc) : null;
  }

  async findByIds(tenantIds: string[], id: string): Promise<InwardEntryRow | null> {
    const doc = await InwardEntryModel.findOne({ _id: id, tenantId: { $in: tenantIds.map((t) => toObjectId(t)) }, deletedAt: null }).lean();
    return doc ? toInwardEntryRow(doc as unknown as InwardEntryDoc) : null;
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<InwardEntryRow | null> {
    const doc = await InwardEntryModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toInwardEntryRow(doc as unknown as InwardEntryDoc) : null;
  }

  async findExistingByLetterNo(tenantId: string, letterNo: string, excludeId?: string): Promise<InwardEntryRow | null> {
    const query: Record<string, unknown> = {
      tenantId: toObjectId(tenantId),
      letterNo,
      deletedAt: null,
    };
    if (excludeId) query._id = { $ne: excludeId };
    const doc = await InwardEntryModel.findOne(query).lean();
    return doc ? toInwardEntryRow(doc as unknown as InwardEntryDoc) : null;
  }
}

export default InwardRepository;