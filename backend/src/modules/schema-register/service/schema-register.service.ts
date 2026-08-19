import type { FastifyInstance, FastifyRequest } from 'fastify';
import { model as mongooseModel, type Document } from 'mongoose';
import { randomUUID } from 'node:crypto';
import SchemaRegisterRepository, { type SRegEntryRow } from '../repository/schema-register.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { getStorageDriver } from '../../../services/storage.service.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import {
  SREG_CODES,
  SREG_CODE_LABELS,
  SREG_STATUSES,
  SREG_COLUMN_TYPES,
  SchemaRegisterModel,
  type SRegCode,
  type SRegColumn,
} from '../entity/schema-register.entity.js';

export interface SRegHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface SRegMeta {
  code: SRegCode;
  title: { en: string; mr: string; hi: string };
  prefix: string;
  header: SRegHeader;
  statuses: readonly string[];
  year: number;
  columns: SRegColumn[];
  schemaConfigured: boolean;
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${String(v)}`);
  return d;
}

function fmtDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.slice(0, 10);
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

function withDocumentUrls(row: SRegEntryRow): SRegEntryRow {
  return { ...row, documents: (row.documents ?? []).map((k) => `/schema-register/media?key=${encodeURIComponent(k)}`) };
}

export class SchemaRegisterService {
  constructor(private readonly repo: SchemaRegisterRepository = new SchemaRegisterRepository()) {}

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

  private canEditSchema(req: FastifyRequest): boolean {
    return this.canReview(req);
  }

  private async resolveHeader(req: FastifyRequest): Promise<SRegHeader> {
    const tenantId = resolvedTenantId(req);
    const header: SRegHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
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
    throw new ForbiddenError('schema register access denied');
  }

  private normalizeCode(code: string): SRegCode {
    if (!SREG_CODES.includes(code as SRegCode)) {
      throw new ValidationError(`unsupported register code: ${code}`);
    }
    return code as SRegCode;
  }

  private async loadColumns(tenantId: string, code: SRegCode): Promise<SRegColumn[]> {
    const def = await SchemaRegisterModel.findOne({ tenantId, code }).lean();
    return def ? (def.columns ?? []) : [];
  }

  private coerceValue(column: SRegColumn, value: unknown): unknown {
    if (value === null || value === undefined || value === '') {
      return column.type === 'number' ? null : '';
    }
    if (column.type === 'number') {
      const n = Number(value);
      if (Number.isNaN(n)) throw new ValidationError(`invalid number for ${column.key}`);
      return n;
    }
    if (column.type === 'date') {
      return parseDate(value);
    }
    return String(value);
  }

  private validateColumns(body: Record<string, unknown>): SRegColumn[] {
    const raw = body.columns;
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new ValidationError('columns array is required');
    }
    const seen = new Set<string>();
    const reserved = new Set(['entryNumber', 'status', 'date', 'month', 'remarks', 'createdAt', 'updatedAt', 'submittedAt', 'finalizedAt', 'changes']);
    return raw.map((c, i) => {
      const col = (c ?? {}) as Record<string, unknown>;
      const key = String(col.key ?? '').trim();
      if (!/^[a-zA-Z0-9_]{1,64}$/.test(key)) {
        throw new ValidationError(`column ${i + 1}: key must match [a-zA-Z0-9_]{1,64}`);
      }
      if (reserved.has(key)) throw new ValidationError(`column key is reserved: ${key}`);
      if (seen.has(key)) throw new ValidationError(`duplicate column key: ${key}`);
      seen.add(key);
      const en = String(col.en ?? '').trim();
      if (!en) throw new ValidationError(`column ${key}: English label required`);
      const typeValue = SREG_COLUMN_TYPES.includes(col.type as never) ? col.type as SRegColumn['type'] : 'text';
      const column = {
        key,
        en,
        mr: String(col.mr ?? '').trim(),
        hi: String(col.hi ?? '').trim(),
        type: typeValue,
        required: col.required === true,
        sourceFlag: col.sourceFlag === true,
        sourceFieldNumber: col.sourceFieldNumber === null || col.sourceFieldNumber === undefined ? null : Number(col.sourceFieldNumber),
      } as SRegColumn;
      return column;
    });
  }

  async getMeta(req: FastifyRequest, codeRaw: string): Promise<SRegMeta> {
    const code = this.normalizeCode(codeRaw);
    const now = new Date();
    const tenantId = resolvedTenantId(req);
    const columns = tenantId ? await this.loadColumns(tenantId, code) : [];
    const label = SREG_CODE_LABELS[code];
    return {
      code,
      title: { en: label.en, mr: label.mr, hi: label.hi },
      prefix: label.prefix,
      header: await this.resolveHeader(req),
      statuses: SREG_STATUSES,
      year: now.getFullYear(),
      columns,
      schemaConfigured: columns.length > 0,
    };
  }

  async updateSchema(app: FastifyInstance, req: FastifyRequest, codeRaw: string, body: Record<string, unknown>): Promise<{ columns: SRegColumn[] }> {
    const code = this.normalizeCode(codeRaw);
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canEditSchema(req)) throw new ForbiddenError('only institution head or assistant manager can configure the register schema');
    const columns = this.validateColumns(body);
    await SchemaRegisterModel.findOneAndUpdate(
      { tenantId, code },
      { $set: { columns, updatedBy: req.sessionUser!.userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    await app.auditHook(req, 'configure-schema', 'schema-register', `${code}:${tenantId}`);
    return { columns };
  }

  async list(req: FastifyRequest, codeRaw: string, page: number, pageSize: number, query: Record<string, unknown>) {
    const code = this.normalizeCode(codeRaw);
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
    const result = await this.repo.list(tenantIds, code, filter, page, pageSize);
    return { ...result, items: result.items.map(withDocumentUrls) };
  }

  async getById(req: FastifyRequest, codeRaw: string, id: string): Promise<SRegEntryRow> {
    const code = this.normalizeCode(codeRaw);
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, code, id);
    if (!row) throw new NotFoundError('register entry not found');
    return withDocumentUrls(row);
  }

  async createDraft(req: FastifyRequest, codeRaw: string, body: Record<string, unknown>): Promise<SRegEntryRow> {
    const code = this.normalizeCode(codeRaw);
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const columns = await this.loadColumns(tenantId, code);
    if (columns.length === 0) {
      throw new ValidationError(`register schema for ${code} is not configured yet; columns must be confirmed from the physical register before entries can be created`);
    }
    const entryNumber = await this.repo.nextEntryNumber(tenantId, code);
    const values: Record<string, unknown> = {};
    const signatures: Record<string, string> = {};
    for (const col of columns) {
      const v = body[col.key];
      if (col.type === 'signature') {
        signatures[col.key] = String(v ?? '').trim();
      } else {
        values[col.key] = this.coerceValue(col, v);
      }
    }
    return withDocumentUrls(await this.repo.create({
      tenantId,
      code,
      entryNumber,
      status: 'DRAFT',
      date: parseDate(body.date),
      month: String(body.month ?? '').trim(),
      values,
      signatures,
      remarks: String(body.remarks ?? '').trim(),
      createdBy: req.sessionUser!.userId,
    }));
  }

  async updateDraft(req: FastifyRequest, codeRaw: string, id: string, body: Record<string, unknown>): Promise<SRegEntryRow> {
    const code = this.normalizeCode(codeRaw);
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, code, id);
    if (!existing) throw new NotFoundError('register entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be edited directly');
    const columns = await this.loadColumns(tenantId, code);
    const values = { ...existing.values };
    const signatures = { ...existing.signatures };
    for (const col of columns) {
      if (col.key in body) {
        if (col.type === 'signature') {
          signatures[col.key] = String(body[col.key] ?? '').trim();
        } else {
          values[col.key] = this.coerceValue(col, body[col.key]);
        }
      }
    }
    const set: Record<string, unknown> = { values, signatures, updatedBy: req.sessionUser!.userId };
    if ('date' in body) set.date = parseDate(body.date);
    if ('month' in body) set.month = String(body.month ?? '').trim();
    if ('remarks' in body) set.remarks = String(body.remarks ?? '').trim();
    const updated = await this.repo.update(tenantId, code, id, set);
    if (!updated) throw new NotFoundError('register entry not found');
    return withDocumentUrls(updated);
  }

  async submit(app: FastifyInstance, req: FastifyRequest, codeRaw: string, id: string): Promise<SRegEntryRow> {
    const code = this.normalizeCode(codeRaw);
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, code, id);
    if (!existing) throw new NotFoundError('register entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be submitted');
    if (!existing.date) throw new ValidationError('date is required before submission');
    const columns = await this.loadColumns(tenantId, code);
    for (const col of columns) {
      if (col.required && col.type !== 'signature' && (existing.values[col.key] === null || existing.values[col.key] === undefined || existing.values[col.key] === '')) {
        throw new ValidationError(`column ${col.en} is required before submission`);
      }
      if (col.required && col.type === 'signature' && !existing.signatures[col.key]) {
        throw new ValidationError(`signature for ${col.en} is required before submission`);
      }
    }
    const requiresSourceDoc = columns.some((c) => c.sourceFlag);
    if (requiresSourceDoc && existing.documents.length === 0) {
      throw new ValidationError('document proof is required before submission for source-verified entries');
    }
    const updated = await this.repo.update(tenantId, code, id, {
      status: 'SUBMITTED',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('register entry not found');
    await app.auditHook(req, 'submit', 'schema-register', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: code, action: 'submitted', entryId: id });
    return withDocumentUrls(updated);
  }

  async review(app: FastifyInstance, req: FastifyRequest, codeRaw: string, id: string): Promise<SRegEntryRow> {
    const code = this.normalizeCode(codeRaw);
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can review register entries');
    const existing = await this.repo.findById(tenantId, code, id);
    if (!existing) throw new NotFoundError('register entry not found');
    if (existing.status !== 'SUBMITTED') throw new ValidationError('only submitted entries can be reviewed');
    const updated = await this.repo.update(tenantId, code, id, {
      status: 'FINALIZED',
      reviewedBy: req.sessionUser!.userId,
      reviewedAt: new Date(),
      finalizedBy: req.sessionUser!.userId,
      finalizedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('register entry not found');
    await app.auditHook(req, 'finalize', 'schema-register', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: code, action: 'finalized', entryId: id });
    return withDocumentUrls(updated);
  }

  async correct(req: FastifyRequest, codeRaw: string, id: string, body: Record<string, unknown>): Promise<SRegEntryRow> {
    const code = this.normalizeCode(codeRaw);
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can correct register entries');
    const existing = await this.repo.findById(tenantId, code, id);
    if (!existing) throw new NotFoundError('register entry not found');
    if (existing.status !== 'FINALIZED') throw new ValidationError('only finalized entries follow the controlled correction workflow');
    const field = String(body.field ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!reason) throw new ValidationError('reason for correction is required');
    const columns = await this.loadColumns(tenantId, code);
    const col = columns.find((c) => c.key === field);
    if (field !== 'remarks' && field !== 'month' && !col) {
      throw new ValidationError(`field must be one of ${['remarks', 'month', ...columns.map((c) => c.key)].join(', ')}`);
    }
    const values = { ...existing.values };
    const signatures = { ...existing.signatures };
    let previousValue: unknown;
    let newValue: unknown;
    if (field === 'remarks') {
      previousValue = existing.remarks;
      newValue = String(body.value ?? '');
    } else if (field === 'month') {
      previousValue = existing.month;
      newValue = String(body.value ?? '').trim();
    } else if (col!.type === 'signature') {
      previousValue = existing.signatures[field] ?? '';
      newValue = String(body.value ?? '').trim();
      signatures[field] = newValue as string;
    } else {
      previousValue = existing.values[field] ?? null;
      newValue = this.coerceValue(col!, body.value);
      values[field] = newValue;
    }
    if (String(previousValue ?? '') === String(newValue ?? '')) {
      throw new ValidationError('no change detected; corrected value is identical');
    }
    const changes = [
      ...(existing.changes as unknown[]),
      { field, previousValue, newValue, reason, changedBy: req.sessionUser!.userId, changedAt: new Date() },
    ];
    const set: Record<string, unknown> = { changes, updatedBy: req.sessionUser!.userId };
    if (field === 'remarks') set.remarks = newValue;
    else if (field === 'month') set.month = newValue;
    else set.values = values;
    if (col?.type === 'signature') set.signatures = signatures;
    const updated = await this.repo.update(tenantId, code, id, set);
    if (!updated) throw new NotFoundError('register entry not found');
    return withDocumentUrls(updated);
  }

  private async exportColumns(req: FastifyRequest, codeRaw: string): Promise<SRegColumn[]> {
    const code = this.normalizeCode(codeRaw);
    const tenantId = resolvedTenantId(req);
    const columns = tenantId ? await this.loadColumns(tenantId, code) : [];
    if (columns.length === 0) {
      throw new ValidationError(`register schema for ${code} is not configured yet`);
    }
    return columns;
  }

  private exportValue(col: SRegColumn, row: SRegEntryRow): unknown {
    if (col.type === 'signature') return row.signatures[col.key] ?? '';
    const v = row.values[col.key];
    if (col.type === 'date') return fmtDate(v);
    return v ?? '';
  }

  async exportCsv(req: FastifyRequest, codeRaw: string): Promise<string> {
    const code = this.normalizeCode(codeRaw);
    const tenantIds = await this.scopedTenantIds(req);
    const columns = await this.exportColumns(req, code);
    const result = await this.repo.list(tenantIds, code, {}, 1, 100000);
    const header = ['entryNumber', 'date', ...columns.map((c) => c.key), 'remarks', 'status'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    for (const row of result.items) {
      const cells: unknown[] = [row.entryNumber, fmtDate(row.date)];
      for (const col of columns) {
        cells.push(this.exportValue(col, row));
      }
      cells.push(row.remarks, row.status);
      lines.push(cells.map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  async exportXlsx(req: FastifyRequest, codeRaw: string): Promise<{ buffer: Buffer; filename: string }> {
    const code = this.normalizeCode(codeRaw);
    const tenantIds = await this.scopedTenantIds(req);
    const columns = await this.exportColumns(req, code);
    const result = await this.repo.list(tenantIds, code, {}, 1, 100000);
    const header = ['Sr. No.', 'Date', ...columns.map((c) => c.en), 'Remarks'];
    const rows = [header, ...result.items.map((r, i) => {
      const cells: unknown[] = [i + 1, fmtDate(r.date)];
      for (const col of columns) {
        cells.push(this.exportValue(col, r));
      }
      cells.push(r.remarks);
      return cells;
    })];
    const xmlRows = rows.map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
    const buffer = Buffer.from(sheet, 'utf-8');
    return { buffer, filename: `${code}-register-${Date.now()}.xlsx` };
  }

  async exportPdf(req: FastifyRequest, codeRaw: string): Promise<{ html: string }> {
    const code = this.normalizeCode(codeRaw);
    const tenantIds = await this.scopedTenantIds(req);
    const columns = await this.exportColumns(req, code);
    const label = SREG_CODE_LABELS[code];
    const result = await this.repo.list(tenantIds, code, {}, 1, 100000);
    const header = await this.resolveHeader(req);
    const rows = result.items.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${fmtDate(r.date)}</td>
        ${columns.map((col) => `<td>${escapeXml(this.exportValue(col, r))}</td>`).join('')}
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
        <div class="heading">संस्थेचे नाव: ${escapeXml(header.officeName)}</div>
        <div class="sub">${header.talukaName ? `ता. ${escapeXml(header.talukaName)}` : ''} ${header.districtName ? `जि. ${escapeXml(header.districtName)}` : ''} | वर्ष: ${new Date().getFullYear()}</div>
        <div class="register-name">${escapeXml(label.mr)}</div>
        <table>
          <thead><tr>
            <th>अ.क्र.</th><th>दिनांक</th>
            ${columns.map((col) => `<th>${escapeXml(col.mr || col.en)}</th>`).join('')}
            <th>शेरा</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="${columns.length + 3}" style="text-align:center">No entries</td></tr>`}</tbody>
        </table>
      </body></html>
    `;
    return { html };
  }

  async attachDocument(app: FastifyInstance, req: FastifyRequest, codeRaw: string, id: string): Promise<SRegEntryRow> {
    const code = this.normalizeCode(codeRaw);
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, code, id);
    if (!existing) throw new NotFoundError('register entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('documents can only be attached to draft entries');
    const file = await req.file();
    if (!file) throw new ValidationError('file required');
    const allowed = new Set(['image/jpeg', 'image/png', 'application/pdf']);
    if (!allowed.has(file.mimetype)) throw new ValidationError('only PNG, JPEG or PDF documents are allowed');
    const buffer = await file.toBuffer();
    const storageKey = `${tenantId}/schema-register/${randomUUID()}/${file.filename}`;
    const driver = getStorageDriver();
    const info = await driver.putObject({ key: storageKey, body: buffer, contentType: file.mimetype, contentLength: buffer.length });
    const updated = await this.repo.pushDocument(tenantId, code, id, storageKey);
    if (!updated) throw new NotFoundError('register entry not found');
    await app.auditHook(req, 'update', 'schema-register', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: code, action: 'document-attached', entryId: id, size: info.size });
    return withDocumentUrls(updated);
  }

  async serveDocument(req: FastifyRequest, key: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!key) throw new ValidationError('key required');
    const tenantId = resolvedTenantId(req);
    if (!tenantId || !key.startsWith(`${tenantId}/schema-register/`)) throw new ForbiddenError('media access denied');
    const driver = getStorageDriver();
    let obj;
    try {
      obj = await driver.getObject(key);
    } catch {
      throw new NotFoundError('document not found');
    }
    const { body, info } = obj;
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(chunk as Buffer);
    }
    return { buffer: Buffer.concat(chunks), contentType: info.contentType || 'application/octet-stream' };
  }

  async history(req: FastifyRequest, codeRaw: string, id: string): Promise<{ audit: unknown[]; row: SRegEntryRow }> {
    const code = this.normalizeCode(codeRaw);
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, code, id);
    if (!row) throw new NotFoundError('register entry not found');
    return { audit: row.changes ?? [], row };
  }
}

export default SchemaRegisterService;
