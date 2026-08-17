import type { FastifyInstance, FastifyRequest } from 'fastify';
import { model as mongooseModel, type Document } from 'mongoose';
import DistributionRepository, { type DistributionEntryRow } from '../repository/distribution.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { DIST_STATUSES, DIST_EDITABLE_FIELDS, type DistField } from '../entity/distribution-entry.entity.js';

export interface DistributionHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface DistributionMeta {
  header: DistributionHeader;
  statuses: readonly string[];
  editableFields: readonly string[];
  year: number;
  itemLabels: { key: DistField; en: string; mr: string; hi: string }[];
  sourceColumnsUnverified: string[];
  residents: { id: string; residentNumber: string; fullName: string; gender: string; roomName?: string }[];
}

const ITEM_FIELDS: { key: DistField; mr: string; en: string }[] = [
  { key: 'clothesWashingPowder', mr: 'कपड्याची पावडर', en: 'Clothes Washing Powder' },
  { key: 'clothesWashingSoap', mr: 'कपड्याचा साबण', en: 'Clothes Washing Soap' },
  { key: 'bathingSoap', mr: 'अंघोळीचा साबण', en: 'Bathing Soap' },
  { key: 'toothPowder', mr: 'दंत मंजन', en: 'Tooth Powder' },
  { key: 'paste', mr: 'पेस्ट', en: 'Toothpaste' },
  { key: 'brush', mr: 'ब्रश', en: 'Toothbrush' },
];

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${String(v)}`);
  return d;
}

function parseQty(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  if (Number.isNaN(n)) throw new ValidationError(`invalid quantity: ${String(v)}`);
  if (n < 0) throw new ValidationError('quantity cannot be negative');
  return n;
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

export class DistributionService {
  constructor(private readonly repo: DistributionRepository = new DistributionRepository()) {}

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

  private async resolveHeader(req: FastifyRequest): Promise<DistributionHeader> {
    const tenantId = resolvedTenantId(req);
    const header: DistributionHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
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
    throw new ForbiddenError('distribution register access denied');
  }

  private async deductStock(tenantId: string, row: DistributionEntryRow, override: boolean): Promise<{ field: string; name: string; remaining: number }[]> {
    const ErpItems = mongooseModel<Document>('Erp_inventory-items');
    const deductions: { field: string; name: string; remaining: number }[] = [];
    for (const item of ITEM_FIELDS) {
      const qty = row[item.key as keyof DistributionEntryRow] as number;
      if (!qty) continue;
      const itemRow = await ErpItems.findOne({ tenantId, deletedAt: null, category: 'cleaning', name: { $in: [item.en, item.mr] } }).lean();
      if (!itemRow) continue;
      const r = itemRow as unknown as Record<string, unknown>;
      const currentStock = Number(r.currentStock ?? 0);
      if (currentStock - qty < 0 && !override) {
        throw new ValidationError(`insufficient stock for ${String(r.name)}: available ${currentStock}, required ${qty}. An authorized override is required.`);
      }
      await ErpItems.updateOne({ _id: r._id }, { $inc: { currentStock: -qty } });
      deductions.push({ field: item.key, name: String(r.name), remaining: Math.max(0, currentStock - qty) });
    }
    return deductions;
  }

  async getMeta(req: FastifyRequest): Promise<DistributionMeta> {
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
      statuses: DIST_STATUSES,
      editableFields: DIST_EDITABLE_FIELDS,
      year: now.getFullYear(),
      itemLabels: ITEM_FIELDS.map((i) => ({ key: i.key, en: i.en, mr: i.mr, hi: i.mr })),
      sourceColumnsUnverified: ['sourceColumn10', 'sourceColumn11'],
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
    const filter: { from?: Date; to?: Date; status?: string; personName?: string; item?: string } = {};
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (query.status) filter.status = String(query.status);
    if (query.personName) filter.personName = String(query.personName);
    if (query.item) filter.item = String(query.item);
    return this.repo.list(tenantIds, filter, page, pageSize);
  }

  async getById(req: FastifyRequest, id: string): Promise<DistributionEntryRow> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('distribution entry not found');
    return row;
  }

  async createDraft(req: FastifyRequest, body: Record<string, unknown>): Promise<DistributionEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const entryNumber = await this.repo.nextEntryNumber(tenantId);
    const input: Record<string, unknown> = {
      tenantId,
      entryNumber,
      status: 'DRAFT',
      date: parseDate(body.date),
      personId: String(body.personId ?? '').trim() || null,
      personName: String(body.personName ?? '').trim(),
      className: String(body.className ?? '').trim(),
      clothesWashingPowder: parseQty(body.clothesWashingPowder),
      clothesWashingSoap: parseQty(body.clothesWashingSoap),
      bathingSoap: parseQty(body.bathingSoap),
      toothPowder: parseQty(body.toothPowder),
      paste: parseQty(body.paste),
      brush: parseQty(body.brush),
      sourceColumn10: parseQty(body.sourceColumn10),
      sourceColumn11: parseQty(body.sourceColumn11),
      distributionDate: parseDate(body.distributionDate),
      superintendentSignature: String(body.superintendentSignature ?? '').trim(),
      remarks: String(body.remarks ?? '').trim(),
      createdBy: req.sessionUser!.userId,
    };
    return this.repo.create(input);
  }

  async updateDraft(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<DistributionEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('distribution entry not found');
    if (existing.status !== 'DRAFT') {
      throw new ValidationError('only draft entries can be edited directly');
    }
    const set: Record<string, unknown> = {};
    if ('date' in body) set.date = parseDate(body.date);
    if ('personId' in body) set.personId = String(body.personId ?? '').trim() || null;
    if ('personName' in body) set.personName = String(body.personName ?? '').trim();
    if ('className' in body) set.className = String(body.className ?? '').trim();
    for (const item of ITEM_FIELDS) {
      if (item.key in body) set[item.key] = parseQty(body[item.key]);
    }
    if ('sourceColumn10' in body) set.sourceColumn10 = parseQty(body.sourceColumn10);
    if ('sourceColumn11' in body) set.sourceColumn11 = parseQty(body.sourceColumn11);
    if ('distributionDate' in body) set.distributionDate = parseDate(body.distributionDate);
    if ('superintendentSignature' in body) set.superintendentSignature = String(body.superintendentSignature ?? '').trim();
    if ('remarks' in body) set.remarks = String(body.remarks ?? '').trim();
    set.updatedBy = req.sessionUser!.userId;
    const updated = await this.repo.update(tenantId, id, set);
    if (!updated) throw new NotFoundError('distribution entry not found');
    return updated;
  }

  async submit(app: FastifyInstance, req: FastifyRequest, id: string): Promise<DistributionEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canWrite(req)) throw new ForbiddenError('write access denied');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('distribution entry not found');
    if (existing.status !== 'DRAFT') throw new ValidationError('only draft entries can be submitted');
    if (!existing.date || !existing.personName || !existing.personName.trim()) {
      throw new ValidationError('date and person name are required before submission');
    }
    const updated = await this.repo.update(tenantId, id, {
      status: 'SUBMITTED',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('distribution entry not found');
    await app.auditHook(req, 'submit', 'distribution', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'distribution', action: 'submitted', entryId: id });
    return updated;
  }

  async review(app: FastifyInstance, req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<DistributionEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can review distribution entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('distribution entry not found');
    if (existing.status !== 'SUBMITTED') throw new ValidationError('only submitted entries can be reviewed');
    const override = body.override === true || body.override === 'true';
    const deductions = await this.deductStock(tenantId, existing, override);
    const updated = await this.repo.update(tenantId, id, {
      status: 'FINALIZED',
      reviewedBy: req.sessionUser!.userId,
      reviewedAt: new Date(),
      finalizedBy: req.sessionUser!.userId,
      finalizedAt: new Date(),
      remarks: deductions.length > 0 ? `${String(existing.remarks)} | ${deductions.map((d) => `${d.name}: -${d.field}`).join('; ')}` : existing.remarks,
    });
    if (!updated) throw new NotFoundError('distribution entry not found');
    await app.auditHook(req, 'finalize', 'distribution', id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'distribution', action: 'finalized', entryId: id });
    return updated;
  }

  async correct(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<DistributionEntryRow> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canReview(req)) throw new ForbiddenError('only institution head or assistant manager can correct distribution entries');
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundError('distribution entry not found');
    if (existing.status !== 'FINALIZED') {
      throw new ValidationError('only finalized entries follow the controlled correction workflow');
    }
    const field = String(body.field ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!DIST_EDITABLE_FIELDS.includes(field as DistField)) {
      throw new ValidationError(`field must be one of ${DIST_EDITABLE_FIELDS.join(', ')}`);
    }
    if (!reason) throw new ValidationError('reason for correction is required');
    const previousValue = existing[field as DistField];
    const isQty = ITEM_FIELDS.some((i) => i.key === field) || field === 'sourceColumn10' || field === 'sourceColumn11';
    const newValue = field === 'date' || field === 'distributionDate' ? parseDate(body.value) : isQty ? parseQty(body.value) : String(body.value ?? '');
    if (String(previousValue ?? '') === String(newValue ?? '')) {
      throw new ValidationError('no change detected; corrected value is identical');
    }
    const changes = [
      ...(existing.changes as unknown[]),
      { field, previousValue, newValue, reason, changedBy: req.sessionUser!.userId, changedAt: new Date() },
    ];
    const updated = await this.repo.update(tenantId, id, { [field]: newValue, changes, updatedBy: req.sessionUser!.userId });
    if (!updated) throw new NotFoundError('distribution entry not found');
    return updated;
  }

  async exportCsv(req: FastifyRequest): Promise<string> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['entryNumber', 'date', 'personName', 'class', 'clothesWashingPowder', 'clothesWashingSoap', 'bathingSoap', 'toothPowder', 'paste', 'brush', 'sourceColumn10', 'sourceColumn11', 'distributionDate', 'superintendentSignature', 'remarks', 'status'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    for (const row of result.items) {
      lines.push([
        row.entryNumber,
        row.date ? String(row.date).slice(0, 10) : '',
        row.personName,
        row.className,
        row.clothesWashingPowder,
        row.clothesWashingSoap,
        row.bathingSoap,
        row.toothPowder,
        row.paste,
        row.brush,
        row.sourceColumn10,
        row.sourceColumn11,
        row.distributionDate ? String(row.distributionDate).slice(0, 10) : '',
        row.superintendentSignature,
        row.remarks,
        row.status,
      ].map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  async exportXlsx(req: FastifyRequest): Promise<{ buffer: Buffer; filename: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = ['Sr. No.', 'Date', 'Student Name', 'Class', 'Clothes Washing Powder', 'Clothes Washing Soap', 'Bathing Soap', 'Tooth Powder', 'Toothpaste', 'Toothbrush', 'Source Column 10', 'Source Column 11', 'Distribution Date', "Superintendent's Signature", 'Remarks'];
    const rows = [header, ...result.items.map((r, i) => [
      i + 1,
      r.date ? String(r.date).slice(0, 10) : '',
      r.personName,
      r.className,
      r.clothesWashingPowder,
      r.clothesWashingSoap,
      r.bathingSoap,
      r.toothPowder,
      r.paste,
      r.brush,
      r.sourceColumn10,
      r.sourceColumn11,
      r.distributionDate ? String(r.distributionDate).slice(0, 10) : '',
      r.superintendentSignature,
      r.remarks,
    ])];
    const xmlRows = rows.map((row) => `<row>${row.map((cell) => `<c t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join('')}</row>`).join('');
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
    const buffer = Buffer.from(sheet, 'utf-8');
    return { buffer, filename: `distribution-register-${Date.now()}.xlsx` };
  }

  async exportPdf(req: FastifyRequest): Promise<{ html: string }> {
    const tenantIds = await this.scopedTenantIds(req);
    const result = await this.repo.list(tenantIds, {}, 1, 100000);
    const header = await this.resolveHeader(req);
    const rows = result.items.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.date ? String(r.date).slice(0, 10) : ''}</td>
        <td>${escapeXml(r.personName)}</td>
        <td>${escapeXml(r.className)}</td>
        <td>${r.clothesWashingPowder}</td>
        <td>${r.clothesWashingSoap}</td>
        <td>${r.bathingSoap}</td>
        <td>${r.toothPowder}</td>
        <td>${r.paste}</td>
        <td>${r.brush}</td>
        <td>${r.sourceColumn10}</td>
        <td>${r.sourceColumn11}</td>
        <td>${r.distributionDate ? String(r.distributionDate).slice(0, 10) : ''}</td>
        <td>${escapeXml(r.superintendentSignature)}</td>
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
        <div class="register-name">साबण, निरमा वस्तू वाटप रजिस्टर</div>
        <table>
          <thead><tr>
            <th>अ.क्र.</th><th>दिनांक</th><th>विद्यार्थ्याचे नाव</th><th>वर्ग</th><th>कपड्याची पावडर</th><th>कपड्याचा साबण</th><th>अंघोळीचा साबण</th><th>दंत मंजन</th><th>पेस्ट</th><th>ब्रश</th><th>स्तंभ 10</th><th>स्तंभ 11</th><th>वाटप दिनांक</th><th>अधीक्षक सही</th><th>शेरा</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="15" style="text-align:center">No entries</td></tr>'}</tbody>
        </table>
      </body></html>
    `;
    return { html };
  }

  async history(req: FastifyRequest, id: string): Promise<{ audit: unknown[]; row: DistributionEntryRow }> {
    const tenantIds = await this.scopedTenantIds(req);
    const row = await this.repo.findByIds(tenantIds, id);
    if (!row) throw new NotFoundError('distribution entry not found');
    return { audit: row.changes ?? [], row };
  }
}

export default DistributionService;