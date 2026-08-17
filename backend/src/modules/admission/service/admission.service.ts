import type { FastifyInstance, FastifyRequest } from 'fastify';
import AdmissionRepository, { type AdmissionRow } from '../repository/admission.repository.js';
import { encryptAadhaar, maskAadhaar, decryptAadhaar } from './aadhaar-crypto.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { SettingModel } from '../../settings/entity/setting.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { OCCUPATION_STATUSES, type Relative } from '../entity/admission.entity.js';
import { randomUUID } from 'node:crypto';

const ADMISSION_STATUSES = ['DRAFT', 'SUBMITTED', 'PENDING_REVIEW', 'RECOMMENDED', 'NOT_RECOMMENDED', 'APPROVED', 'REJECTED', 'QUERY_RAISED'] as const;
type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

export const COMMITTEE_ROLE_DEFAULTS = [
  'District Collector / Representative',
  'District Social Welfare Officer',
  'President/Secretary of the Old Age Home',
  'District Health Officer / District Surgeon',
  'Manager of the Old Age Home',
];

export interface FinancialRules {
  annualIncomeThreshold: number;
  monthlyFee: number;
}

async function getFinancialRules(): Promise<FinancialRules> {
  const row = await SettingModel.findOne({ scope: 'government', group: 'admission-finance', key: 'eligibility-rules' }).lean();
  const value = row?.value as { annualIncomeThreshold?: number; monthlyFee?: number } | undefined;
  return {
    annualIncomeThreshold: Number(value?.annualIncomeThreshold ?? 12000),
    monthlyFee: Number(value?.monthlyFee ?? 500),
  };
}

async function getCommitteeRoles(): Promise<string[]> {
  const row = await SettingModel.findOne({ scope: 'government', group: 'admission-committee', key: 'roles' }).lean();
  const value = row?.value as string[] | undefined;
  return Array.isArray(value) && value.length > 0 ? value : COMMITTEE_ROLE_DEFAULTS;
}

function digits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeRelative(v: unknown): { name: string; age: number | null; relation: string; phone: string } | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const name = String(o.name ?? '').trim();
  if (!name) return null;
  return {
    name,
    age: o.age === null || o.age === undefined || o.age === '' ? null : Number(o.age),
    relation: String(o.relation ?? ''),
    phone: String(o.phone ?? ''),
  };
}

function normalizeRelativeArray(v: unknown, max: number): Relative[] {
  if (!Array.isArray(v)) return [];
  const items = v.map(normalizeRelative).filter((r): r is { name: string; age: number | null; relation: string; phone: string } => r !== null);
  if (items.length > max) throw new ValidationError(`too many relatives: maximum ${max} allowed`);
  return items as Relative[];
}

function validatePersonal(body: Record<string, unknown>): void {
  if (!body.name || !String(body.name).trim()) throw new ValidationError('name is required');
  const name = String(body.name).trim();
  if (name.length > 200) throw new ValidationError('name too long');
  const age = body.currentAge === null || body.currentAge === undefined || body.currentAge === '' ? null : Number(body.currentAge);
  if (age !== null) {
    if (!Number.isFinite(age) || age < 50 || age > 130) {
      throw new ValidationError('currentAge must be a numeric age between 50 and 130');
    }
  }
  if (body.phone && !/^[6-9]\d{9}$/.test(String(body.phone))) {
    throw new ValidationError('phone must be a valid 10-digit Indian mobile number');
  }
  if (body.idProofNumber && String(body.idProofNumber).length > 50) throw new ValidationError('idProofNumber too long');
}

function validateRelatives(body: Record<string, unknown>): void {
  for (const key of ['husband', 'wife']) {
    const rel = normalizeRelative(body[key]);
    if (rel && !/^[6-9]\d{9}$/.test(rel.phone)) throw new ValidationError(`${key}.phone must be a valid 10-digit Indian mobile number`);
  }
  const check = (items: Relative[], label: string): void => {
    for (const r of items) {
      if (r.phone && !/^[6-9]\d{9}$/.test(r.phone)) throw new ValidationError(`${label} phone must be a valid 10-digit Indian mobile number`);
    }
  };
  check(normalizeRelativeArray(body.sonsDaughters, 4), 'sonsDaughters');
  check(normalizeRelativeArray(body.brothers, 4), 'brothers');
}

export class AdmissionService {
  constructor(private readonly repo: AdmissionRepository = new AdmissionRepository()) {}

  private maskForResponse(row: AdmissionRow, canReadFullAadhaar: boolean): Record<string, unknown> {
    const { aadhaarEnc, aadhaarLast4, ...rest } = row;
    return {
      ...rest,
      aadhaar: canReadFullAadhaar ? (aadhaarLast4 ? `XXXX-XXXX-${aadhaarLast4}` : maskAadhaar(aadhaarEnc, aadhaarLast4)) : maskAadhaar(aadhaarEnc, aadhaarLast4),
      aadhaarLast4,
    };
  }

  private canReadFullAadhaar(req: FastifyRequest): boolean {
    const su = req.sessionUser;
    if (!su) return false;
    if (su.tier === 'government') return true;
    if (su.tier === 'institution') {
      return su.role === 'institution-head' || su.role === 'assistant-manager';
    }
    return false;
  }

  async getMeta(): Promise<{ financialRules: FinancialRules; committeeRoles: string[]; statuses: readonly string[]; occupationStatuses: readonly string[] }> {
    const [financialRules, committeeRoles] = await Promise.all([getFinancialRules(), getCommitteeRoles()]);
    return { financialRules, committeeRoles, statuses: ADMISSION_STATUSES, occupationStatuses: OCCUPATION_STATUSES };
  }

  async list(req: FastifyRequest, page: number, pageSize: number, status?: string): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const canReadFull = this.canReadFullAadhaar(req);
    const result = await this.repo.list(tenantId, page, pageSize, status);
    return { items: result.items.map((r) => this.maskForResponse(r, canReadFull)), total: result.total };
  }

  async getById(req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundError('admission application not found');
    return this.maskForResponse(row, this.canReadFullAadhaar(req));
  }

  async createDraft(req: FastifyRequest, body: Record<string, unknown>): Promise<AdmissionRow> {
    const tenantId = assertTenantWriteAccess(req);
    const aadhaarRaw = digits(body.aadhaar);
    if (aadhaarRaw && !/^\d{12}$/.test(aadhaarRaw)) throw new ValidationError('aadhaar must be a 12-digit number');
    const encrypted = aadhaarRaw ? encryptAadhaar(aadhaarRaw) : { enc: '', last4: '' };
    const name = String(body.name ?? '').trim();
    if (!name) throw new ValidationError('name is required');

    const { aadhaar, phone, currentAge, ...rest } = body;
    const { number } = await this.repo.nextApplicationNumber(tenantId);

    const input: Record<string, unknown> = {
      ...rest,
      tenantId,
      applicationNumber: number,
      name,
      currentAge: currentAge === null || currentAge === undefined || currentAge === '' ? null : Number(currentAge),
      aadhaarEnc: encrypted.enc,
      aadhaarLast4: encrypted.last4,
      status: 'DRAFT',
      createdBy: req.sessionUser!.userId,
      submissionId: randomUUID(),
    };
    return this.repo.create(input);
  }

  async updateDraft(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<AdmissionRow> {
    const tenantId = assertTenantWriteAccess(req);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('admission application not found');
    if (existing.status !== 'DRAFT' && existing.status !== 'QUERY_RAISED') {
      throw new ValidationError('submitted applications cannot be modified directly; corrections follow the configured workflow');
    }

    const set: Record<string, unknown> = {};
    const allowedKeys: (keyof AdmissionRow)[] = [
      'name', 'fatherName', 'husbandName', 'surname', 'caste', 'religion', 'address', 'village', 'taluka', 'district', 'admissionDate',
      'currentAge', 'idProofNumber', 'occupationStatus', 'husband', 'wife', 'sonsDaughters', 'brothers',
      'annualIncome', 'freeAdmissionRequested', 'paidAdmission', 'monthlyFeeAcceptance',
      'dailyActivitiesSelf', 'noInfectiousDisease', 'rulesAccepted', 'noSubstanceAddiction',
      'govRuleReference', 'recreationalActivities', 'femaleRoomAvailable',
      'photoUrl', 'signatureMethod', 'signatureUrl', 'thumbImpressionUrl', 'signatureCapturedAt', 'signatureDevice',
      'finalDeclarationAccepted',
    ];
    for (const key of allowedKeys) {
      if (key in body) set[key] = body[key];
    }

    if ('name' in set) {
      const name = String(set.name ?? '').trim();
      if (!name) throw new ValidationError('name is required');
      set.name = name;
    }
    if ('currentAge' in set) {
      set.currentAge = set.currentAge === null || set.currentAge === '' ? null : Number(set.currentAge);
    }
    if ('aadhaar' in body) {
      const aadhaarRaw = digits(body.aadhaar);
      if (aadhaarRaw && !/^\d{12}$/.test(aadhaarRaw)) throw new ValidationError('aadhaar must be a 12-digit number');
      const encrypted = aadhaarRaw ? encryptAadhaar(aadhaarRaw) : { enc: '', last4: '' };
      set.aadhaarEnc = encrypted.enc;
      set.aadhaarLast4 = encrypted.last4;
    }
    if ('husband' in body) set.husband = normalizeRelative(body.husband);
    if ('wife' in body) set.wife = normalizeRelative(body.wife);
    if ('sonsDaughters' in body) set.sonsDaughters = normalizeRelativeArray(body.sonsDaughters, 4);
    if ('brothers' in body) set.brothers = normalizeRelativeArray(body.brothers, 4);
    if ('recreationalActivities' in body) {
      set.recreationalActivities = Array.isArray(body.recreationalActivities) ? body.recreationalActivities.map(String).filter(Boolean) : [];
    }

    validatePersonal({ ...existing, ...set } as Record<string, unknown>);
    validateRelatives(set);

    set.updatedBy = req.sessionUser!.userId;
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('admission application not found');
    return updated;
  }

  async submit(req: FastifyRequest, id: string): Promise<AdmissionRow> {
    const tenantId = assertTenantWriteAccess(req);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('admission application not found');
    if (existing.status === 'SUBMITTED' || existing.status === 'PENDING_REVIEW' || existing.status === 'RECOMMENDED' || existing.status === 'NOT_RECOMMENDED' || existing.status === 'APPROVED' || existing.status === 'REJECTED') {
      throw new ValidationError('application already submitted');
    }
    if (!existing.name) throw new ValidationError('name is required');
    if (!existing.rulesAccepted) throw new ValidationError('declaration accepting rules and conditions is mandatory before submission');
    if (!existing.finalDeclarationAccepted) throw new ValidationError('final truth declaration must be acknowledged before submission');
    if (existing.currentAge === null) throw new ValidationError('currentAge is required');
    if (existing.district && !(await MasterDataModel.findOne({ catalog: 'district', code: existing.district }))) {
      throw new ValidationError('district must be selected from official master data');
    }
    if (existing.taluka && !(await MasterDataModel.findOne({ catalog: 'taluka', code: existing.taluka, parentCode: existing.district || undefined }))) {
      throw new ValidationError('taluka must be selected from official master data for the chosen district');
    }
    if (existing.village && !(await MasterDataModel.findOne({ catalog: 'village', code: existing.village, parentCode: existing.taluka || undefined }))) {
      throw new ValidationError('village must be selected from official master data for the chosen taluka');
    }

    const updated = await this.repo.update(tenantId, id, {
      status: 'SUBMITTED',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('admission application not found');
    return updated;
  }

  async committeeDecision(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<AdmissionRow> {
    const su = req.sessionUser;
    if (!su || su.tier !== 'institution' || (su.role !== 'institution-head' && su.role !== 'assistant-manager')) {
      throw new ForbiddenError('only institution head or assistant manager can record committee decisions');
    }
    const tenantId = assertTenantWriteAccess(req);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('admission application not found');
    if (existing.status !== 'SUBMITTED' && existing.status !== 'PENDING_REVIEW') {
      throw new ValidationError('committee decision requires a submitted application');
    }

    const recommendation = String(body.recommendation ?? '');
    if (recommendation !== 'recommended' && recommendation !== 'not-recommended') {
      throw new ValidationError('recommendation must be recommended or not-recommended');
    }
    const category = String(body.admissionCategory ?? '');
    if (recommendation === 'recommended' && category !== 'free' && category !== 'paid') {
      throw new ValidationError('admissionCategory must be free or paid when recommended');
    }

    const roles = await getCommitteeRoles();
    const committee = Array.isArray(body.committee) ? body.committee : [];
    const sanitizedCommittee = committee.map((c: unknown) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        role: String(o.role ?? ''),
        memberName: String(o.memberName ?? ''),
        comment: String(o.comment ?? ''),
        decision: String(o.decision ?? ''),
        signatureUrl: String(o.signatureUrl ?? ''),
        reviewedAt: o.reviewedAt ? new Date(String(o.reviewedAt)) : null,
      };
    });
    if (sanitizedCommittee.some((c: { role: string }) => c.role && !roles.includes(c.role))) {
      throw new ValidationError('committee member role must be one of the configured government roles');
    }

    const decision = {
      recommendation,
      admissionCategory: recommendation === 'recommended' ? category : null,
      remarks: String(body.remarks ?? ''),
      decisionDate: new Date(),
      decidedBy: su.userId,
    };

    const set: Record<string, unknown> = {
      committee: sanitizedCommittee,
      committeeDecision: decision,
      status: recommendation === 'recommended' ? 'RECOMMENDED' : 'NOT_RECOMMENDED',
      reviewedBy: su.userId,
    };
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('admission application not found');
    return updated;
  }

  async approve(_app: FastifyInstance, req: FastifyRequest, id: string): Promise<AdmissionRow> {
    const su = req.sessionUser;
    if (!su || su.tier !== 'institution' || (su.role !== 'institution-head' && su.role !== 'assistant-manager')) {
      throw new ForbiddenError('only institution head or assistant manager can approve admissions');
    }
    const tenantId = assertTenantWriteAccess(req);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('admission application not found');
    if (existing.status !== 'RECOMMENDED') throw new ValidationError('only recommended applications can be approved');

    const updated = await this.repo.update(tenantId, id, {
      status: 'APPROVED',
      approvedBy: su.userId,
      approvalDate: new Date(),
    });
    if (!updated) throw new NotFoundError('admission application not found');
    return updated;
  }

  async reject(req: FastifyRequest, id: string, reason: string): Promise<AdmissionRow> {
    const su = req.sessionUser;
    if (!su || su.tier !== 'institution' || (su.role !== 'institution-head' && su.role !== 'assistant-manager')) {
      throw new ForbiddenError('only institution head or assistant manager can reject admissions');
    }
    const tenantId = assertTenantWriteAccess(req);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('admission application not found');
    if (!reason || !String(reason).trim()) throw new ValidationError('rejection reason required');
    const updated = await this.repo.update(tenantId, id, {
      status: 'REJECTED',
      reviewedBy: su.userId,
      changes: [
        ...existing.changes,
        { field: 'status', previousValue: existing.status, newValue: 'REJECTED', reason: String(reason).trim(), changedBy: su.userId, changedAt: new Date() },
      ],
    });
    if (!updated) throw new NotFoundError('admission application not found');
    return updated;
  }

  async raiseQuery(req: FastifyRequest, id: string, reason: string): Promise<AdmissionRow> {
    const su = req.sessionUser;
    if (!su || su.tier !== 'institution' || (su.role !== 'institution-head' && su.role !== 'assistant-manager')) {
      throw new ForbiddenError('only institution head or assistant manager can raise queries');
    }
    const tenantId = assertTenantWriteAccess(req);
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('admission application not found');
    if (!reason || !String(reason).trim()) throw new ValidationError('query reason required');
    const updated = await this.repo.update(tenantId, id, {
      status: 'QUERY_RAISED',
      reviewedBy: su.userId,
      changes: [
        ...existing.changes,
        { field: 'status', previousValue: existing.status, newValue: 'QUERY_RAISED', reason: String(reason).trim(), changedBy: su.userId, changedAt: new Date() },
      ],
    });
    if (!updated) throw new NotFoundError('admission application not found');
    return updated;
  }

  async getAadhaarFull(req: FastifyRequest, id: string): Promise<string> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    if (!this.canReadFullAadhaar(req)) throw new ForbiddenError('explicit permission required to view full Aadhaar number');
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundError('admission application not found');
    const plain = decryptAadhaar(row.aadhaarEnc);
    if (!plain) throw new ValidationError('no aadhaar on record');
    return plain;
  }
}

export default AdmissionService;
