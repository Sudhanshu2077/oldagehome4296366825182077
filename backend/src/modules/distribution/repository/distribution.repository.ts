import { Types } from 'mongoose';
import { DistributionEntryModel, DistributionCounterModel, type DistributionEntryDoc } from '../entity/distribution-entry.entity.js';

export interface DistributionEntryRow {
  id: string;
  tenantId: string;
  entryNumber: string;
  status: string;
  personId: string | null;
  personName: string;
  className: string;
  date: Date | null;
  clothesWashingPowder: number;
  clothesWashingSoap: number;
  bathingSoap: number;
  toothPowder: number;
  paste: number;
  brush: number;
  sourceColumn10: number;
  sourceColumn11: number;
  distributionDate: Date | null;
  superintendentSignature: string;
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

export interface DistributionListFilter {
  from?: Date;
  to?: Date;
  status?: string;
  personName?: string;
  item?: string;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

export function toDistributionEntryRow(doc: DistributionEntryDoc): DistributionEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    entryNumber: doc.entryNumber,
    status: doc.status,
    personId: doc.personId ? doc.personId.toString() : null,
    personName: doc.personName ?? '',
    className: doc.className ?? '',
    date: doc.date ?? null,
    clothesWashingPowder: doc.clothesWashingPowder ?? 0,
    clothesWashingSoap: doc.clothesWashingSoap ?? 0,
    bathingSoap: doc.bathingSoap ?? 0,
    toothPowder: doc.toothPowder ?? 0,
    paste: doc.paste ?? 0,
    brush: doc.brush ?? 0,
    sourceColumn10: doc.sourceColumn10 ?? 0,
    sourceColumn11: doc.sourceColumn11 ?? 0,
    distributionDate: doc.distributionDate ?? null,
    superintendentSignature: doc.superintendentSignature ?? '',
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

export class DistributionRepository {
  async nextEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await DistributionCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return `DS${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(input: Record<string, unknown>): Promise<DistributionEntryRow> {
    const doc = await DistributionEntryModel.create(input);
    return toDistributionEntryRow(doc.toObject() as DistributionEntryDoc);
  }

  async list(
    tenantIds: string[],
    filter: DistributionListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: DistributionEntryRow[]; total: number }> {
    const query: Record<string, unknown> = { deletedAt: null };
    if (tenantIds.length === 1) {
      query.tenantId = toObjectId(tenantIds[0]!);
    } else if (tenantIds.length > 1) {
      query.tenantId = { $in: tenantIds.map((id) => toObjectId(id)) };
    } else {
      return { items: [], total: 0 };
    }
    if (filter.status) query.status = filter.status;
    if (filter.personName) {
      query.personName = { $regex: filter.personName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (filter.item) {
      const rx = { $regex: filter.item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      query.$or = [
        { className: rx },
        { remarks: rx },
      ];
    }
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.date = range;
    }
    const [docs, total] = await Promise.all([
      DistributionEntryModel.find(query).sort({ date: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      DistributionEntryModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toDistributionEntryRow(d as unknown as DistributionEntryDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<DistributionEntryRow | null> {
    const doc = await DistributionEntryModel.findOne({ _id: id, tenantId: toObjectId(tenantId), deletedAt: null }).lean();
    return doc ? toDistributionEntryRow(doc as unknown as DistributionEntryDoc) : null;
  }

  async findByIds(tenantIds: string[], id: string): Promise<DistributionEntryRow | null> {
    const doc = await DistributionEntryModel.findOne({ _id: id, tenantId: { $in: tenantIds.map((t) => toObjectId(t)) }, deletedAt: null }).lean();
    return doc ? toDistributionEntryRow(doc as unknown as DistributionEntryDoc) : null;
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<DistributionEntryRow | null> {
    const doc = await DistributionEntryModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toDistributionEntryRow(doc as unknown as DistributionEntryDoc) : null;
  }
}

export default DistributionRepository;