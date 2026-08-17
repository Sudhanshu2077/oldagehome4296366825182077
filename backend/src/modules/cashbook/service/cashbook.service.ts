import type { FastifyInstance, FastifyRequest } from 'fastify';
import CashbookRepository, { type CashbookEntryRow } from '../repository/cashbook.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { CASHBOOK_EDITABLE_FIELDS, type CashbookField } from '../entity/cashbook-entry.entity.js';

export interface CashbookHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface CashbookMeta {
  header: CashbookHeader;
  statuses: readonly string[];
  editableFields: readonly string[];
  year: number;
  labels: Record<string, { mr: string; hi: string; en: string }>;
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${String(v)}`);
  return d;
}

function toInt(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  if (Number.isNaN(n)) throw new ValidationError(`invalid amount: ${String(v)}`);
  if (n < 0) throw new ValidationError('amount cannot be negative');
  return Math.trunc(n);
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

export class CashbookService {
  constructor(private readonly repo: CashbookRepository = new CashbookRepository()) {}

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

  private async resolveHeader(req: FastifyRequest): Promise<CashbookHeader> {
    const tenantId = resolvedTenantId(req);
    const header: CashbookHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
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
    throw new ForbiddenError('cashbook register access denied');
  }

  async getMeta(req: FastifyRequest): Promise<CashbookMeta> {
    const now = new Date();
    return {
      header: await this.resolveHeader(req),
      statuses: ['DRAFT', 'SUBMITTED', 'FINALIZED'] as const,
      editableFields: CASHBOOK_EDITABLE_FIELDS,
      year: now.getFullYear(),
      labels: await this.labels(),
    };
  }

  async labels(): Promise<Record<string, { mr: string; hi: string; en: string }>> {
    const { CASHBOOK_LABELS } = await import('../labels/cashbook.labels.js');
    return CASHBOOK_LABELS as unknown as Record<string, { mr: string; hi: string; en: string }>;
  }

  async list(req: FastifyRequest, page: number, pageSize: number, query: Record<string, unknown>) {
    const tenantIds = await this.scopedTenantIds(req);
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (from && to && from.getTime() > to.getTime()) {
      throw new ValidationError('from must be before or equal to to');
    }
    const filter: { from?: Date; to?: Date; status?: string; search?: string } = {};
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (query.status) filter.status = String(query.status);
    if (query.search) filter.search = String(query.search);
    return this.repo.list(tenantIds, filter, page, pageSize);
  }

  async getById(req: FastifyRequest, id: string): Promise<CashbookEntryRow> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('cashbook entry not found');
    return row;
  }

  async createDraft(req: FastifyRequest, body: Record<string, unknown>): Promise<CashbookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const entryNumber = await this.repo.nextEntryNumber(tenantId);
    return this.repo.create({
      tenantId,
      entryNumber,
      status: 'DRAFT',
      entryDate: parseDate(body.entryDate),
      month: String(body.month ?? '').trim(),
      vrNo: String(body.vrNo ?? '').trim(),
      particulars: String(body.particulars ?? '').trim(),
      lfNo: String(body.lfNo ?? '').trim(),
      cashRupees: toInt(body.cashRupees),
      cashPaise: toInt(body.cashPaise),
      bankRupees: toInt(body.bankRupees),
      bankPaise: toInt(body.bankPaise),
      remarks: String(body.remarks ?? '').trim(),
      createdBy: req.sessionUser!.userId,
    });
  }

  async updateDraft(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<CashbookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('cashbook entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be edited directly');
    const set: Record<string, unknown> = { updatedBy: req.sessionUser!.userId };
    if ('entryDate' in body) set.entryDate = parseDate(body.entryDate);
    if ('month' in body) set.month = String(body.month ?? '').trim();
    if ('vrNo' in body) set.vrNo = String(body.vrNo ?? '').trim();
    if ('particulars' in body) set.particulars = String(body.particulars ?? '').trim();
    if ('lfNo' in body) set.lfNo = String(body.lfNo ?? '').trim();
    if ('cashRupees' in body) set.cashRupees = toInt(body.cashRupees);
    if ('cashPaise' in body) set.cashPaise = toInt(body.cashPaise);
    if ('bankRupees' in body) set.bankRupees = toInt(body.bankRupees);
    if ('bankPaise' in body) set.bankPaise = toInt(body.bankPaise);
    if ('remarks' in body) set.remarks = String(body.remarks ?? '').trim();
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('cashbook entry not found');
    return updated;
  }

  async submit(app: FastifyInstance, req: FastifyRequest, id: string): Promise<CashbookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('cashbook entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be submitted');
    if (!existing.particulars || !existing.particulars.trim() || !existing.entryDate) {
      throw new ValidationError('particulars and date are required before submission');
    }
    const updated = await this.repo.update(tenantId, id, {
      status: 'SUBMITTED',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('cashbook entry not found');
    await app.auditHook(req, 'submit', 'cashbook', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'cashbook', action: 'submitted', entryId: id });
    return updated;
  }

  async review(app: FastifyInstance, req: FastifyRequest, id: string): Promise<CashbookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can review cashbook entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('cashbook entry not found');
    if (existing.status !== 'SUBMITTED') throw new ValidationError('only submitted entries can be reviewed');
    const updated = await this.repo.update(tenantId, id, {
      status: 'FINALIZED',
      reviewedBy: req.sessionUser!.userId,
      reviewedAt: new Date(),
      finalizedBy: req.sessionUser!.userId,
      finalizedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('cashbook entry not found');
    await app.auditHook(req, 'finalize', 'cashbook', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'cashbook', action: 'finalized', entryId: id });
    return updated;
  }

  async correct(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<CashbookEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can correct cashbook entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('cashbook entry not found');
    if (existing.status !== 'FINALIZED') throw new ValidationError('only finalized entries follow the controlled correction workflow');
    const field = String(body.field ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!CASHBOOK_EDITABLE_FIELDS.includes(field as CashbookField)) {
      throw new ValidationError(`field must be one of ${CASHBOOK_EDITABLE_FIELDS.join(', ')}`);
    }
    if (!reason) throw new ValidationError('reason for correction is required');
    const previousValue = existing[field as CashbookField];
    const newValue = field === 'entryDate'
      ? parseDate(body.value)
      : ['cashRupees', 'cashPaise', 'bankRupees', 'bankPaise'].includes(field)
        ? toInt(body.value)
        : String(body.value ?? '');
    if (String(previousValue ?? '') === String(newValue ?? '')) {
      throw new ValidationError('no change detected; corrected value is identical');
    }
    const changes = [
      ...(existing.changes as unknown[]),
      { field, previousValue, newValue, reason, changedBy: req.sessionUser!.userId, changedAt: new Date() },
    ];
    const updated = await this.repo.update(tenantId, id, { [field]: newValue, changes, updatedBy: req.sessionUser!.userId });
    if (!updated) throw new NotFoundError('cashbook entry not found');
    return updated;
  }

  async exportCsv(req: FastifyRequest): Promise<string> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['entryNumber', 'entryDate', 'month', 'vrNo', 'particulars', 'lfNo', 'cashRupees', 'cashPaise', 'bankRupees', 'bankPaise', 'remarks', 'status'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    for (const row of result.items) {
      lines.push([
        row.entryNumber,
        row.entryDate ? String(row.entryDate).slice(0, 10) : '',
        row.month,
        row.vrNo,
        row.particulars,
        row.lfNo,
        row.cashRupees,
        row.cashPaise,
        row.bankRupees,
        row.bankPaise,
        row.remarks,
        row.status,
      ].map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  async exportXlsx(req: FastifyRequest): Promise<{ buffer: Buffer; filename: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['Sr. No.', 'Month / Date', 'V.R. No.', 'Particulars', 'L.F. No.', 'Cash Rs.', 'Cash Ps.', 'Bank Rs.', 'Bank Ps.', 'Remarks'];
    const rows = [header, ...result.items.map((r, i) => [
      i + 1,
      r.entryDate ? String(r.entryDate).slice(0, 10) : '',
      r.month ? `${r.month}${r.entryDate ? ' / ' + String(r.entryDate).slice(0, 10) : ''}` : (r.entryDate ? String(r.entryDate).slice(0, 10) : ''),
      r.vrNo,
      r.particulars,
      r.lfNo,
      r.cashRupees,
      r.cashPaise,
      r.bankRupees,
      r.bankPaise,
      r.remarks,
    ])];
    const xmlRows = rows.map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
    const buffer = Buffer.from(sheet, 'utf-8');
    return { buffer, filename: `cashbook-register-${Date.now()}.xlsx` };
  }

  async exportPdf(req: FastifyRequest): Promise<{ html: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = await this.resolveHeader(req);
    const rows = result.items.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.entryDate ? String(r.entryDate).slice(0, 10) : ''}</td>
        <td>${escapeXml(r.month)}</td>
        <td>${escapeXml(r.vrNo)}</td>
        <td>${escapeXml(r.particulars)}</td>
        <td>${escapeXml(r.lfNo)}</td>
        <td>${r.cashRupees}</td><td>${r.cashPaise}</td>
        <td>${r.bankRupees}</td><td>${r.bankPaise}</td>
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
        th, td { border: 1px solid #000; padding: 3px 4px; font-size: 8px; text-align: left; vertical-align: top; }
        th { background: #eee; }
      </style></head>
      <body>
        <div class="heading">रोख रजिस्टर / CASH BOOK</div>
        <div class="sub">जमा / RECEIPT</div>
        <div class="sub">संस्थेचे नाव: ${escapeXml(header.officeName)} ${header.talukaName ? `| ता. ${escapeXml(header.talukaName)}` : ''} ${header.districtName ? `| जि. ${escapeXml(header.districtName)}` : ''} | वर्ष: ${new Date().getFullYear()}</div>
        <table>
          <thead><tr>
            <th>अ.क्र.</th><th>दिनांक</th><th>महिना</th><th>प्रमाणक क्र.</th><th>जमा तपशील</th><th>खाते पान क्र.</th><th>रोख रक्कम (रु.)</th><th>रोख रक्कम (पै.)</th><th>बँक खाते (रु.)</th><th>बँक खाते (पै.)</th><th>शेरा</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="11" style="text-align:center">No entries</td></tr>'}</tbody>
        </table>
        <div class="sub">रक्कम पूर्णांक रुपये/पैसे म्हणून ठेवली जाते.</div>
      </body></html>
    `;
    return { html };
  }

  async history(req: FastifyRequest, id: string): Promise<{ audit: unknown[]; row: CashbookEntryRow }> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('cashbook entry not found');
    return { audit: row.changes ?? [], row };
  }
}

export default CashbookService;