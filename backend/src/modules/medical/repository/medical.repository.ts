import { Types } from 'mongoose';
import { MedicalEntryModel, MedicalCounterModel, type MedicalEntryDoc } from '../entity/medical-entry.entity.js';

export interface MedicalEntryRow {
  id: string;
  tenantId: string;
  entryNumber: string;
  status: string;
  personId: string | null;
  personName: string;
  diseaseNature: string;
  illnessDate: Date | null;
  medicineParticulars: string;
  medicineAllowances: string;
  medicalOfficerName: string;
  medicalOfficerSignature: string;
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

export interface MedicalListFilter {
  from?: Date;
  to?: Date;
  status?: string;
  personName?: string;
  search?: string;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

export function toMedicalEntryRow(doc: MedicalEntryDoc): MedicalEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    entryNumber: doc.entryNumber,
    status: doc.status,
    personId: doc.personId ? doc.personId.toString() : null,
    personName: doc.personName ?? '',
    diseaseNature: doc.diseaseNature ?? '',
    illnessDate: doc.illnessDate ?? null,
    medicineParticulars: doc.medicineParticulars ?? '',
    medicineAllowances: doc.medicineAllowances ?? '',
    medicalOfficerName: doc.medicalOfficerName ?? '',
    medicalOfficerSignature: doc.medicalOfficerSignature ?? '',
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

export class MedicalRepository {
  async nextEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await MedicalCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return `MD${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(input: Record<string, unknown>): Promise<MedicalEntryRow> {
    const doc = await MedicalEntryModel.create(input);
    return toMedicalEntryRow(doc.toObject() as MedicalEntryDoc);
  }

  async list(
    tenantIds: string[],
    filter: MedicalListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: MedicalEntryRow[]; total: number }> {
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
    if (filter.search) {
      const rx = { $regex: filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      query.$or = [
        { diseaseNature: rx },
        { medicineParticulars: rx },
        { medicalOfficerName: rx },
        { remarks: rx },
      ];
    }
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.illnessDate = range;
    }
    const [docs, total] = await Promise.all([
      MedicalEntryModel.find(query).sort({ illnessDate: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      MedicalEntryModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toMedicalEntryRow(d as unknown as MedicalEntryDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<MedicalEntryRow | null> {
    const doc = await MedicalEntryModel.findOne({ _id: id, tenantId: toObjectId(tenantId), deletedAt: null }).lean();
    return doc ? toMedicalEntryRow(doc as unknown as MedicalEntryDoc) : null;
  }

  async findByIds(tenantIds: string[], id: string): Promise<MedicalEntryRow | null> {
    const doc = await MedicalEntryModel.findOne({ _id: id, tenantId: { $in: tenantIds.map((t) => toObjectId(t)) }, deletedAt: null }).lean();
    return doc ? toMedicalEntryRow(doc as unknown as MedicalEntryDoc) : null;
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<MedicalEntryRow | null> {
    const doc = await MedicalEntryModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toMedicalEntryRow(doc as unknown as MedicalEntryDoc) : null;
  }
}

export default MedicalRepository;
