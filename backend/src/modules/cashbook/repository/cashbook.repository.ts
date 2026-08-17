import { Types } from 'mongoose';
import { CashbookEntryModel, CashbookCounterModel, type CashbookEntryDoc } from '../entity/cashbook-entry.entity.js';

export interface CashbookEntryRow {
  id: string;
  tenantId: string;
  entryNumber: string;
  status: string;
  entryDate: Date | null;
  month: string;
  vrNo: string;
  particulars: string;
  lfNo: string;
  cashRupees: number;
  cashPaise: number;
  bankRupees: number;
  bankPaise: number;
  remarks: string;
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

export interface CashbookListFilter {
  from?: Date;
  to?: Date;
  status?: string;
  search?: string;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

export function toCashbookEntryRow(doc: CashbookEntryDoc): CashbookEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    entryNumber: doc.entryNumber,
    status: doc.status,
    entryDate: doc.entryDate ?? null,
    month: doc.month ?? '',
    vrNo: doc.vrNo ?? '',
    particulars: doc.particulars ?? '',
    lfNo: doc.lfNo ?? '',
    cashRupees: doc.cashRupees ?? 0,
    cashPaise: doc.cashPaise ?? 0,
    bankRupees: doc.bankRupees ?? 0,
    bankPaise: doc.bankPaise ?? 0,
    remarks: doc.remarks ?? '',
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

export class CashbookRepository {
  async nextEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await CashbookCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return `CB${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(input: Record<string, unknown>): Promise<CashbookEntryRow> {
    const doc = await CashbookEntryModel.create(input);
    return toCashbookEntryRow(doc.toObject() as CashbookEntryDoc);
  }

  async list(
    tenantIds: string[],
    filter: CashbookListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: CashbookEntryRow[]; total: number }> {
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
        { entryNumber: rx },
        { particulars: rx },
        { vrNo: rx },
        { month: rx },
      ];
    }
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.entryDate = range;
    }
    const [docs, total] = await Promise.all([
      CashbookEntryModel.find(query).sort({ entryDate: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      CashbookEntryModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toCashbookEntryRow(d as unknown as CashbookEntryDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<CashbookEntryRow | null> {
    const doc = await CashbookEntryModel.findOne({ _id: id, tenantId: toObjectId(tenantId), deletedAt: null }).lean();
    return doc ? toCashbookEntryRow(doc as unknown as CashbookEntryDoc) : null;
  }

  async findByIds(tenantIds: string[], id: string): Promise<CashbookEntryRow | null> {
    const doc = await CashbookEntryModel.findOne({ _id: id, tenantId: { $in: tenantIds.map((t) => toObjectId(t)) }, deletedAt: null }).lean();
    return doc ? toCashbookEntryRow(doc as unknown as CashbookEntryDoc) : null;
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<CashbookEntryRow | null> {
    const doc = await CashbookEntryModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toCashbookEntryRow(doc as unknown as CashbookEntryDoc) : null;
  }
}

export default CashbookRepository;