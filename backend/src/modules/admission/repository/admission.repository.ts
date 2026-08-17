import { AdmissionModel, AdmissionCounterModel, type AdmissionDoc } from '../entity/admission.entity.js';

export interface AdmissionRow {
  id: string;
  tenantId: string;
  applicationNumber: string;
  status: string;
  name: string;
  gender: string | null;
  fatherName: string;
  spouseName: string;
  surname: string;
  caste: string;
  religion: string;
  address: string;
  village: string;
  taluka: string;
  district: string;
  admissionDate: Date | null;
  currentAge: number | null;
  idProofNumber: string;
  aadhaarEnc: string;
  aadhaarLast4: string;
  occupationStatus: string | null;
  husband: unknown | null;
  wife: unknown | null;
  sonsDaughters: unknown[];
  brothers: unknown[];
  annualIncome: number | null;
  freeAdmissionRequested: boolean;
  paidAdmission: boolean;
  monthlyFeeAcceptance: boolean;
  dailyActivitiesSelf: boolean;
  noInfectiousDisease: boolean;
  rulesAccepted: boolean;
  noSubstanceAddiction: boolean;
  govRuleReference: string;
  recreationalActivities: string[];
  femaleRoomAvailable: boolean | null;
  photoUrl: string;
  photoVerificationStatus: string;
  photoUploadedAt: Date | null;
  photoUploadedBy: string | null;
  signatureMethod: string;
  signatureUrl: string;
  thumbImpressionUrl: string;
  signatureCapturedAt: Date | null;
  signatureDevice: string;
  signatureCapturedBy: string | null;
  finalDeclarationAccepted: boolean;
  submissionId: string;
  committee: unknown[];
  committeeDecision: unknown | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null;
  approvedBy: string | null;
  approvalDate: Date | null;
  residentId: string | null;
  changes: unknown[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toAdmissionRow(doc: AdmissionDoc): AdmissionRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    applicationNumber: doc.applicationNumber,
    status: doc.status,
    name: doc.name,
    gender: doc.gender ?? null,
    fatherName: doc.fatherName,
    spouseName: doc.spouseName,
    surname: doc.surname,
    caste: doc.caste,
    religion: doc.religion,
    address: doc.address,
    village: doc.village,
    taluka: doc.taluka,
    district: doc.district,
    admissionDate: doc.admissionDate ?? null,
    currentAge: doc.currentAge ?? null,
    idProofNumber: doc.idProofNumber,
    aadhaarEnc: doc.aadhaarEnc,
    aadhaarLast4: doc.aadhaarLast4,
    occupationStatus: doc.occupationStatus ?? null,
    husband: doc.husband ?? null,
    wife: doc.wife ?? null,
    sonsDaughters: doc.sonsDaughters ?? [],
    brothers: doc.brothers ?? [],
    annualIncome: doc.annualIncome ?? null,
    freeAdmissionRequested: Boolean(doc.freeAdmissionRequested),
    paidAdmission: Boolean(doc.paidAdmission),
    monthlyFeeAcceptance: Boolean(doc.monthlyFeeAcceptance),
    dailyActivitiesSelf: Boolean(doc.dailyActivitiesSelf),
    noInfectiousDisease: Boolean(doc.noInfectiousDisease),
    rulesAccepted: Boolean(doc.rulesAccepted),
    noSubstanceAddiction: Boolean(doc.noSubstanceAddiction),
    govRuleReference: doc.govRuleReference,
    recreationalActivities: doc.recreationalActivities ?? [],
    femaleRoomAvailable: doc.femaleRoomAvailable ?? null,
    photoUrl: doc.photoUrl,
    photoVerificationStatus: doc.photoVerificationStatus,
    photoUploadedAt: doc.photoUploadedAt ?? null,
    photoUploadedBy: doc.photoUploadedBy ? doc.photoUploadedBy.toString() : null,
    signatureMethod: doc.signatureMethod,
    signatureUrl: doc.signatureUrl,
    thumbImpressionUrl: doc.thumbImpressionUrl,
    signatureCapturedAt: doc.signatureCapturedAt ?? null,
    signatureDevice: doc.signatureDevice,
    signatureCapturedBy: doc.signatureCapturedBy ? doc.signatureCapturedBy.toString() : null,
    finalDeclarationAccepted: Boolean(doc.finalDeclarationAccepted),
    submissionId: doc.submissionId,
    committee: doc.committee ?? [],
    committeeDecision: doc.committeeDecision ?? null,
    submittedBy: doc.submittedBy ? doc.submittedBy.toString() : null,
    submittedAt: doc.submittedAt ?? null,
    reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : null,
    approvedBy: doc.approvedBy ? doc.approvedBy.toString() : null,
    approvalDate: doc.approvalDate ?? null,
    residentId: doc.residentId ? doc.residentId.toString() : null,
    changes: doc.changes ?? [],
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class AdmissionRepository {
  async nextApplicationNumber(tenantId: string): Promise<{ number: string; year: number; seq: number }> {
    const year = new Date().getFullYear();
    const counter = await AdmissionCounterModel.findOneAndUpdate(
      { tenantId, year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return { number: `ADM${year}-${String(seq).padStart(6, '0')}`, year, seq };
  }

  async create(input: Record<string, unknown>): Promise<AdmissionRow> {
    const doc = await AdmissionModel.create(input);
    return toAdmissionRow(doc.toObject() as AdmissionDoc);
  }

  async list(tenantId: string, page: number, pageSize: number, status?: string): Promise<{ items: AdmissionRow[]; total: number }> {
    const filter: Record<string, unknown> = { tenantId, deletedAt: null };
    if (status) filter.status = status;
    const [docs, total] = await Promise.all([
      AdmissionModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      AdmissionModel.countDocuments(filter),
    ]);
    return { items: docs.map((d) => toAdmissionRow(d as unknown as AdmissionDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<AdmissionRow | null> {
    const doc = await AdmissionModel.findOne({ _id: id, tenantId, deletedAt: null }).lean();
    return doc ? toAdmissionRow(doc as unknown as AdmissionDoc) : null;
  }

  async update(tenantId: string, id: string, set: Record<string, unknown>): Promise<AdmissionRow | null> {
    const doc = await AdmissionModel.findOneAndUpdate(
      { _id: id, tenantId, deletedAt: null },
      { $set: set },
      { new: true },
    ).lean();
    return doc ? toAdmissionRow(doc as unknown as AdmissionDoc) : null;
  }
}

export default AdmissionRepository;
