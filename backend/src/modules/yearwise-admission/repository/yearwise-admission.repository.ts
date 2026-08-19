import { Types } from 'mongoose';
import { YwaEntryModel, YwaCounterModel, type YwaEntryDoc } from '../entity/yearwise-admission.entity.js';

export interface YwaEntryRow {
  id: string;
  tenantId: string;
  registerYear: string;
  entryNumber: string;
  status: string;
  residentId: string | null;
  residentNumber: string;
  fullName: string;
  birthDate: Date | null;
  birthYear: number | null;
  aadhaarEnc: string;
  aadhaarLast4: string;
  signatureType: string;
  signatureUrl: string;
  thumbImpressionUrl: string;
  noSignatureReason: string;
  signatureCapturedBy: string | null;
  signatureCapturedAt: Date | null;
  photoUrl: string;
  photoUploadedBy: string | null;
  photoUploadedAt: Date | null;
  admissionDate: Date | null;
  officerId: string | null;
  officerName: string;
  officerDesignation: string;
  officerSignature: string;
  officerSignedAt: Date | null;
  remarks: string;
  createdBy: string | null;
  updatedBy: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  finalizedBy: string | null;
  finalizedAt: Date | null;
  voidedBy: string | null;
  voidedAt: Date | null;
  voidReason: string;
  changes: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface YwaListFilter {
  registerYear?: string;
  status?: string;
  residentName?: string;
  residentId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

function toObjectId(v: string): unknown {
  return Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v;
}

export function toYwaEntryRow(doc: YwaEntryDoc): YwaEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    registerYear: doc.registerYear,
    entryNumber: doc.entryNumber,
    status: doc.status,
    residentId: doc.residentId ? doc.residentId.toString() : null,
    residentNumber: doc.residentNumber ?? '',
    fullName: doc.fullName ?? '',
    birthDate: doc.birthDate ?? null,
    birthYear: doc.birthYear ?? null,
    aadhaarEnc: doc.aadhaarEnc ?? '',
    aadhaarLast4: doc.aadhaarLast4 ?? '',
    signatureType: doc.signatureType ?? 'none',
    signatureUrl: doc.signatureUrl ?? '',
    thumbImpressionUrl: doc.thumbImpressionUrl ?? '',
    noSignatureReason: doc.noSignatureReason ?? '',
    signatureCapturedBy: doc.signatureCapturedBy ? doc.signatureCapturedBy.toString() : null,
    signatureCapturedAt: doc.signatureCapturedAt ?? null,
    photoUrl: doc.photoUrl ?? '',
    photoUploadedBy: doc.photoUploadedBy ? doc.photoUploadedBy.toString() : null,
    photoUploadedAt: doc.photoUploadedAt ?? null,
    admissionDate: doc.admissionDate ?? null,
    officerId: doc.officerId ? doc.officerId.toString() : null,
    officerName: doc.officerName ?? '',
    officerDesignation: doc.officerDesignation ?? '',
    officerSignature: doc.officerSignature ?? '',
    officerSignedAt: doc.officerSignedAt ?? null,
    remarks: doc.remarks ?? '',
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
    submittedBy: doc.submittedBy ? doc.submittedBy.toString() : null,
    submittedAt: doc.submittedAt ?? null,
    reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : null,
    reviewedAt: doc.reviewedAt ?? null,
    approvedBy: doc.approvedBy ? doc.approvedBy.toString() : null,
    approvedAt: doc.approvedAt ?? null,
    finalizedBy: doc.finalizedBy ? doc.finalizedBy.toString() : null,
    finalizedAt: doc.finalizedAt ?? null,
    voidedBy: doc.voidedBy ? doc.voidedBy.toString() : null,
    voidedAt: doc.voidedAt ?? null,
    voidReason: doc.voidReason ?? '',
    changes: doc.changes ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class YwaRepository {
  async nextEntryNumber(tenantId: string, registerYear: string): Promise<{ entryNumber: string; seq: number }> {
    const counter = await YwaCounterModel.findOneAndUpdate(
      { tenantId: toObjectId(tenantId), registerYear },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    const startYear = registerYear.slice(0, 4) || String(new Date().getFullYear());
    return { entryNumber: `YWA${startYear}-${String(seq).padStart(6, '0')}`, seq };
  }

  async years(tenantId: string): Promise<string[]> {
    const docs = await YwaCounterModel.find({ tenantId: toObjectId(tenantId) }).select('registerYear').sort({ registerYear: -1 }).lean();
    return docs.map((d) => String(d.registerYear));
  }

  async listDistinctYears(tenantId: string): Promise<string[]> {
    return this.years(tenantId);
  }

  async create(input: Record<string, unknown>): Promise<YwaEntryRow> {
    const doc = await YwaEntryModel.create(input);
    return toYwaEntryRow(doc.toObject() as YwaEntryDoc);
  }

  async list(
    tenantIds: string[],
    filter: YwaListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: YwaEntryRow[]; total: number }> {
    const query: Record<string, unknown> = { deletedAt: null };
    if (tenantIds.length === 1) {
      query.tenantId = toObjectId(tenantIds[0]!);
    } else if (tenantIds.length > 1) {
      query.tenantId = { $in: tenantIds.map((id) => toObjectId(id)) };
    } else {
      return { items: [], total: 0 };
    }
    if (filter.registerYear) query.registerYear = filter.registerYear;
    if (filter.status) query.status = filter.status;
    if (filter.residentId) query.residentId = toObjectId(filter.residentId);
    if (filter.residentName) {
      query.fullName = { $regex: filter.residentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (filter.search) {
      const rx = { $regex: filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      query.$or = [
        { fullName: rx },
        { residentNumber: rx },
        { entryNumber: rx },
        { remarks: rx },
      ];
    }
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.admissionDate = range;
    }
    const [docs, total] = await Promise.all([
      YwaEntryModel.find(query).sort({ registerYear: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      YwaEntryModel.countDocuments(query),
    ]);
    return { items: docs.map((d) => toYwaEntryRow(d as unknown as YwaEntryDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<YwaEntryRow | null> {
    const doc = await YwaEntryModel.findOne({ _id: id, tenantId: toObjectId(tenantId), deletedAt: null }).lean();
    return doc ? toYwaEntryRow(doc as unknown as YwaEntryDoc) : null;
  }

  async findByIds(tenantIds: string[], id: string): Promise<YwaEntryRow | null> {
    const doc = await YwaEntryModel.findOne({ _id: id, tenantId: { $in: tenantIds.map((t) => toObjectId(t)) }, deletedAt: null }).lean();
    return doc ? toYwaEntryRow(doc as unknown as YwaEntryDoc) : null;
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<YwaEntryRow | null> {
    const doc = await YwaEntryModel.findOneAndUpdate(
      { _id: id, tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toYwaEntryRow(doc as unknown as YwaEntryDoc) : null;
  }

  async findDuplicate(tenantId: string, registerYear: string, residentId: string | null, fullName: string): Promise<YwaEntryRow | null> {
    const query: Record<string, unknown> = { tenantId: toObjectId(tenantId), registerYear, deletedAt: null };
    if (residentId) {
      query.$or = [
        { residentId: toObjectId(residentId) },
        { fullName: { $regex: `^${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ];
    } else if (fullName.trim()) {
      query.fullName = { $regex: `^${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    } else {
      return null;
    }
    const doc = await YwaEntryModel.findOne(query).sort({ createdAt: -1 }).lean();
    return doc ? toYwaEntryRow(doc as unknown as YwaEntryDoc) : null;
  }
}

export default YwaRepository;