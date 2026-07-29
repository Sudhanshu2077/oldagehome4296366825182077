import type { FastifyRequest } from 'fastify';
import HealthMonitoringRepository from '../repository/health-monitoring.repository.js';
import { ForbiddenError, ValidationError } from '../../../kernel/errors/app-error.js';
import { OVERALL_STATUS_VALUES, REPORT_TYPE_VALUES, VITAL_TYPE_VALUES, type VitalType } from '../entity/health-monitoring.entity.js';

function isValidVitalValue(v: unknown): v is string | number {
  return typeof v === 'string' || typeof v === 'number';
}

function parseDate(v: unknown): Date {
  if (v === undefined || v === null || v === '') throw new ValidationError('date is required');
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError('invalid date');
  return d;
}

function isValidVitalType(v: unknown): v is VitalType {
  return typeof v === 'string' && VITAL_TYPE_VALUES.includes(v as VitalType);
}

function trimToDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function periodEndFor(reportType: 'weekly' | 'monthly', periodStart: Date): Date {
  const end = new Date(periodStart);
  if (reportType === 'weekly') {
    end.setDate(end.getDate() + 6);
  } else {
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
  }
  return end;
}

export class HealthMonitoringService {
  constructor(private readonly repo: HealthMonitoringRepository = new HealthMonitoringRepository()) {}

  private assertInstitution(req: FastifyRequest): void {
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError();
    if (su.tier !== 'institution') throw new ForbiddenError('health monitoring restricted to institution users');
  }

  async listDailyStatus(req: FastifyRequest, residentId?: string, from?: string, to?: string) {
    this.assertInstitution(req);
    const dateFrom = from ? parseDate(from) : undefined;
    const dateTo = to ? parseDate(to) : undefined;
    return this.repo.listDailyStatus(req, residentId, dateFrom, dateTo);
  }

  async createDailyStatus(req: FastifyRequest, body: Record<string, unknown>) {
    this.assertInstitution(req);
    const residentId = String(body.residentId ?? '');
    if (!residentId) throw new ValidationError('residentId is required');
    const overallStatus = String(body.overallStatus ?? '');
    if (!OVERALL_STATUS_VALUES.includes(overallStatus as typeof OVERALL_STATUS_VALUES[number])) {
      throw new ValidationError(`overallStatus must be one of ${OVERALL_STATUS_VALUES.join(', ')}`);
    }
    return this.repo.createDailyStatus(req, {
      residentId,
      date: parseDate(body.date),
      overallStatus,
      notes: body.notes ? String(body.notes) : undefined,
    });
  }

  async updateDailyStatus(req: FastifyRequest, id: string, body: Record<string, unknown>) {
    this.assertInstitution(req);
    return this.repo.updateDailyStatus(req, id, {
      overallStatus: body.overallStatus ? String(body.overallStatus) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : undefined,
      date: body.date ? parseDate(body.date) : undefined,
    });
  }

  async listVitals(req: FastifyRequest, residentId?: string, type?: string, from?: string, to?: string) {
    this.assertInstitution(req);
    const vitalType = type ? this.requireVitalType(type) : undefined;
    const dateFrom = from ? parseDate(from) : undefined;
    const dateTo = to ? parseDate(to) : undefined;
    return this.repo.listVitals(req, residentId, vitalType, dateFrom, dateTo);
  }

  async createVital(req: FastifyRequest, body: Record<string, unknown>) {
    this.assertInstitution(req);
    const residentId = String(body.residentId ?? '');
    if (!residentId) throw new ValidationError('residentId is required');
    const type = this.requireVitalType(String(body.type ?? ''));
    if (!isValidVitalValue(body.value)) throw new ValidationError('value must be a string or number');
    const unit = String(body.unit ?? '');
    if (!unit) throw new ValidationError('unit is required');
    return this.repo.createVital(req, {
      residentId,
      date: parseDate(body.date),
      type,
      value: body.value,
      unit,
      notes: body.notes ? String(body.notes) : undefined,
    });
  }

  async updateVital(req: FastifyRequest, id: string, body: Record<string, unknown>) {
    this.assertInstitution(req);
    if (body.value !== undefined && !isValidVitalValue(body.value)) throw new ValidationError('value must be a string or number');
    return this.repo.updateVital(req, id, {
      type: body.type ? this.requireVitalType(String(body.type)) : undefined,
      value: body.value,
      unit: body.unit !== undefined ? String(body.unit) : undefined,
      date: body.date ? parseDate(body.date) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : undefined,
    });
  }

  async getVitalTrends(req: FastifyRequest, residentId: string, type: string, months: string) {
    this.assertInstitution(req);
    if (!residentId) throw new ValidationError('residentId is required');
    const vitalType = this.requireVitalType(type);
    const m = Number(months);
    if (!Number.isFinite(m) || m < 1 || m > 12) throw new ValidationError('months must be between 1 and 12');
    return this.repo.aggregateVitalTrends(req, residentId, vitalType, m);
  }

  async listReports(req: FastifyRequest, residentId?: string, reportType?: string) {
    this.assertInstitution(req);
    if (reportType && !REPORT_TYPE_VALUES.includes(reportType as 'weekly' | 'monthly')) {
      throw new ValidationError('reportType must be weekly or monthly');
    }
    return this.repo.listReports(req, residentId, reportType);
  }

  async generateReport(req: FastifyRequest, body: Record<string, unknown>) {
    this.assertInstitution(req);
    const residentId = String(body.residentId ?? '');
    if (!residentId) throw new ValidationError('residentId is required');
    const reportType = String(body.reportType ?? '');
    if (!REPORT_TYPE_VALUES.includes(reportType as 'weekly' | 'monthly')) {
      throw new ValidationError('reportType must be weekly or monthly');
    }
    const periodStart = trimToDay(parseDate(body.periodStart));
    const periodEnd = body.periodEnd ? trimToDay(parseDate(body.periodEnd)) : periodEndFor(reportType as 'weekly' | 'monthly', periodStart);
    if (periodStart.getTime() > periodEnd.getTime()) throw new ValidationError('periodStart must be before or equal to periodEnd');
    return this.repo.generateReport(req, {
      residentId,
      reportType: reportType as 'weekly' | 'monthly',
      periodStart,
      periodEnd,
      summary: body.summary ? String(body.summary) : undefined,
    });
  }

  async getReport(req: FastifyRequest, id: string) {
    this.assertInstitution(req);
    return this.repo.getReportById(req, id);
  }

  private requireVitalType(v: string): VitalType {
    if (!isValidVitalType(v)) {
      throw new ValidationError(`type must be one of ${VITAL_TYPE_VALUES.join(', ')}`);
    }
    return v;
  }
}

export default HealthMonitoringService;
