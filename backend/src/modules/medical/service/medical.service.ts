import type { FastifyInstance, FastifyRequest } from 'fastify';
import { model as mongooseModel, type Document } from 'mongoose';
import MedicalRepository, { type MedicalEntryRow } from '../repository/medical.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { MEDICAL_STATUSES, MEDICAL_EDITABLE_FIELDS, type MedicalField } from '../entity/medical-entry.entity.js';

export interface MedicalHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface MedicalMeta {
  header: MedicalHeader;
  statuses: readonly string[];
  editableFields: readonly string[];
  year: number;
  sourceFlaggedColumns: string[];
  residents: { id: string; residentNumber: string; fullName: string; gender: string }[];
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${String(v)}`);
  return d;
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

export class MedicalService {
  constructor(private readonly repo: MedicalRepository = new MedicalRepository()) {}

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

  private async resolveHeader(req: FastifyRequest): Promise<MedicalHeader> {
    const tenantId = resolvedTenantId(req);
    const header: MedicalHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
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
    throw new ForbiddenError('medical register access denied');
  }

  async getMeta(req: FastifyRequest): Promise<MedicalMeta> {
    const now = new Date();
    const tenantId = resolvedTenantId(req);
    const residents: { id: string; residentNumber: string; fullName: string; gender: string }[] = [];
    if (tenantId) {
      try {
        const ErpResidents = mongooseModel<Document>('Erp_residents');
        const docs = await ErpResidents.find({ tenantId, deletedAt: null, status: 'active' }).sort({ fullName: 1 }).limit(2000).lean();
        residents.push(...docs.map((d) => {
          const r = d as unknown as Record<string, unknown>;
          return {
            id: String(r._id),
            residentNumber: String(r.residentNumber ?? ''),
            fullName: String(r.fullName ?? ''),
            gender: String(r.gender ?? ''),
          };
        }));
      } catch {
        // residents collection may not exist yet; empty list is fine
      }
    }
    return {
      header: await this.resolveHeader(req),
      statuses: MEDICAL_STATUSES,
      editableFields: MEDICAL_EDITABLE_FIELDS,
      year: now.getFullYear(),
      sourceFlaggedColumns: ['medicineAllowances'],
      residents,
    };
  }

  async list(req: FastifyRequest, page: number, pageSize: number, query: Record<string, unknown>) {
    const tenantIds = await this.scopedTenantIds(req);
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (from && to && from.getTime() > to.getTime()) {
      throw new ValidationError('from must be before or equal to to');
    }
    const filter: { from?: Date; to?: Date; status?: string; personName?: string; search?: string } = {};
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (query.status) filter.status = String(query.status);
    if (query.personName) filter.personName = String(query.personName);
    if (query.search) filter.search = String(query.search);
    return this.repo.list(tenantIds, filter, page, pageSize);
  }

  async getById(req: FastifyRequest, id: string): Promise<MedicalEntryRow> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('medical entry not found');
    return row;
  }

  async createDraft(req: FastifyRequest, body: Record<string, unknown>): Promise<MedicalEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const entryNumber = await this.repo.nextEntryNumber(tenantId);
    return this.repo.create({
      tenantId,
      entryNumber,
      status: 'DRAFT',
      personId: String(body.personId ?? '').trim() || null,
      personName: String(body.personName ?? '').trim(),
      diseaseNature: String(body.diseaseNature ?? '').trim(),
      illnessDate: parseDate(body.illnessDate),
      medicineParticulars: String(body.medicineParticulars ?? '').trim(),
      medicineAllowances: String(body.medicineAllowances ?? '').trim(),
      medicalOfficerName: String(body.medicalOfficerName ?? '').trim(),
      medicalOfficerSignature: String(body.medicalOfficerSignature ?? '').trim(),
      remarks: String(body.remarks ?? '').trim(),
      createdBy: req.sessionUser!.userId,
    });
  }

  async updateDraft(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<MedicalEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('medical entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be edited directly');
    const set: Record<string, unknown> = { updatedBy: req.sessionUser!.userId };
    if ('personId' in body) set.personId = String(body.personId ?? '').trim() || null;
    if ('personName' in body) set.personName = String(body.personName ?? '').trim();
    if ('diseaseNature' in body) set.diseaseNature = String(body.diseaseNature ?? '').trim();
    if ('illnessDate' in body) set.illnessDate = parseDate(body.illnessDate);
    if ('medicineParticulars' in body) set.medicineParticulars = String(body.medicineParticulars ?? '').trim();
    if ('medicineAllowances' in body) set.medicineAllowances = String(body.medicineAllowances ?? '').trim();
    if ('medicalOfficerName' in body) set.medicalOfficerName = String(body.medicalOfficerName ?? '').trim();
    if ('medicalOfficerSignature' in body) set.medicalOfficerSignature = String(body.medicalOfficerSignature ?? '').trim();
    if ('remarks' in body) set.remarks = String(body.remarks ?? '').trim();
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('medical entry not found');
    return updated;
  }

  async submit(app: FastifyInstance, req: FastifyRequest, id: string): Promise<MedicalEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('medical entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be submitted');
    if (!existing.personName || !existing.personName.trim() || !existing.illnessDate) {
      throw new ValidationError('student name and date of illness are required before submission');
    }
    const updated = await this.repo.update(tenantId, id, {
      status: 'SUBMITTED',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('medical entry not found');
    await app.auditHook(req, 'submit', 'medical', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'medical', action: 'submitted', entryId: id });
    return updated;
  }

  async review(app: FastifyInstance, req: FastifyRequest, id: string): Promise<MedicalEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can review medical entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('medical entry not found');
    if (existing.status !== 'SUBMITTED') throw new ValidationError('only submitted entries can be reviewed');
    const updated = await this.repo.update(tenantId, id, {
      status: 'FINALIZED',
      reviewedBy: req.sessionUser!.userId,
      reviewedAt: new Date(),
      finalizedBy: req.sessionUser!.userId,
      finalizedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('medical entry not found');
    await app.auditHook(req, 'finalize', 'medical', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'medical', action: 'finalized', entryId: id });
    return updated;
  }

  async correct(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<MedicalEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can correct medical entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('medical entry not found');
    if (existing.status !== 'FINALIZED') throw new ValidationError('only finalized entries follow the controlled correction workflow');
    const field = String(body.field ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!MEDICAL_EDITABLE_FIELDS.includes(field as MedicalField)) {
      throw new ValidationError(`field must be one of ${MEDICAL_EDITABLE_FIELDS.join(', ')}`);
    }
    if (!reason) throw new ValidationError('reason for correction is required');
    const previousValue = existing[field as MedicalField];
    const newValue = field === 'illnessDate' ? parseDate(body.value) : String(body.value ?? '');
    if (String(previousValue ?? '') === String(newValue ?? '')) {
      throw new ValidationError('no change detected; corrected value is identical');
    }
    const changes = [
      ...(existing.changes as unknown[]),
      { field, previousValue, newValue, reason, changedBy: req.sessionUser!.userId, changedAt: new Date() },
    ];
    const updated = await this.repo.update(tenantId, id, { [field]: newValue, changes, updatedBy: req.sessionUser!.userId });
    if (!updated) throw new NotFoundError('medical entry not found');
    return updated;
  }

  async exportCsv(req: FastifyRequest): Promise<string> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['entryNumber', 'illnessDate', 'personName', 'diseaseNature', 'medicineParticulars', 'medicineAllowances', 'medicalOfficerName', 'medicalOfficerSignature', 'remarks', 'status'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    for (const row of result.items) {
      lines.push([
        row.entryNumber,
        row.illnessDate ? String(row.illnessDate).slice(0, 10) : '',
        row.personName,
        row.diseaseNature,
        row.medicineParticulars,
        row.medicineAllowances,
        row.medicalOfficerName,
        row.medicalOfficerSignature,
        row.remarks,
        row.status,
      ].map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  async exportXlsx(req: FastifyRequest): Promise<{ buffer: Buffer; filename: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['Sr. No.', 'Date of Illness', 'Student Name', 'Nature of Disease', 'Medicine Particulars', 'Medicine Allowances', 'Medical Officer Name', 'Medical Officer Signature', 'Remarks'];
    const rows = [header, ...result.items.map((r, i) => [
      i + 1,
      r.illnessDate ? String(r.illnessDate).slice(0, 10) : '',
      r.personName,
      r.diseaseNature,
      r.medicineParticulars,
      r.medicineAllowances,
      r.medicalOfficerName,
      r.medicalOfficerSignature,
      r.remarks,
    ])];
    const xmlRows = rows.map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
    const buffer = Buffer.from(sheet, 'utf-8');
    return { buffer, filename: `medical-register-${Date.now()}.xlsx` };
  }

  async exportPdf(req: FastifyRequest): Promise<{ html: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = await this.resolveHeader(req);
    const rows = result.items.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.illnessDate ? String(r.illnessDate).slice(0, 10) : ''}</td>
        <td>${escapeXml(r.personName)}</td>
        <td>${escapeXml(r.diseaseNature)}</td>
        <td>${escapeXml(r.medicineParticulars)}</td>
        <td>${escapeXml(r.medicineAllowances)}</td>
        <td>${escapeXml(r.medicalOfficerName)}</td>
        <td>${escapeXml(r.medicalOfficerSignature)}</td>
        <td>${escapeXml(r.remarks)}</td>
      </tr>
    `).join('');
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 16px; }
        .heading { text-align: center; font-size: 14px; margin-bottom: 2px; }
        .register-name { text-align: center; font-size: 16px; margin: 4px 0; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 3px 4px; font-size: 9px; text-align: left; vertical-align: top; }
        th { background: #eee; }
      </style></head>
      <body>
        <div class="heading">MEDICAL / वैद्यकीय तपासणी रजिस्टर</div>
        <div class="sub">संस्थेचे नाव: ${escapeXml(header.officeName)} ${header.talukaName ? `| ता. ${escapeXml(header.talukaName)}` : ''} ${header.districtName ? `| जि. ${escapeXml(header.districtName)}` : ''} | वर्ष: ${new Date().getFullYear()}</div>
        <table>
          <thead><tr>
            <th>अ.क्र.</th><th>आजारी पडल्याची तारीख</th><th>विद्यार्थ्याचे नांव</th><th>आजाराचे स्वरूप</th><th>दिलेल्या औषधोपचाराचा तपशील</th><th>औषध उपचारात सुरूवात*</th><th>औषध उपचाराचे वैद्यकीय अधिकारी यांचे नाव व स्वाक्षरी</th><th>शेरा</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="8" style="text-align:center">No entries</td></tr>'}</tbody>
        </table>
        <div class="sub">* स्त्रोत प्रतिमेतील स्तंभ 6 चे नेमके शब्द अस्पष्ट आहेत; स्त्रोत दस्तऐवज पडताळणीनंतर अंतिम केले जाईल.</div>
      </body></html>
    `;
    return { html };
  }

  async history(req: FastifyRequest, id: string): Promise<{ audit: unknown[]; row: MedicalEntryRow }> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('medical entry not found');
    return { audit: row.changes ?? [], row };
  }
}

export default MedicalService;
