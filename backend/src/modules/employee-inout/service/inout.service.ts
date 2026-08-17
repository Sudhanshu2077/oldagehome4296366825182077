import type { FastifyInstance, FastifyRequest } from 'fastify';
import { model as mongooseModel, type Document } from 'mongoose';
import InOutRepository, { type InOutEntryRow } from '../repository/inout.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { INOUT_STATUSES, INOUT_EDITABLE_FIELDS, type InOutField } from '../entity/inout-entry.entity.js';

export interface InOutHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface InOutMeta {
  header: InOutHeader;
  statuses: readonly string[];
  editableFields: readonly string[];
  employees: { id: string; employeeCode: string; fullName: string; designation: string }[];
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${String(v)}`);
  return d;
}

function parseTime(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) {
    throw new ValidationError(`invalid time, expected HH:MM: ${s}`);
  }
  return s;
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

export class InOutService {
  constructor(private readonly repo: InOutRepository = new InOutRepository()) {}

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

  private async resolveHeader(req: FastifyRequest): Promise<InOutHeader> {
    const tenantId = resolvedTenantId(req);
    const header: InOutHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
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
    throw new ForbiddenError('employee in/out register access denied');
  }

  async getMeta(req: FastifyRequest): Promise<InOutMeta> {
    const tenantId = resolvedTenantId(req);
    const employees: { id: string; employeeCode: string; fullName: string; designation: string }[] = [];
    if (tenantId) {
      try {
        const ErpEmployees = mongooseModel<Document>('Erp_employees');
        const docs = await ErpEmployees.find({ tenantId, deletedAt: null, status: 'active' }).sort({ fullName: 1 }).limit(2000).lean();
        employees.push(...docs.map((d) => {
          const r = d as unknown as Record<string, unknown>;
          return {
            id: String(r._id),
            employeeCode: String(r.employeeCode ?? ''),
            fullName: String(r.fullName ?? ''),
            designation: String(r.designation ?? ''),
          };
        }));
      } catch {
        // employees collection may not exist yet; empty list is fine
      }
    }
    return {
      header: await this.resolveHeader(req),
      statuses: INOUT_STATUSES,
      editableFields: INOUT_EDITABLE_FIELDS,
      employees,
    };
  }

  async list(req: FastifyRequest, page: number, pageSize: number, query: Record<string, unknown>) {
    const tenantIds = await this.scopedTenantIds(req);
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (from && to && from.getTime() > to.getTime()) {
      throw new ValidationError('from must be before or equal to to');
    }
    const filter: { from?: Date; to?: Date; status?: string; employeeId?: string; search?: string; late?: boolean } = {};
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (query.status) filter.status = String(query.status);
    if (query.employeeId) filter.employeeId = String(query.employeeId);
    if (query.search) filter.search = String(query.search);
    if (query.late === 'true') filter.late = true;
    return this.repo.list(tenantIds, filter, page, pageSize);
  }

  async getById(req: FastifyRequest, id: string): Promise<InOutEntryRow> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('in/out entry not found');
    return row;
  }

  async createOut(req: FastifyRequest, body: Record<string, unknown>): Promise<InOutEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const employeeId = String(body.employeeId ?? '').trim();
    if (!employeeId) throw new ValidationError('employee is required');
    const employeeName = String(body.employeeName ?? '').trim();
    if (!employeeName) throw new ValidationError('employee name is required');
    const active = await this.repo.findActiveOut(tenantId, employeeId);
    if (active) {
      throw new ValidationError(`employee already has an active out entry (${active.entryNumber})`);
    }
    const entryNumber = await this.repo.nextEntryNumber(tenantId);
    const input: Record<string, unknown> = {
      tenantId,
      entryNumber,
      status: 'DRAFT',
      employeeId,
      employeeCode: String(body.employeeCode ?? '').trim(),
      employeeName,
      outDate: parseDate(body.outDate),
      outTime: parseTime(body.outTime),
      place: String(body.place ?? '').trim(),
      reason: String(body.reason ?? '').trim(),
      outSignature: String(body.outSignature ?? '').trim(),
      createdBy: req.sessionUser!.userId,
    };
    return this.repo.create(input);
  }

  async updateDraft(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<InOutEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('in/out entry not found');
    if (existing.status !== 'DRAFT') {
      throw new ValidationError('only draft entries can be edited directly');
    }
    const set: Record<string, unknown> = {};
    if ('employeeId' in body) {
      const employeeId = String(body.employeeId ?? '').trim();
      const active = await this.repo.findActiveOut(tenantId, employeeId, id);
      if (active) throw new ValidationError(`employee already has an active out entry (${active.entryNumber})`);
      set.employeeId = employeeId;
    }
    if ('employeeName' in body) set.employeeName = String(body.employeeName ?? '').trim();
    if ('employeeCode' in body) set.employeeCode = String(body.employeeCode ?? '').trim();
    if ('outDate' in body) set.outDate = parseDate(body.outDate);
    if ('outTime' in body) set.outTime = parseTime(body.outTime);
    if ('place' in body) set.place = String(body.place ?? '').trim();
    if ('reason' in body) set.reason = String(body.reason ?? '').trim();
    if ('outSignature' in body) set.outSignature = String(body.outSignature ?? '').trim();
    set.updatedBy = req.sessionUser!.userId;
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('in/out entry not found');
    return updated;
  }

  async submitOut(app: FastifyInstance, req: FastifyRequest, id: string): Promise<InOutEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('in/out entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be submitted as out');
    if (!existing.employeeName || !existing.outDate || !existing.outTime) {
      throw new ValidationError('employee, out date and out time are required before submission');
    }
    if (!existing.outSignature) throw new ValidationError('employee out signature is required');
    const active = await this.repo.findActiveOut(tenantId, existing.employeeId ?? '', id);
    if (active) throw new ValidationError(`employee already has an active out entry (${active.entryNumber})`);
    const updated = await this.repo.update(tenantId, id, {
      status: 'OUT',
      outSubmittedBy: req.sessionUser!.userId,
      outSubmittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('in/out entry not found');
    await app.auditHook(req, 'submit', 'employee-inout', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'employee-inout', action: 'out', entryId: id });
    return updated;
  }

  async recordReturn(app: FastifyInstance, req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<InOutEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can record return');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('in/out entry not found');
    if (existing.status !== 'OUT') throw new ValidationError('only active out entries can be returned');
    const returnDate = parseDate(body.returnDate);
    if (!returnDate) throw new ValidationError('return date is required');
    const returnTime = parseTime(body.returnTime);
    if (!returnTime) throw new ValidationError('return time is required');
    const inSignature = String(body.inSignature ?? '').trim();
    if (!inSignature) throw new ValidationError('employee in signature is required');
    if (existing.outDate && existing.outTime) {
      const outDt = new Date(existing.outDate);
      const [oh = 0, om = 0] = existing.outTime.split(':').map((n) => Number(n));
      const returnDt = new Date(returnDate);
      const [rh = 0, rm = 0] = returnTime.split(':').map((n) => Number(n));
      if (
        returnDt.getTime() < outDt.getTime() ||
        (returnDt.toDateString() === outDt.toDateString() && (rh < oh || (rh === oh && rm < om)))
      ) {
        throw new ValidationError('return time cannot be before out time');
      }
    }
    const updated = await this.repo.update(tenantId, id, {
      status: 'RETURNED',
      returnDate,
      returnTime,
      inSignature,
      remarks: String(body.remarks ?? '').trim(),
      returnSubmittedBy: req.sessionUser!.userId,
      returnSubmittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('in/out entry not found');
    await app.auditHook(req, 'return', 'employee-inout', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'employee-inout', action: 'returned', entryId: id });
    return updated;
  }

  async correct(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<InOutEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can correct in/out entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('in/out entry not found');
    if (existing.status !== 'RETURNED') {
      throw new ValidationError('only returned entries follow the controlled correction workflow');
    }
    const field = String(body.field ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!INOUT_EDITABLE_FIELDS.includes(field as InOutField)) {
      throw new ValidationError(`field must be one of ${INOUT_EDITABLE_FIELDS.join(', ')}`);
    }
    if (!reason) throw new ValidationError('reason for correction is required');
    const previousValue = existing[field as InOutField];
    const newValue = field === 'outDate' || field === 'returnDate' ? parseDate(body.value) : String(body.value ?? '');
    if (String(previousValue ?? '') === String(newValue ?? '')) {
      throw new ValidationError('no change detected; corrected value is identical');
    }
    const changes = [
      ...(existing.changes as unknown[]),
      { field, previousValue, newValue, reason, changedBy: req.sessionUser!.userId, changedAt: new Date() },
    ];
    const updated = await this.repo.update(tenantId, id, { [field]: newValue, changes, updatedBy: req.sessionUser!.userId });
    if (!updated) throw new NotFoundError('in/out entry not found');
    return updated;
  }

  async currentlyOut(req: FastifyRequest): Promise<{ items: InOutEntryRow[]; total: number }> {
    const tenantIds = await this.scopedTenantIds(req);
    return this.repo.list(tenantIds, { status: 'OUT' }, 1, 500);
  }

  async lateReturns(req: FastifyRequest): Promise<InOutEntryRow[]> {
    const tenantIds = await this.scopedTenantIds(req);
    return this.repo.lateReturns(tenantIds, new Date(0), new Date());
  }

  async exportCsv(req: FastifyRequest): Promise<string> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['srNo', 'date', 'employeeName', 'outTime', 'place', 'reason', 'outSignature', 'returnDate', 'returnTime', 'inSignature', 'remarks', 'status'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    result.items.forEach((row, i) => {
      lines.push([
        i + 1,
        row.outDate ? String(row.outDate).slice(0, 10) : '',
        row.employeeName,
        row.outTime,
        row.place,
        row.reason,
        row.outSignature,
        row.returnDate ? String(row.returnDate).slice(0, 10) : '',
        row.returnTime,
        row.inSignature,
        row.remarks,
        row.status,
      ].map(escapeCsv).join(','));
    });
    return lines.join('\n');
  }

  async exportXlsx(req: FastifyRequest): Promise<{ buffer: Buffer; filename: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['Sr. No.', 'Date', 'Name of Employee', 'Out Time', 'Place to Visit', 'Reason', "Employee's Sign. (Out)", 'Return Date', 'Time (In)', 'Sign. (In)', 'Remarks', 'Status'];
    const rows = [header, ...result.items.map((r, i) => [
      i + 1,
      r.outDate ? String(r.outDate).slice(0, 10) : '',
      r.employeeName,
      r.outTime,
      r.place,
      r.reason,
      r.outSignature,
      r.returnDate ? String(r.returnDate).slice(0, 10) : '',
      r.returnTime,
      r.inSignature,
      r.remarks,
      r.status,
    ])];
    const xmlRows = rows.map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
    const buffer = Buffer.from(sheet, 'utf-8');
    return { buffer, filename: `employee-inout-${Date.now()}.xlsx` };
  }

  async exportPdf(req: FastifyRequest): Promise<{ html: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = await this.resolveHeader(req);
    const rows = result.items.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.outDate ? String(r.outDate).slice(0, 10) : ''}</td>
        <td>${escapeXml(r.employeeName)}</td>
        <td>${escapeXml(r.outTime)}</td>
        <td>${escapeXml(r.place)}</td>
        <td>${escapeXml(r.reason)}</td>
        <td>${escapeXml(r.outSignature)}</td>
        <td>${r.returnDate ? String(r.returnDate).slice(0, 10) : ''}</td>
        <td>${escapeXml(r.returnTime)}</td>
        <td>${escapeXml(r.inSignature)}</td>
        <td>${escapeXml(r.remarks)}</td>
      </tr>
    `).join('');
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 24px; }
        .heading { text-align: center; font-size: 14px; margin-bottom: 2px; }
        .register-name { text-align: center; font-size: 18px; margin: 4px 0; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px 5px; font-size: 10px; text-align: left; vertical-align: top; }
        th { background: #eee; }
      </style></head>
      <body>
        <div class="heading">नांव: ${escapeXml(header.officeName)}</div>
        <div class="register-name">कर्मचारी हालचाल बुक / EMPLOYEE IN OUT REGISTER</div>
        <div class="sub">${header.talukaName ? `ता. ${escapeXml(header.talukaName)}` : ''} ${header.districtName ? `जि. ${escapeXml(header.districtName)}` : ''}</div>
        <table>
          <thead><tr>
            <th>क्र. नं.</th><th>दिनांक</th><th>कर्मचाऱ्याचे नाव</th><th>जाण्याची वेळ</th><th>जाण्याचे ठिकाण</th><th>जाण्याचे कारण</th><th>कर्मचाऱ्याची सही (जातेवेळी)</th><th>परत येते वेळेस दिनांक</th><th>वेळ</th><th>सही</th><th>शेरा</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="11" style="text-align:center">No entries</td></tr>'}</tbody>
        </table>
      </body></html>
    `;
    return { html };
  }

  async history(req: FastifyRequest, id: string): Promise<{ audit: unknown[]; row: InOutEntryRow }> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('in/out entry not found');
    return { audit: row.changes ?? [], row };
  }
}

export default InOutService;