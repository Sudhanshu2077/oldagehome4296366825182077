import type { FastifyInstance, FastifyRequest } from 'fastify';
import { model as mongooseModel, type Document } from 'mongoose';
import YwaRepository, { type YwaEntryRow } from '../repository/yearwise-admission.repository.js';
import { encryptAadhaar, maskAadhaar, decryptAadhaar } from '../../admission/service/aadhaar-crypto.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { YWA_STATUSES, YWA_EDITABLE_FIELDS, YWA_SIGNATURE_TYPES, type YwaField } from '../entity/yearwise-admission.entity.js';

export interface YwaHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface YwaMeta {
  header: YwaHeader;
  statuses: readonly string[];
  signatureTypes: readonly string[];
  editableFields: readonly string[];
  years: string[];
  defaultYear: string;
  residents: { id: string; residentNumber: string; fullName: string; gender: string; photoUrl: string; aadhaarLast4: string }[];
}

function defaultYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

function normalizeYear(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return defaultYear();
  if (/^\d{4}$/.test(s)) return `${s}-${String((Number(s) + 1) % 100).padStart(2, '0')}`;
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  throw new ValidationError('registerYear must be a year like 2026-27');
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${String(v)}`);
  return d;
}

function digits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function escapeCsv(v: unknown): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function escapeXml(v: unknown): string {
  return String(v ?? '').replace(/[<>&]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[m] as string);
}

function fmtDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.slice(0, 10);
}

export class YwaService {
  constructor(private readonly repo: YwaRepository = new YwaRepository()) {}

  private canWrite(req: FastifyRequest): boolean {
    const su = req.sessionUser;
    if (!su || su.tier !== 'institution') return false;
    return su.role === 'assistant-manager' || su.role === 'department-user';
  }

  private canReview(req: FastifyRequest): boolean {
    const su = req.sessionUser;
    if (!su || su.tier !== 'institution') return false;
    return su.role === 'institution-head' || su.role === 'assistant-manager';
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

  private maskForResponse(row: YwaEntryRow, canReadFull: boolean): Record<string, unknown> {
    const { aadhaarEnc, ...rest } = row;
    const aadhaarMasked = maskAadhaar(aadhaarEnc, row.aadhaarLast4);
    return { ...rest, aadhaar: aadhaarMasked, aadhaarMasked, aadhaarReadable: canReadFull && Boolean(aadhaarEnc) };
  }

  private async resolveHeader(req: FastifyRequest): Promise<YwaHeader> {
    const tenantId = resolvedTenantId(req);
    const header: YwaHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
    if (!tenantId) return header;
    const institution = await InstitutionModel.findById(tenantId).lean();
    if (!institution) return header;
    header.officeName = institution.name;
    header.officeNameMr = institution.nameMr || institution.name;
    const [taluka, district] = await Promise.all([
      institution.talukaId ? MasterDataModel.findById(institution.talukaId).lean() : null,
      institution.districtId ? MasterDataModel.findById(institution.districtId).lean() : null,
    ]);
    if (taluka) header.talukaName = taluka.nameMr || taluka.name;
    if (district) header.districtName = district.nameMr || district.name;
    return header;
  }

  private async scopedTenantIds(req: FastifyRequest): Promise<string[]> {
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError();
    if (su.tier === 'institution') {
      if (!su.tenantId) throw new ForbiddenError('tenant scope required');
      return [su.tenantId];
    }
    if (su.tier === 'government') {
      if (!su.jurisdiction) throw new ForbiddenError('jurisdiction scope required');
      const filter: Record<string, unknown> = {};
      if (su.jurisdiction.level === 'all') {
        return (await InstitutionModel.find().select('_id').lean()).map((d) => String(d._id));
      }
      if (su.jurisdiction.stateId) filter.stateId = su.jurisdiction.stateId;
      if (su.jurisdiction.regionId && ['region', 'district', 'taluka'].includes(su.jurisdiction.level)) filter.regionId = su.jurisdiction.regionId;
      if (su.jurisdiction.districtId && ['district', 'taluka'].includes(su.jurisdiction.level)) filter.districtId = su.jurisdiction.districtId;
      if (su.jurisdiction.talukaId && su.jurisdiction.level === 'taluka') filter.talukaId = su.jurisdiction.talukaId;
      return (await InstitutionModel.find(filter).select('_id').lean()).map((d) => String(d._id));
    }
    throw new ForbiddenError('year-wise admission register access denied');
  }

  private async loadResidents(tenantId: string): Promise<{ id: string; residentNumber: string; fullName: string; gender: string; photoUrl: string; aadhaarLast4: string }[]> {
    try {
      const ErpResidents = mongooseModel<Document>('Erp_residents');
      const docs = await ErpResidents.find({ tenantId, deletedAt: null, status: 'active' }).sort({ fullName: 1 }).limit(2000).lean();
      return docs.map((d) => {
        const r = d as unknown as Record<string, unknown>;
        const aadhaarRaw = String(r.aadhaar ?? '');
        return {
          id: String(r._id),
          residentNumber: String(r.residentNumber ?? ''),
          fullName: String(r.fullName ?? ''),
          gender: String(r.gender ?? ''),
          photoUrl: String(r.photoUrl ?? ''),
          aadhaarLast4: aadhaarRaw.replace(/\D/g, '').slice(-4),
        };
      });
    } catch {
      return [];
    }
  }

  async getMeta(req: FastifyRequest): Promise<YwaMeta> {
    const tenantId = resolvedTenantId(req);
    const years = tenantId ? await this.repo.listDistinctYears(tenantId) : [];
    if (tenantId && !years.includes(defaultYear())) {
      years.unshift(defaultYear());
    }
    const residents = tenantId ? await this.loadResidents(tenantId) : [];
    return {
      header: await this.resolveHeader(req),
      statuses: YWA_STATUSES,
      signatureTypes: YWA_SIGNATURE_TYPES,
      editableFields: YWA_EDITABLE_FIELDS,
      years,
      defaultYear: defaultYear(),
      residents,
    };
  }

  async list(req: FastifyRequest, page: number, pageSize: number, query: Record<string, unknown>) {
    const tenantIds = await this.scopedTenantIds(req);
    const canReadFull = this.canReadFullAadhaar(req);
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (from && to && from.getTime() > to.getTime()) {
      throw new ValidationError('from must be before or equal to to');
    }
    const filter: Record<string, unknown> = {};
    if (query.registerYear) filter.registerYear = String(query.registerYear);
    if (query.status) filter.status = String(query.status);
    if (query.residentName) filter.residentName = String(query.residentName);
    if (query.residentId) filter.residentId = String(query.residentId);
    if (query.search) filter.search = String(query.search);
    if (from) filter.from = from;
    if (to) filter.to = to;
    const result = await this.repo.list(tenantIds, filter as never, page, pageSize);
    return { ...result, items: result.items.map((r) => this.maskForResponse(r, canReadFull)) };
  }

  async getById(req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('year-wise admission entry not found');
    return this.maskForResponse(row, this.canReadFullAadhaar(req));
  }

  async getAadhaarFull(app: FastifyInstance, req: FastifyRequest, id: string): Promise<string> {
    const tenantIds = await this.scopedTenantIds(req);
    if (!this.canReadFullAadhaar(req)) throw new ForbiddenError('explicit permission required to view full Aadhaar number');
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('year-wise admission entry not found');
    const plain = decryptAadhaar(row.aadhaarEnc);
    if (!plain) throw new ValidationError('no aadhaar on record');
    await app.auditHook(req, 'aadhaar_accessed', 'yearwise-admission', id);
    return plain;
  }

  async createDraft(req: FastifyRequest, body: Record<string, unknown>): Promise<{ entry: Record<string, unknown>; duplicateWarning?: string }> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const registerYear = normalizeYear(body.registerYear);
    const requestedName = String(body.fullName ?? '').trim();
    if (!requestedName) throw new ValidationError('full name is required');
    const admissionDate = parseDate(body.admissionDate);
    if (!admissionDate) throw new ValidationError('admission date is required');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (admissionDate.getTime() > today.getTime()) {
      throw new ValidationError('admission date cannot be later than the current date');
    }

    let residentId = String(body.residentId ?? '').trim() || null;
    let residentNumber = String(body.residentNumber ?? '').trim();
    let fullName = requestedName;
    let birthDate = parseDate(body.birthDate);
    let birthYear = body.birthYear === null || body.birthYear === undefined || body.birthYear === '' ? null : Number(body.birthYear);
    let photoUrl = String(body.photoUrl ?? '').trim();
    let signatureUrl = String(body.signatureUrl ?? '').trim();
    let thumbImpressionUrl = String(body.thumbImpressionUrl ?? '').trim();
    let residentAadhaarLast4 = '';

    if (residentId) {
      try {
        const ErpResidents = mongooseModel<Document>('Erp_residents');
        const resident = await ErpResidents.findOne({ _id: residentId, tenantId, deletedAt: null }).lean();
        if (resident) {
          const r = resident as unknown as Record<string, unknown>;
          residentNumber = residentNumber || String(r.residentNumber ?? '');
          fullName = String(r.fullName ?? '') || fullName;
          if (birthDate === null && birthYear === null) {
            const dob = r.dob ? new Date(String(r.dob)) : null;
            if (dob && !Number.isNaN(dob.getTime())) birthDate = dob;
            else if (r.age !== null && r.age !== undefined) birthYear = Number(r.age) > 0 ? new Date().getFullYear() - Number(r.age) : null;
          }
          photoUrl = photoUrl || String(r.photoUrl ?? '');
          signatureUrl = signatureUrl || String(r.digitalSignatureUrl ?? '');
          residentAadhaarLast4 = String(r.aadhaar ?? '').replace(/\D/g, '').slice(-4);
        }
      } catch {
        residentId = null;
      }
    }

    const aadhaarRaw = digits(body.aadhaar) || '';
    const aadhaarDigits = aadhaarRaw || (residentAadhaarLast4 ? '' : '');
    if (aadhaarDigits && !/^\d{12}$/.test(aadhaarDigits)) throw new ValidationError('aadhaar must be a 12-digit number');
    const encrypted = aadhaarDigits ? encryptAadhaar(aadhaarDigits) : { enc: '', last4: residentAadhaarLast4 || '' };

    const duplicate = await this.repo.findDuplicate(tenantId, registerYear, residentId, fullName);
    const duplicateWarning = duplicate ? 'Possible duplicate resident/admission record found.' : undefined;

    const { entryNumber } = await this.repo.nextEntryNumber(tenantId, registerYear);
    const entry = await this.repo.create({
      tenantId,
      registerYear,
      entryNumber,
      status: 'DRAFT',
      residentId,
      residentNumber,
      fullName,
      birthDate,
      birthYear,
      aadhaarEnc: encrypted.enc,
      aadhaarLast4: encrypted.last4,
      signatureType: String(body.signatureType ?? 'none'),
      signatureUrl,
      thumbImpressionUrl,
      noSignatureReason: String(body.noSignatureReason ?? '').trim(),
      photoUrl,
      admissionDate,
      officerId: String(body.officerId ?? '').trim() || null,
      officerName: String(body.officerName ?? '').trim(),
      officerDesignation: String(body.officerDesignation ?? '').trim(),
      officerSignature: String(body.officerSignature ?? '').trim(),
      remarks: String(body.remarks ?? '').trim(),
      createdBy: req.sessionUser!.userId,
    });
    const result: { entry: Record<string, unknown>; duplicateWarning?: string } = { entry: this.maskForResponse(entry, false) };
    if (duplicateWarning) result.duplicateWarning = duplicateWarning;
    return result;
  }

  async updateDraft(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('year-wise admission entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be edited directly');

    const set: Record<string, unknown> = { updatedBy: req.sessionUser!.userId };
    if ('registerYear' in body) {
      const registerYear = normalizeYear(body.registerYear);
      if (registerYear !== existing.registerYear) {
        const { entryNumber } = await this.repo.nextEntryNumber(tenantId, registerYear);
        set.registerYear = registerYear;
        set.entryNumber = entryNumber;
      }
    }
    if ('residentId' in body) set.residentId = String(body.residentId ?? '').trim() || null;
    if ('residentNumber' in body) set.residentNumber = String(body.residentNumber ?? '').trim();
    if ('fullName' in body) {
      const fullName = String(body.fullName ?? '').trim();
      if (!fullName) throw new ValidationError('full name is required');
      set.fullName = fullName;
    }
    if ('birthDate' in body) set.birthDate = parseDate(body.birthDate);
    if ('birthYear' in body) set.birthYear = body.birthYear === null || body.birthYear === undefined || body.birthYear === '' ? null : Number(body.birthYear);
    if ('aadhaar' in body) {
      const aadhaarRaw = digits(body.aadhaar);
      if (aadhaarRaw && !/^\d{12}$/.test(aadhaarRaw)) throw new ValidationError('aadhaar must be a 12-digit number');
      const encrypted = aadhaarRaw ? encryptAadhaar(aadhaarRaw) : { enc: '', last4: existing.aadhaarLast4 };
      set.aadhaarEnc = encrypted.enc;
      set.aadhaarLast4 = encrypted.last4;
    }
    if ('signatureType' in body) {
      const st = String(body.signatureType ?? 'none');
      if (!YWA_SIGNATURE_TYPES.includes(st as (typeof YWA_SIGNATURE_TYPES)[number])) {
        throw new ValidationError(`signatureType must be one of ${YWA_SIGNATURE_TYPES.join(', ')}`);
      }
      set.signatureType = st;
    }
    if ('signatureUrl' in body) {
      set.signatureUrl = String(body.signatureUrl ?? '').trim();
      if (set.signatureUrl) {
        set.signatureCapturedBy = req.sessionUser!.userId;
        set.signatureCapturedAt = new Date();
      }
    }
    if ('thumbImpressionUrl' in body) set.thumbImpressionUrl = String(body.thumbImpressionUrl ?? '').trim();
    if ('noSignatureReason' in body) set.noSignatureReason = String(body.noSignatureReason ?? '').trim();
    if ('photoUrl' in body) {
      set.photoUrl = String(body.photoUrl ?? '').trim();
      if (set.photoUrl) {
        set.photoUploadedBy = req.sessionUser!.userId;
        set.photoUploadedAt = new Date();
      }
    }
    if ('admissionDate' in body) {
      const d = parseDate(body.admissionDate);
      if (!d) throw new ValidationError('admission date is required');
      set.admissionDate = d;
    }
    if ('officerId' in body) set.officerId = String(body.officerId ?? '').trim() || null;
    if ('officerName' in body) set.officerName = String(body.officerName ?? '').trim();
    if ('officerDesignation' in body) set.officerDesignation = String(body.officerDesignation ?? '').trim();
    if ('officerSignature' in body) {
      set.officerSignature = String(body.officerSignature ?? '').trim();
      if (set.officerSignature) {
        set.officerId = req.sessionUser!.userId;
        set.officerSignedAt = new Date();
      }
    }
    if ('remarks' in body) set.remarks = String(body.remarks ?? '').trim();

    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('year-wise admission entry not found');
    return this.maskForResponse(updated, this.canReadFullAadhaar(req));
  }

  async submit(app: FastifyInstance, req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('year-wise admission entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be submitted');
    if (!existing.fullName.trim() || !existing.admissionDate) {
      throw new ValidationError('full name and admission date are required before submission');
    }
    const updated = await this.repo.update(tenantId, id, {
      status: 'UNDER_REVIEW',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('year-wise admission entry not found');
    await app.auditHook(req, 'submit', 'yearwise-admission', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'yearwise-admission', action: 'submitted', entryId: id });
    return this.maskForResponse(updated, this.canReadFullAadhaar(req));
  }

  async approve(app: FastifyInstance, req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can approve year-wise admission entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('year-wise admission entry not found');
    if (existing.status !== 'UNDER_REVIEW') throw new ValidationError('only under-review entries can be approved');
    const updated = await this.repo.update(tenantId, id, {
      status: 'APPROVED',
      reviewedBy: req.sessionUser!.userId,
      reviewedAt: new Date(),
      approvedBy: req.sessionUser!.userId,
      approvedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('year-wise admission entry not found');
    await app.auditHook(req, 'approve', 'yearwise-admission', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'yearwise-admission', action: 'approved', entryId: id });
    return this.maskForResponse(updated, this.canReadFullAadhaar(req));
  }

  async finalize(app: FastifyInstance, req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can finalize year-wise admission entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('year-wise admission entry not found');
    if (existing.status !== 'APPROVED') throw new ValidationError('only approved entries can be finalized');
    const updated = await this.repo.update(tenantId, id, {
      status: 'FINALIZED',
      finalizedBy: req.sessionUser!.userId,
      finalizedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('year-wise admission entry not found');
    await app.auditHook(req, 'finalize', 'yearwise-admission', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'yearwise-admission', action: 'finalized', entryId: id });
    return this.maskForResponse(updated, this.canReadFullAadhaar(req));
  }

  async voidEntry(app: FastifyInstance, req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can void year-wise admission entries');
    const reason = String(body.reason ?? '').trim();
    if (!reason) throw new ValidationError('void reason is required');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('year-wise admission entry not found');
    if (existing.status === 'VOIDED') throw new ValidationError('entry is already voided');
    const changes = [
      ...(existing.changes as unknown[]),
      {
        field: 'status',
        previousValue: existing.status,
        newValue: 'VOIDED',
        reason,
        requestedBy: req.sessionUser!.userId,
        approvedBy: req.sessionUser!.userId,
        changedAt: new Date(),
      },
    ];
    const updated = await this.repo.update(tenantId, id, {
      status: 'VOIDED',
      voidedBy: req.sessionUser!.userId,
      voidedAt: new Date(),
      voidReason: reason,
      changes,
      updatedBy: req.sessionUser!.userId,
    });
    if (!updated) throw new NotFoundError('year-wise admission entry not found');
    await app.auditHook(req, 'void', 'yearwise-admission', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'yearwise-admission', action: 'voided', entryId: id });
    return this.maskForResponse(updated, this.canReadFullAadhaar(req));
  }

  async correct(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can correct year-wise admission entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('year-wise admission entry not found');
    if (existing.status !== 'FINALIZED') throw new ValidationError('only finalized entries follow the controlled correction workflow');
    const field = String(body.field ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!YWA_EDITABLE_FIELDS.includes(field as YwaField)) {
      throw new ValidationError(`field must be one of ${YWA_EDITABLE_FIELDS.join(', ')}`);
    }
    if (!reason) throw new ValidationError('reason for correction is required');

    let previousValue: unknown;
    let newValue: unknown;
    const set: Record<string, unknown> = { updatedBy: req.sessionUser!.userId };
    if (field === 'registerYear') {
      previousValue = existing.registerYear;
      const registerYear = normalizeYear(body.value);
      set.registerYear = registerYear;
      const { entryNumber } = await this.repo.nextEntryNumber(tenantId, registerYear);
      set.entryNumber = entryNumber;
      newValue = registerYear;
    } else if (field === 'birthDate' || field === 'admissionDate') {
      previousValue = existing[field];
      newValue = parseDate(body.value);
      set[field] = newValue;
    } else if (field === 'birthYear') {
      previousValue = existing.birthYear;
      newValue = body.value === null || body.value === undefined || body.value === '' ? null : Number(body.value);
      set.birthYear = newValue;
    } else if (field === 'aadhaar') {
      previousValue = existing.aadhaarLast4 ? `XXXX-XXXX-${existing.aadhaarLast4}` : '';
      const aadhaarRaw = digits(body.value);
      if (aadhaarRaw && !/^\d{12}$/.test(aadhaarRaw)) throw new ValidationError('aadhaar must be a 12-digit number');
      const encrypted = aadhaarRaw ? encryptAadhaar(aadhaarRaw) : { enc: '', last4: '' };
      set.aadhaarEnc = encrypted.enc;
      set.aadhaarLast4 = encrypted.last4;
      newValue = encrypted.last4 ? `XXXX-XXXX-${encrypted.last4}` : '';
    } else if (field === 'signatureType') {
      previousValue = existing.signatureType;
      const st = String(body.value ?? 'none');
      if (!YWA_SIGNATURE_TYPES.includes(st as (typeof YWA_SIGNATURE_TYPES)[number])) {
        throw new ValidationError(`signatureType must be one of ${YWA_SIGNATURE_TYPES.join(', ')}`);
      }
      set.signatureType = st;
      newValue = st;
    } else {
      previousValue = (existing as unknown as Record<string, unknown>)[field] ?? '';
      newValue = String(body.value ?? '');
      set[field] = newValue;
    }
    if (String(previousValue ?? '') === String(newValue ?? '')) {
      throw new ValidationError('no change detected; corrected value is identical');
    }
    const changes = [
      ...(existing.changes as unknown[]),
      {
        field,
        previousValue,
        newValue,
        reason,
        requestedBy: req.sessionUser!.userId,
        approvedBy: req.sessionUser!.userId,
        changedAt: new Date(),
      },
    ];
    set.changes = changes;
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('year-wise admission entry not found');
    return this.maskForResponse(updated, this.canReadFullAadhaar(req));
  }

  async history(req: FastifyRequest, id: string): Promise<{ audit: unknown[]; row: Record<string, unknown> }> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('year-wise admission entry not found');
    return { audit: row.changes ?? [], row: this.maskForResponse(row, this.canReadFullAadhaar(req)) };
  }

  private async exportRows(req: FastifyRequest, registerYear: string | undefined) {
    const tenantIds = await this.scopedTenantIds(req);
    const filter: Record<string, unknown> = {};
    if (registerYear) filter.registerYear = registerYear;
    const result = await this.repo.list(tenantIds, filter as never, 1, 100000);
    return result.items;
  }

  private registerTitle(): string {
    return 'वर्षनिहाय प्रवेश रजिस्टर / YEAR-WISE ADMISSION REGISTER';
  }

  async exportCsv(req: FastifyRequest, registerYear?: string): Promise<string> {
    const rows = await this.exportRows(req, registerYear);
    const header = ['entryNumber', 'srNo', 'fullName', 'dobYear', 'aadhaar', 'signatureType', 'photoUrl', 'admissionDate', 'officerName', 'officerDesignation', 'remarks', 'status'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    rows.forEach((row, i) => {
      const r = row as unknown as YwaEntryRow;
      lines.push([
        r.entryNumber,
        i + 1,
        r.fullName,
        r.birthDate ? fmtDate(r.birthDate) : (r.birthYear ? String(r.birthYear) : ''),
        maskAadhaar(r.aadhaarEnc, r.aadhaarLast4),
        r.signatureType,
        r.photoUrl,
        r.admissionDate ? fmtDate(r.admissionDate) : '',
        r.officerName,
        r.officerDesignation,
        r.remarks,
        r.status,
      ].map(escapeCsv).join(','));
    });
    return lines.join('\n');
  }

  async exportXlsx(req: FastifyRequest, registerYear?: string): Promise<{ buffer: Buffer; filename: string }> {
    const rows = await this.exportRows(req, registerYear);
    const header = ['Sr. No.', 'Full Name of Elderly Person', 'Date of Birth / Year', 'Aadhaar Number', 'Signature / Thumb Impression', 'Photograph', 'Admission Date', 'Officer Signature'];
    const data = rows.map((row, i) => {
      const r = row as unknown as YwaEntryRow;
      return [
        i + 1,
        r.fullName,
        r.birthDate ? fmtDate(r.birthDate) : (r.birthYear ? String(r.birthYear) : ''),
        maskAadhaar(r.aadhaarEnc, r.aadhaarLast4),
        r.signatureType === 'none' ? (r.noSignatureReason || '') : (r.signatureUrl ? 'Captured' : (r.thumbImpressionUrl ? 'Thumb' : r.signatureType)),
        r.photoUrl ? 'Photo' : '',
        r.admissionDate ? fmtDate(r.admissionDate) : '',
        r.officerName ? `${r.officerName}${r.officerSignature ? ` (signed)` : ''}` : '',
      ];
    });
    const xmlRows = [header, ...data].map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
    return { buffer: Buffer.from(sheet, 'utf-8'), filename: `yearwise-admission-${Date.now()}.xlsx` };
  }

  async exportPdf(req: FastifyRequest, registerYear?: string): Promise<{ html: string }> {
    const rows = await this.exportRows(req, registerYear);
    const header = await this.resolveHeader(req);
    const tableRows = rows.map((row, i) => {
      const r = row as unknown as YwaEntryRow;
      return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeXml(r.fullName)}</td>
        <td>${r.birthDate ? fmtDate(r.birthDate) : (r.birthYear ? String(r.birthYear) : '')}</td>
        <td>${escapeXml(maskAadhaar(r.aadhaarEnc, r.aadhaarLast4))}</td>
        <td>${r.signatureType === 'none' ? escapeXml(r.noSignatureReason || '') : (r.signatureUrl ? 'स्वाक्षरी / Signed' : (r.thumbImpressionUrl ? 'अंगठा / Thumb' : escapeXml(r.signatureType)))}</td>
        <td>${r.photoUrl ? 'फोटो / Photo' : ''}</td>
        <td>${r.admissionDate ? fmtDate(r.admissionDate) : ''}</td>
        <td>${escapeXml(r.officerName || '')}${r.officerSignature ? ' (✓)' : ''}</td>
      </tr>`;
    }).join('');
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 16px; }
        .heading { text-align: center; font-size: 14px; margin-bottom: 2px; }
        .register-name { text-align: center; font-size: 16px; font-weight: 700; margin: 4px 0; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 3px 4px; font-size: 9px; text-align: left; vertical-align: top; }
        th { background: #eee; }
        .small { font-size: 10px; }
      </style></head>
      <body>
        <div class="heading">${escapeXml(header.officeNameMr || header.officeName)}</div>
        <div class="sub">${header.districtName ? `जि. ${escapeXml(header.districtName)}` : ''} ${header.talukaName ? `| ता. ${escapeXml(header.talukaName)}` : ''}</div>
        <div class="register-name">${this.registerTitle()}</div>
        <div class="sub">वर्ष: ${escapeXml(registerYear ?? '')} | शासन मान्य</div>
        <table>
          <thead><tr>
            <th>अ. क्र.</th><th>वृद्धाचे संपूर्ण नाव</th><th>जन्म दिनांक / वर्ष</th><th>आधार प्रमाण क्रमांक</th><th>सही व अंगठा</th><th>फोटो</th><th>प्रवेश दिनांक</th><th>अधिकारी सही</th>
          </tr></thead>
          <tbody>${tableRows || '<tr><td colspan="8" style="text-align:center">No entries</td></tr>'}</tbody>
        </table>
      </body></html>
    `;
    return { html };
  }
}

