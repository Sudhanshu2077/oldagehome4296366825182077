import type { FastifyInstance, FastifyRequest } from 'fastify';
import InwardRepository, { type InwardEntryRow } from '../repository/inward.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { INWARD_STATUSES, INWARD_EDITABLE_FIELDS, type InwardField } from '../entity/inward-entry.entity.js';

export interface InwardHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface InwardMeta {
  header: InwardHeader;
  statuses: readonly string[];
  editableFields: readonly string[];
  year: number;
  month: number;
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

function fmtDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.slice(0, 10);
}

export class InwardService {
  constructor(private readonly repo: InwardRepository = new InwardRepository()) {}

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

  private async resolveHeader(req: FastifyRequest): Promise<InwardHeader> {
    const tenantId = resolvedTenantId(req);
    const header: InwardHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
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
    throw new ForbiddenError('inward register access denied');
  }

  async getMeta(req: FastifyRequest): Promise<InwardMeta> {
    const now = new Date();
    return {
      header: await this.resolveHeader(req),
      statuses: INWARD_STATUSES,
      editableFields: INWARD_EDITABLE_FIELDS,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  }

  async list(req: FastifyRequest, page: number, pageSize: number, query: Record<string, unknown>) {
    const tenantIds = await this.scopedTenantIds(req);
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (from && to && from.getTime() > to.getTime()) {
      throw new ValidationError('from must be before or equal to to');
    }
    const filter: { from?: Date; to?: Date; year?: number; month?: number; status?: string; search?: string } = {};
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (query.year) filter.year = Number(query.year);
    if (query.month) filter.month = Number(query.month);
    if (query.status) filter.status = String(query.status);
    if (query.search) filter.search = String(query.search);
    return this.repo.list(tenantIds, filter, page, pageSize);
  }

  async getById(req: FastifyRequest, id: string): Promise<InwardEntryRow> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('inward entry not found');
    return row;
  }

  async createDraft(req: FastifyRequest, body: Record<string, unknown>): Promise<InwardEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const letterNo = String(body.letterNo ?? '').trim();
    if (letterNo) {
      const dup = await this.repo.findExistingByLetterNo(tenantId, letterNo);
      if (dup) throw new ValidationError(`letter number already used by entry ${dup.entryNumber}`);
    }
    const entryNumber = await this.repo.nextEntryNumber(tenantId);
    const input: Record<string, unknown> = {
      tenantId,
      entryNumber,
      status: 'DRAFT',
      fileNo: String(body.fileNo ?? '').trim(),
      senderName: String(body.senderName ?? '').trim(),
      letterNo,
      receivedDate: parseDate(body.receivedDate),
      subject: String(body.subject ?? '').trim(),
      issuedTo: String(body.issuedTo ?? '').trim(),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      createdBy: req.sessionUser!.userId,
    };
    return this.repo.create(input);
  }

  async updateDraft(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<InwardEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('inward entry not found');
    if (existing.status !== 'DRAFT') {
      throw new ValidationError('only draft entries can be edited directly');
    }
    const set: Record<string, unknown> = {};
    if ('fileNo' in body) set.fileNo = String(body.fileNo ?? '').trim();
    if ('senderName' in body) set.senderName = String(body.senderName ?? '').trim();
    if ('letterNo' in body) {
      const letterNo = String(body.letterNo ?? '').trim();
      const dup = await this.repo.findExistingByLetterNo(tenantId, letterNo, id);
      if (dup) throw new ValidationError(`letter number already used by entry ${dup.entryNumber}`);
      set.letterNo = letterNo;
    }
    if ('receivedDate' in body) set.receivedDate = parseDate(body.receivedDate);
    if ('subject' in body) set.subject = String(body.subject ?? '').trim();
    if ('issuedTo' in body) set.issuedTo = String(body.issuedTo ?? '').trim();
    if ('attachments' in body) set.attachments = body.attachments;
    set.updatedBy = req.sessionUser!.userId;
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('inward entry not found');
    return updated;
  }

  async submit(app: FastifyInstance, req: FastifyRequest, id: string): Promise<InwardEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('inward entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be submitted');
    if (!existing.receivedDate || !existing.senderName || !existing.senderName.trim()) {
      throw new ValidationError('received date and sender are required before submission');
    }
    const updated = await this.repo.update(tenantId, id, {
      status: 'SUBMITTED',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('inward entry not found');
    await app.auditHook(req, 'submit', 'inward', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'inward', action: 'submitted', entryId: id });
    return updated;
  }

  async review(app: FastifyInstance, req: FastifyRequest, id: string): Promise<InwardEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can review inward entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('inward entry not found');
    if (existing.status !== 'SUBMITTED') throw new ValidationError('only submitted entries can be reviewed');
    const updated = await this.repo.update(tenantId, id, {
      status: 'FINALIZED',
      reviewedBy: req.sessionUser!.userId,
      reviewedAt: new Date(),
      finalizedBy: req.sessionUser!.userId,
      finalizedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('inward entry not found');
    await app.auditHook(req, 'finalize', 'inward', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'inward', action: 'finalized', entryId: id });
    return updated;
  }

  async correct(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<InwardEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can correct inward entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('inward entry not found');
    if (existing.status !== 'FINALIZED') {
      throw new ValidationError('only finalized entries follow the controlled correction workflow');
    }
    const field = String(body.field ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!INWARD_EDITABLE_FIELDS.includes(field as InwardField)) {
      throw new ValidationError(`field must be one of ${INWARD_EDITABLE_FIELDS.join(', ')}`);
    }
    if (!reason) throw new ValidationError('reason for correction is required');
    const previousValue = existing[field as InwardField];
    const newValue = field === 'receivedDate' ? parseDate(body.value) : String(body.value ?? '');
    if (String(previousValue ?? '') === String(newValue ?? '')) {
      throw new ValidationError('no change detected; corrected value is identical');
    }
    const changes = [
      ...(existing.changes as unknown[]),
      { field, previousValue, newValue, reason, changedBy: req.sessionUser!.userId, changedAt: new Date() },
    ];
    const updated = await this.repo.update(tenantId, id, { [field]: newValue, changes, updatedBy: req.sessionUser!.userId });
    if (!updated) throw new NotFoundError('inward entry not found');
    return updated;
  }

  async exportCsv(req: FastifyRequest): Promise<string> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['entryNumber', 'fileNo', 'senderName', 'letterNo', 'receivedDate', 'subject', 'issuedTo', 'status'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    for (const row of result.items) {
      lines.push([
        row.entryNumber,
        row.fileNo,
        row.senderName,
        row.letterNo,
        row.receivedDate ? fmtDate(row.receivedDate) : '',
        row.subject,
        row.issuedTo,
        row.status,
      ].map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  async exportXlsx(req: FastifyRequest): Promise<{ buffer: Buffer; filename: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['Sr. No. & File No.', 'From whom Received', 'Letter No.', 'Date', 'Subject', 'To whom issued', 'Status'];
    const rows = [header, ...result.items.map((r) => [
      r.entryNumber + (r.fileNo ? ` / ${r.fileNo}` : ''),
      r.senderName,
      r.letterNo,
      r.receivedDate ? fmtDate(r.receivedDate) : '',
      r.subject,
      r.issuedTo,
      r.status,
    ])];
    const xmlRows = rows.map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
    const buffer = Buffer.from(sheet, 'utf-8');
    return { buffer, filename: `inward-register-${Date.now()}.xlsx` };
  }

  async exportPdf(req: FastifyRequest): Promise<{ html: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = await this.resolveHeader(req);
    const rows = result.items.map((r, i) => `
      <tr>
        <td>${i + 1}<br/>${r.fileNo ? escapeXml(r.fileNo) : ''}</td>
        <td>${escapeXml(r.senderName)}</td>
        <td>${escapeXml(r.letterNo)}</td>
        <td>${r.receivedDate ? fmtDate(r.receivedDate) : ''}</td>
        <td>${escapeXml(r.subject)}</td>
        <td>${escapeXml(r.issuedTo)}</td>
      </tr>
    `).join('');
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 24px; }
        .heading { text-align: center; font-size: 16px; margin-bottom: 2px; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 10px; }
        h1 { text-align: center; font-size: 18px; margin: 6px 0 2px; }
        .year { text-align: center; font-size: 13px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; text-align: left; vertical-align: top; }
        th { background: #eee; }
      </style></head>
      <body>
        <div class="heading">${escapeXml(header.officeName)}</div>
        <div class="sub">${header.talukaName ? `ता. ${escapeXml(header.talukaName)}` : ''} ${header.districtName ? `जि. ${escapeXml(header.districtName)}` : ''}</div>
        <h1>आवक रजिस्टर / INWARD REGISTER</h1>
        <div class="year">इ. सन. / वर्ष: ${new Date().getFullYear()}</div>
        <table>
          <thead><tr>
            <th>अ.क्र. / फाईल नंबर</th>
            <th>कोणाकडून वसूल होते</th>
            <th>पत्राचा क्रमांक</th>
            <th>दिनांक</th>
            <th>विषय</th>
            <th>कोणास दिले</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center">No entries</td></tr>'}</tbody>
        </table>
      </body></html>
    `;
    return { html };
  }

  async history(req: FastifyRequest, id: string): Promise<{ audit: unknown[]; row: InwardEntryRow }> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('inward entry not found');
    return { audit: row.changes ?? [], row };
  }
}

export default InwardService;