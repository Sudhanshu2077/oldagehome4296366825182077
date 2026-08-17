import type { FastifyInstance, FastifyRequest } from 'fastify';
import VisitBookRepository, { type VisitBookEntryRow } from '../repository/visit-book.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { VISIT_BOOK_STATUSES } from '../entity/visit-book-entry.entity.js';

export interface VisitBookHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface VisitBookMeta {
  header: VisitBookHeader;
  statuses: readonly string[];
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

function fmtDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.slice(0, 10);
}

export class VisitBookService {
  constructor(private readonly repo: VisitBookRepository = new VisitBookRepository()) {}

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

  private async resolveHeader(req: FastifyRequest): Promise<VisitBookHeader> {
    const tenantId = resolvedTenantId(req);
    const header: VisitBookHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
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
    throw new ForbiddenError('visit book access denied');
  }

  async getMeta(req: FastifyRequest): Promise<VisitBookMeta> {
    return { header: await this.resolveHeader(req), statuses: VISIT_BOOK_STATUSES };
  }

  async list(req: FastifyRequest, page: number, pageSize: number, query: Record<string, unknown>) {
    const tenantIds = await this.scopedTenantIds(req);
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (from && to && from.getTime() > to.getTime()) {
      throw new ValidationError('from must be before or equal to to');
    }
    const filter: { from?: Date; to?: Date; officer?: string; status?: string } = {};
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (query.officer) filter.officer = String(query.officer);
    if (query.status) filter.status = String(query.status);
    const result = await this.repo.list(tenantIds, filter, page, pageSize);
    return result;
  }

  async getById(req: FastifyRequest, id: string): Promise<VisitBookEntryRow> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('visit book entry not found');
    return row;
  }

  async createDraft(req: FastifyRequest, body: Record<string, unknown>): Promise<VisitBookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const entryNumber = await this.repo.nextEntryNumber(tenantId);
    const input: Record<string, unknown> = {
      tenantId,
      entryNumber,
      status: 'DRAFT',
      entryDate: parseDate(body.entryDate),
      officerName: String(body.officerName ?? '').trim(),
      officerPost: String(body.officerPost ?? '').trim(),
      remark: String(body.remark ?? '').trim(),
      createdBy: req.sessionUser!.userId,
    };
    return this.repo.create(input);
  }

  async updateDraft(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<VisitBookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('visit book entry not found');
    if (existing.status !== 'DRAFT') {
      throw new ValidationError('only draft entries can be edited directly');
    }
    const set: Record<string, unknown> = {};
    if ('entryDate' in body) set.entryDate = parseDate(body.entryDate);
    if ('officerName' in body) set.officerName = String(body.officerName ?? '').trim();
    if ('officerPost' in body) set.officerPost = String(body.officerPost ?? '').trim();
    if ('remark' in body) set.remark = String(body.remark ?? '').trim();
    set.updatedBy = req.sessionUser!.userId;
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('visit book entry not found');
    return updated;
  }

  async submit(app: FastifyInstance, req: FastifyRequest, id: string): Promise<VisitBookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('visit book entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be submitted');
    if (!existing.entryDate || !existing.officerName || !existing.officerName.trim()) {
      throw new ValidationError('entry date and officer name are required before submission');
    }
    const updated = await this.repo.update(tenantId, id, {
      status: 'SUBMITTED',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('visit book entry not found');
    await app.auditHook(req, 'submit', 'visit-book', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'visit-book', action: 'submitted', entryId: id });
    return updated;
  }

  async review(app: FastifyInstance, req: FastifyRequest, id: string): Promise<VisitBookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can review visit book entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('visit book entry not found');
    if (existing.status !== 'SUBMITTED') throw new ValidationError('only submitted entries can be reviewed');
    const updated = await this.repo.update(tenantId, id, {
      status: 'FINALIZED',
      reviewedBy: req.sessionUser!.userId,
      reviewedAt: new Date(),
      finalizedBy: req.sessionUser!.userId,
      finalizedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('visit book entry not found');
    await app.auditHook(req, 'finalize', 'visit-book', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'visit-book', action: 'finalized', entryId: id });
    return updated;
  }

  async correct(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<VisitBookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can correct visit book entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('visit book entry not found');
    if (existing.status !== 'FINALIZED') {
      throw new ValidationError('only finalized entries follow the controlled correction workflow');
    }
    const field = String(body.field ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!['entryDate', 'officerName', 'officerPost', 'remark'].includes(field)) {
      throw new ValidationError('field must be entryDate, officerName, officerPost or remark');
    }
    if (!reason) throw new ValidationError('reason for correction is required');
    const previousValue = existing[field as 'entryDate'];
    const newValue = field === 'entryDate' ? parseDate(body.value) : String(body.value ?? '');
    if (String(previousValue ?? '') === String(newValue ?? '')) {
      throw new ValidationError('no change detected; corrected value is identical');
    }
    const changes = [
      ...(existing.changes as unknown[]),
      { field, previousValue, newValue, reason, changedBy: req.sessionUser!.userId, changedAt: new Date() },
    ];
    const updated = await this.repo.update(tenantId, id, { [field]: newValue, changes, updatedBy: req.sessionUser!.userId });
    if (!updated) throw new NotFoundError('visit book entry not found');
    return updated;
  }

  async exportCsv(req: FastifyRequest): Promise<string> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['entryNumber', 'entryDate', 'officerName', 'officerPost', 'remark', 'status'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    for (const row of result.items) {
      lines.push([
        row.entryNumber,
        row.entryDate ? fmtDate(row.entryDate) : '',
        row.officerName,
        row.officerPost,
        row.remark,
        row.status,
      ].map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  async exportXlsx(req: FastifyRequest): Promise<{ buffer: Buffer; filename: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['Entry No.', 'Date', 'Officer Name', 'Officer Post', 'Remark', 'Status'];
    const rows = [header, ...result.items.map((r) => [
      r.entryNumber,
      r.entryDate ? fmtDate(r.entryDate) : '',
      r.officerName,
      r.officerPost,
      r.remark,
      r.status,
    ])];
    const xmlRows = rows.map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${String(cell).replace(/[<>&]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[m] as string)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
    const buffer = Buffer.from(sheet, 'utf-8');
    return { buffer, filename: `visit-book-${Date.now()}.xlsx` };
  }

  async exportPdf(req: FastifyRequest): Promise<{ html: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = await this.resolveHeader(req);
    const rows = result.items.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.entryDate ? fmtDate(r.entryDate) : ''}</td>
        <td>${r.officerName}${r.officerPost ? `, ${r.officerPost}` : ''}</td>
        <td>${r.remark}</td>
      </tr>
    `).join('');
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 24px; }
        h1 { text-align: center; font-size: 20px; }
        .heading { text-align: center; font-size: 14px; margin-bottom: 4px; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; text-align: left; }
        th { background: #eee; }
      </style></head>
      <body>
        <div class="heading">${header.officeName}</div>
        <div class="sub">${header.talukaName ? `ता. ${header.talukaName}` : ''} ${header.districtName ? `जि. ${header.districtName}` : ''}</div>
        <h1>VISIT BOOK / अभिप्राय बुक</h1>
        <table>
          <thead><tr><th>अ.क्र.</th><th>दिनांक</th><th>भेट देणाऱ्या अधिकाऱ्याचे नाव व हुद्दा</th><th>शेरा</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center">No entries</td></tr>'}</tbody>
        </table>
      </body></html>
    `;
    return { html };
  }

  async history(req: FastifyRequest, id: string): Promise<{ audit: unknown[]; row: VisitBookEntryRow }> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('visit book entry not found');
    return { audit: row.changes ?? [], row };
  }
}

export default VisitBookService;
