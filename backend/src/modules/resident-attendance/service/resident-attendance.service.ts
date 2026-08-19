import type { FastifyInstance, FastifyRequest } from 'fastify';
import { model as mongooseModel, type Document } from 'mongoose';
import AttRepository, { type AttSessionRow } from '../repository/resident-attendance.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { MasterDataModel } from '../../master-data/entity/master-data.entity.js';
import { ATT_STATUSES, type AttStatus } from '../entity/resident-attendance.entity.js';

export interface AttHeader {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

export interface EligibleResident {
  id: string;
  residentNumber: string;
  fullName: string;
  gender: string;
  photoUrl: string;
  roomId: string | null;
  roomName: string;
  bedId: string | null;
  bedName: string;
  admissionDate: string | null;
  status: string;
}

export interface AttMeta {
  header: AttHeader;
  statuses: readonly string[];
  residents: EligibleResident[];
  session: AttSessionRow | null;
  date: string;
}

export interface AttSummary {
  total: number;
  marked: number;
  unmarked: number;
  present: number;
  absent: number;
  onLeave: number;
  medical: number;
  temporarilyOut: number;
  other: number;
}

function normalizeDate(v: unknown): Date {
  const s = String(v ?? '');
  const d = s ? new Date(s) : new Date();
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${s}`);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtDate(v: Date): string {
  const y = v.getFullYear();
  const m = String(v.getMonth() + 1).padStart(2, '0');
  const d = String(v.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function statusCode(status: string): string {
  switch (status) {
    case 'PRESENT': return 'P';
    case 'ABSENT': return 'A';
    case 'ON_LEAVE': return 'L';
    case 'MEDICAL': return 'M';
    case 'TEMPORARILY_OUT': return 'T';
    default: return 'O';
  }
}

export class AttService {
  constructor(private readonly repo: AttRepository = new AttRepository()) {}

  private canMark(req: FastifyRequest): boolean {
    const su = req.sessionUser;
    if (!su || su.tier !== 'institution') return false;
    return su.role === 'assistant-manager' || su.role === 'department-user';
  }

  private canReview(req: FastifyRequest): boolean {
    const su = req.sessionUser;
    if (!su || su.tier !== 'institution') return false;
    return su.role === 'institution-head' || su.role === 'assistant-manager';
  }

  private async resolveHeader(req: FastifyRequest): Promise<AttHeader> {
    const tenantId = resolvedTenantId(req);
    const header: AttHeader = { officeName: '', officeNameMr: '', talukaName: '', districtName: '' };
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
    throw new ForbiddenError('resident attendance register access denied');
  }

  private async loadEligibleResidents(tenantId: string, date: Date): Promise<EligibleResident[]> {
    try {
      const ErpResidents = mongooseModel<Document>('Erp_residents');
      const ErpRooms = mongooseModel<Document>('Erp_rooms');
      const ErpBeds = mongooseModel<Document>('Erp_beds');
      const docs = await ErpResidents.find({ tenantId, deletedAt: null }).sort({ fullName: 1 }).limit(5000).lean();
      const residents: EligibleResident[] = [];
      for (const d of docs) {
        const r = d as unknown as Record<string, unknown>;
        const status = String(r.status ?? '');
        const admissionDate = r.admissionDate ? new Date(String(r.admissionDate)) : null;
        if (status === 'discharged' || status === 'transferred' || status === 'deceased') continue;
        if (admissionDate && admissionDate.getTime() > date.getTime()) continue;
        let roomName = '';
        let bedName = '';
        if (r.roomId) {
          try {
            const room = await ErpRooms.findOne({ _id: r.roomId, tenantId }).lean();
            if (room) roomName = String((room as Record<string, unknown>).name ?? '');
          } catch { /* room missing */ }
        }
        if (r.bedId) {
          try {
            const bed = await ErpBeds.findOne({ _id: r.bedId, tenantId }).lean();
            if (bed) bedName = String((bed as Record<string, unknown>).name ?? '');
          } catch { /* bed missing */ }
        }
        residents.push({
          id: String(r._id),
          residentNumber: String(r.residentNumber ?? ''),
          fullName: String(r.fullName ?? ''),
          gender: String(r.gender ?? ''),
          photoUrl: String(r.photoUrl ?? ''),
          roomId: r.roomId ? String(r.roomId) : null,
          roomName,
          bedId: r.bedId ? String(r.bedId) : null,
          bedName,
          admissionDate: admissionDate ? fmtDate(admissionDate) : null,
          status,
        });
      }
      return residents;
    } catch {
      return [];
    }
  }

  private summarize(entries: { status: string }[]): AttSummary {
    const summary: AttSummary = { total: 0, marked: 0, unmarked: 0, present: 0, absent: 0, onLeave: 0, medical: 0, temporarilyOut: 0, other: 0 };
    for (const e of entries) {
      summary.total += 1;
      summary.marked += 1;
      switch (e.status) {
        case 'PRESENT': summary.present += 1; break;
        case 'ABSENT': summary.absent += 1; break;
        case 'ON_LEAVE': summary.onLeave += 1; break;
        case 'MEDICAL': summary.medical += 1; break;
        case 'TEMPORARILY_OUT': summary.temporarilyOut += 1; break;
        default: summary.other += 1; break;
      }
    }
    return summary;
  }

  private async ensureSession(req: FastifyRequest, tenantId: string, date: Date): Promise<AttSessionRow> {
    const existing = await this.repo.findByDate(tenantId, date);
    if (existing) return existing;
    const eligible = await this.loadEligibleResidents(tenantId, date);
    const sessionId = await this.repo.nextSessionId(tenantId, date);
    return this.repo.createSession({
      tenantId,
      attendanceDate: new Date(date),
      sessionId,
      status: 'DRAFT',
      entries: eligible.map((r) => ({
        residentId: r.id,
        residentNumber: r.residentNumber,
        fullName: r.fullName,
        photoUrl: r.photoUrl,
        roomId: r.roomId,
        roomName: r.roomName,
        bedId: r.bedId,
        bedName: r.bedName,
        status: 'PRESENT',
      })),
      createdBy: req.sessionUser?.userId ?? null,
    });
  }

  async getMeta(req: FastifyRequest, dateParam: unknown): Promise<AttMeta> {
    const tenantId = resolvedTenantId(req);
    const date = normalizeDate(dateParam);
    const session = tenantId ? await this.ensureSession(req, tenantId, date) : null;
    const residents = tenantId ? await this.loadEligibleResidents(tenantId, date) : [];
    return {
      header: await this.resolveHeader(req),
      statuses: ATT_STATUSES,
      residents,
      session,
      date: fmtDate(date),
    };
  }

  async listSessions(req: FastifyRequest, page: number, pageSize: number) {
    const tenantIds = await this.scopedTenantIds(req);
    return this.repo.list(tenantIds, page, pageSize);
  }

  async mark(req: FastifyRequest, dateParam: unknown, body: Record<string, unknown>): Promise<{ session: AttSessionRow; summary: AttSummary }> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canMark(req)) throw new ForbiddenError('write access denied');
    const date = normalizeDate(dateParam);
    const session = await this.ensureSession(req, tenantId, date);
    if (session.status !== 'DRAFT') throw new ValidationError('submitted attendance cannot be edited directly; use the correction workflow');

    const residentIds = new Set(body.residentIds as string[] | undefined ?? []);
    const statusMap = (body.statusMap ?? {}) as Record<string, string>;
    const reasonMap = (body.reasonMap ?? {}) as Record<string, string>;
    const presentAll = Boolean(body.presentAll);

    const eligible = await this.loadEligibleResidents(tenantId, date);
    const eligibleIds = new Set(eligible.map((r) => r.id));
    const existingIds = new Set(session.entries.map((e) => String(e.residentId)));
    const mergedEntries = session.entries.filter((e) => eligibleIds.has(String(e.residentId)));
    for (const r of eligible) {
      if (!existingIds.has(r.id)) {
        mergedEntries.push({
          residentId: r.id,
          residentNumber: r.residentNumber,
          fullName: r.fullName,
          photoUrl: r.photoUrl,
          roomId: r.roomId,
          roomName: r.roomName,
          bedId: r.bedId,
          bedName: r.bedName,
          status: 'PRESENT',
          reason: '',
          markedBy: null,
          markedAt: new Date(),
        });
      }
    }

    const entries = mergedEntries.map((e) => {
      const residentId = e.residentId as string;
      if (presentAll && residentIds.size === 0) {
        return { ...e, status: 'PRESENT', reason: '', markedBy: req.sessionUser!.userId, markedAt: new Date() };
      }
      if (residentIds.size > 0 && !residentIds.has(residentId)) return e;
      const raw = statusMap[residentId];
      const status = raw ? String(raw) : (presentAll ? 'PRESENT' : e.status);
      if (!ATT_STATUSES.includes(status as AttStatus)) {
        throw new ValidationError(`invalid attendance status for ${residentId}: ${status}`);
      }
      const reason = String(reasonMap[residentId] ?? '').trim();
      if ((status === 'ABSENT' || status === 'MEDICAL' || status === 'TEMPORARILY_OUT') && !reason) {
        throw new ValidationError(`reason is required for ${status} status of ${residentId}`);
      }
      return { ...e, status, reason, markedBy: req.sessionUser!.userId, markedAt: new Date() };
    });

    const updated = await this.repo.update(tenantId, session.id, {
      entries,
      status: 'DRAFT',
      updatedBy: req.sessionUser!.userId,
    });
    if (!updated) throw new NotFoundError('attendance session not found');
    return { session: updated, summary: this.summarize(updated.entries) };
  }

  async submit(app: FastifyInstance, req: FastifyRequest, dateParam: unknown): Promise<{ session: AttSessionRow; summary: AttSummary }> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canMark(req)) throw new ForbiddenError('write access denied');
    const date = normalizeDate(dateParam);
    const session = await this.repo.findByDate(tenantId, date);
    if (!session) throw new NotFoundError('attendance session not found');
    if (session.status === 'SUBMITTED') throw new ValidationError('attendance is already submitted');

    const eligible = await this.loadEligibleResidents(tenantId, date);
    const sessionIds = new Set(session.entries.map((e) => String(e.residentId)));
    const unmarked = eligible.filter((r) => !sessionIds.has(r.id));
    if (unmarked.length > 0) {
      throw new ValidationError(`attendance is incomplete; ${unmarked.length} resident(s) have not been marked`);
    }
    const summary = this.summarize(session.entries);
    const updated = await this.repo.update(tenantId, session.id, {
      status: 'SUBMITTED',
      submittedBy: req.sessionUser!.userId,
      submittedAt: new Date(),
      updatedBy: req.sessionUser!.userId,
    });
    if (!updated) throw new NotFoundError('attendance session not found');
    await app.auditHook(req, 'submit', 'resident-attendance', updated.id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'resident-attendance', action: 'submitted', sessionId: updated.sessionId });
    return { session: updated, summary };
  }

  async correct(app: FastifyInstance, req: FastifyRequest, dateParam: unknown, body: Record<string, unknown>): Promise<{ session: AttSessionRow; correction: unknown }> {
    const tenantId = assertTenantWriteAccess(req);
    if (!this.canMark(req) && !this.canReview(req)) throw new ForbiddenError('attendance correction requires authorized staff or management permission');
    const date = normalizeDate(dateParam);
    const session = await this.repo.findByDate(tenantId, date);
    if (!session) throw new NotFoundError('attendance session not found');
    if (session.status !== 'SUBMITTED') throw new ValidationError('only submitted attendance can be corrected');

    const residentId = String(body.residentId ?? '');
    const newStatusRaw = String(body.status ?? '');
    const reason = String(body.reason ?? '').trim();
    if (!residentId) throw new ValidationError('residentId is required');
    if (!ATT_STATUSES.includes(newStatusRaw as AttStatus)) {
      throw new ValidationError(`invalid attendance status: ${newStatusRaw}`);
    }
    if (!reason) throw new ValidationError('reason for correction is required');
    if ((newStatusRaw === 'ABSENT' || newStatusRaw === 'MEDICAL' || newStatusRaw === 'TEMPORARILY_OUT') && !reason.trim()) {
      throw new ValidationError('reason is required for this corrected status');
    }

    const existingEntry = session.entries.find((e) => String(e.residentId) === residentId);
    if (!existingEntry) throw new ValidationError('resident is not part of this attendance session');
    if (existingEntry.status === newStatusRaw) {
      throw new ValidationError('no change detected; corrected status is identical');
    }

    const entries = session.entries.map((e) => {
      if (String(e.residentId) !== residentId) return e;
      return { ...e, status: newStatusRaw, reason, markedBy: req.sessionUser!.userId, markedAt: new Date() };
    });
    const correction = {
      residentId,
      residentNumber: existingEntry.residentNumber,
      fullName: existingEntry.fullName,
      originalStatus: existingEntry.status,
      newStatus: newStatusRaw,
      reason,
      changedBy: req.sessionUser!.userId,
      changedAt: new Date(),
    };
    const corrections = [...(session.corrections as unknown[]), correction];

    const updated = await this.repo.update(tenantId, session.id, {
      entries,
      corrections,
      updatedBy: req.sessionUser!.userId,
    });
    if (!updated) throw new NotFoundError('attendance session not found');
    await app.auditHook(req, 'correct', 'resident-attendance', updated.id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'resident-attendance', action: 'corrected', sessionId: updated.sessionId });
    return { session: updated, correction };
  }

  async history(req: FastifyRequest, dateParam: unknown): Promise<{ corrections: unknown[]; session: AttSessionRow }> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const date = normalizeDate(dateParam);
    const session = await this.repo.findByDate(tenantId, date);
    if (!session) throw new NotFoundError('attendance session not found');
    return { corrections: session.corrections ?? [], session };
  }

  async monthly(req: FastifyRequest, yearParam: unknown, monthParam: unknown): Promise<Record<string, unknown>> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const year = Number(yearParam ?? new Date().getFullYear());
    const month = Number(monthParam ?? new Date().getMonth() + 1);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new ValidationError('year must be between 2000 and 2100');
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new ValidationError('month must be between 1 and 12');
    const daysInMonth = new Date(year, month, 0).getDate();
    const sessions = await this.repo.listMonth(tenantId, year, month);

    const header = await this.resolveHeader(req);
    const residentsMap = new Map<string, { residentNumber: string; fullName: string; days: (string | null)[]; present: number; absent: number; onLeave: number; medical: number; temporarilyOut: number; other: number; totalDays: number }>();
    const dayLabels: string[] = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      dayLabels.push(String(d));
    }
    for (const session of sessions) {
      for (const e of session.entries) {
        const key = String(e.residentId);
        let row = residentsMap.get(key);
        if (!row) {
          row = { residentNumber: e.residentNumber, fullName: e.fullName, days: new Array(daysInMonth).fill(null), present: 0, absent: 0, onLeave: 0, medical: 0, temporarilyOut: 0, other: 0, totalDays: 0 };
          residentsMap.set(key, row);
        }
        const day = session.attendanceDate.getDate() - 1;
        if (day >= 0 && day < daysInMonth) {
          row.days[day] = statusCode(e.status);
          row.totalDays += 1;
          switch (e.status) {
            case 'PRESENT': row.present += 1; break;
            case 'ABSENT': row.absent += 1; break;
            case 'ON_LEAVE': row.onLeave += 1; break;
            case 'MEDICAL': row.medical += 1; break;
            case 'TEMPORARILY_OUT': row.temporarilyOut += 1; break;
            default: row.other += 1; break;
          }
        }
      }
    }
    const rows = Array.from(residentsMap.entries()).map(([residentId, row]) => ({ residentId, ...row }));
    return {
      header,
      year,
      month,
      daysInMonth,
      dayLabels,
      rows,
      attendancePercentage: rows.length > 0 ? Number((rows.reduce((acc, r) => acc + (r.present / (r.totalDays || 1)) * 100, 0) / rows.length).toFixed(1)) : 0,
    };
  }

  async exportDailyCsv(req: FastifyRequest, dateParam: unknown): Promise<string> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const date = normalizeDate(dateParam);
    const session = await this.repo.findByDate(tenantId, date);
    const header = ['srNo', 'residentName', 'residentId', 'status', 'reason'];
    const lines = [header.map((h) => `"${h}"`).join(',')];
    if (session) {
      session.entries.forEach((e, i) => {
        lines.push([i + 1, e.fullName, e.residentNumber, e.status, e.reason].map(escapeCsv).join(','));
      });
    }
    return lines.join('\n');
  }

  async exportDailyPdf(req: FastifyRequest, dateParam: unknown): Promise<{ html: string }> {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const date = normalizeDate(dateParam);
    const header = await this.resolveHeader(req);
    const session = await this.repo.findByDate(tenantId, date);
    const rows = (session?.entries ?? []).map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeXml(e.fullName)}</td>
        <td>${escapeXml(e.residentNumber)}</td>
        <td>${escapeXml(e.status)}</td>
        <td>${escapeXml(e.reason)}</td>
      </tr>`).join('');
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 16px; }
        .heading { text-align: center; font-size: 14px; margin-bottom: 2px; }
        .register-name { text-align: center; font-size: 16px; font-weight: 700; margin: 4px 0; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 3px 4px; font-size: 9px; text-align: left; vertical-align: top; }
        th { background: #eee; }
      </style></head>
      <body>
        <div class="heading">${escapeXml(header.officeNameMr || header.officeName)}</div>
        <div class="sub">${header.districtName ? `जि. ${escapeXml(header.districtName)}` : ''} ${header.talukaName ? `| ता. ${escapeXml(header.talukaName)}` : ''}</div>
        <div class="register-name">वृद्ध निवासी हजेरी नोंदवही / RESIDENT ATTENDANCE REGISTER</div>
        <div class="sub">दिनांक: ${fmtDate(date)}</div>
        <table>
          <thead><tr>
            <th>अ. क्र.</th><th>निवासी यांचे नाव</th><th>निवासी क्र.</th><th>स्थिती</th><th>कारण</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center">No attendance recorded</td></tr>'}</tbody>
        </table>
      </body></html>
    `;
    return { html };
  }

  async exportMonthlyCsv(req: FastifyRequest, yearParam: unknown, monthParam: unknown): Promise<string> {
    const result = await this.monthly(req, yearParam, monthParam);
    const m = result as { dayLabels: string[]; rows: { residentNumber: string; fullName: string; days: (string | null)[]; present: number; absent: number; onLeave: number; medical: number; temporarilyOut: number; other: number; totalDays: number }[] };
    const lines = [`"residentName","residentId",${m.dayLabels.map((d) => `"${d}"`).join(',')},"Present","Absent","Leave","Medical","TempOut","Other","Total"`];
    for (const r of m.rows) {
      lines.push([r.fullName, r.residentNumber, ...r.days.map((d) => d ?? ''), r.present, r.absent, r.onLeave, r.medical, r.temporarilyOut, r.other, r.totalDays].map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  async exportMonthlyPdf(req: FastifyRequest, yearParam: unknown, monthParam: unknown): Promise<{ html: string }> {
    const result = await this.monthly(req, yearParam, monthParam);
    const m = result as { header: AttHeader; year: number; month: number; dayLabels: string[]; rows: { residentNumber: string; fullName: string; days: (string | null)[]; present: number; absent: number; onLeave: number; medical: number; temporarilyOut: number; other: number; totalDays: number }[] };
    const dayHeader = m.dayLabels.map((d) => `<th>${d}</th>`).join('');
    const rows = m.rows.map((r) => `
      <tr>
        <td>${escapeXml(r.fullName)}</td>
        <td>${escapeXml(r.residentNumber)}</td>
        ${r.days.map((d) => `<td>${d ?? ''}</td>`).join('')}
        <td>${r.present}</td><td>${r.absent}</td><td>${r.onLeave}</td><td>${r.medical}</td><td>${r.temporarilyOut}</td><td>${r.other}</td><td>${r.totalDays}</td>
      </tr>`).join('');
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 16px; }
        .heading { text-align: center; font-size: 14px; margin-bottom: 2px; }
        .register-name { text-align: center; font-size: 16px; font-weight: 700; margin: 4px 0; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 2px 3px; font-size: 8px; text-align: center; vertical-align: top; }
        th { background: #eee; }
        .name { text-align: left; }
      </style></head>
      <body>
        <div class="heading">${escapeXml(m.header.officeNameMr || m.header.officeName)}</div>
        <div class="sub">${m.header.districtName ? `जि. ${escapeXml(m.header.districtName)}` : ''} ${m.header.talukaName ? `| ता. ${escapeXml(m.header.talukaName)}` : ''}</div>
        <div class="register-name">वृद्ध निवासी हजेरी नोंदवही / RESIDENT ATTENDANCE REGISTER</div>
        <div class="sub">मासिक अहवाल / MONTHLY REPORT — ${m.month}/${m.year}</div>
        <table>
          <thead><tr><th class="name">नाव / Name</th><th>निवासी क्र.</th>${dayHeader}<th>P</th><th>A</th><th>L</th><th>M</th><th>T</th><th>O</th><th>Total</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="' + (m.dayLabels.length + 10) + '" style="text-align:center">No attendance recorded</td></tr>'}</tbody>
        </table>
      </body></html>
    `;
    return { html };
  }
}

export default AttService;