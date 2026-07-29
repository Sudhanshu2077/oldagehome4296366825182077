import { Types } from 'mongoose';
import type { FastifyRequest } from 'fastify';
import { resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError, NotFoundError } from '../../../kernel/errors/app-error.js';
import { DailyHealthStatusModel, VitalReadingModel, HealthReportModel, type DailyHealthStatusDoc, type VitalReadingDoc, type HealthReportDoc, type VitalType } from '../entity/health-monitoring.entity.js';

export type HealthModelKey = 'daily-status' | 'vitals' | 'reports';

function assertTenantId(req: FastifyRequest): string {
  const tenantId = resolvedTenantId(req);
  if (!tenantId) throw new ForbiddenError('tenant scope required');
  return tenantId;
}

function toRow<T extends { _id: Types.ObjectId; tenantId?: Types.ObjectId | unknown }>(d: T): T & { id: string } {
  return { ...d, id: d._id.toString() };
}

export class HealthMonitoringRepository {
  async listDailyStatus(req: FastifyRequest, residentId?: string, dateFrom?: Date, dateTo?: Date) {
    const tenantId = assertTenantId(req);
    const filter: Record<string, unknown> = { tenantId, deletedAt: null };
    if (residentId) filter.residentId = residentId;
    if (dateFrom || dateTo) {
      const bounds: Record<string, Date> = {};
      if (dateFrom) bounds.$gte = dateFrom;
      if (dateTo) bounds.$lte = dateTo;
      filter.date = bounds;
    }
    const docs = await DailyHealthStatusModel.find(filter).sort({ date: -1 }).limit(500).lean();
    return docs.map((d) => toRow(d as unknown as DailyHealthStatusDoc));
  }

  async createDailyStatus(req: FastifyRequest, input: { residentId: string; date: Date; overallStatus: string; notes?: string | undefined }) {
    const tenantId = assertTenantId(req);
    const doc = await DailyHealthStatusModel.create({
      tenantId,
      residentId: input.residentId,
      date: input.date,
      overallStatus: input.overallStatus,
      notes: input.notes ?? '',
      createdBy: req.sessionUser!.userId,
    });
    return { id: doc._id.toString() };
  }

  async updateDailyStatus(req: FastifyRequest, id: string, input: { overallStatus?: string | undefined; notes?: string | undefined; date?: Date | undefined }) {
    const tenantId = assertTenantId(req);
    const set: Record<string, unknown> = { updatedBy: req.sessionUser!.userId };
    if (input.overallStatus !== undefined) set.overallStatus = input.overallStatus;
    if (input.notes !== undefined) set.notes = input.notes;
    if (input.date !== undefined) set.date = input.date;
    const doc = await DailyHealthStatusModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: set },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) throw new NotFoundError('daily health status not found');
    return toRow(doc as unknown as DailyHealthStatusDoc);
  }

  async listVitals(req: FastifyRequest, residentId?: string, type?: VitalType, dateFrom?: Date, dateTo?: Date) {
    const tenantId = assertTenantId(req);
    const filter: Record<string, unknown> = { tenantId, deletedAt: null };
    if (residentId) filter.residentId = residentId;
    if (type) filter.type = type;
    if (dateFrom || dateTo) {
      const bounds: Record<string, Date> = {};
      if (dateFrom) bounds.$gte = dateFrom;
      if (dateTo) bounds.$lte = dateTo;
      filter.date = bounds;
    }
    const docs = await VitalReadingModel.find(filter).sort({ date: -1 }).limit(1000).lean();
    return docs.map((d) => toRow(d as unknown as VitalReadingDoc));
  }

  private numericValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parts = value.split('/');
      const first = Number(parts[0]);
      if (Number.isFinite(first)) return first;
    }
    return null;
  }

  async createVital(req: FastifyRequest, input: { residentId: string; date: Date; type: VitalType; value: string | number; unit: string; notes?: string | undefined }) {
    const tenantId = assertTenantId(req);
    const doc = await VitalReadingModel.create({
      tenantId,
      residentId: input.residentId,
      date: input.date,
      type: input.type,
      value: input.value,
      unit: input.unit,
      notes: input.notes ?? '',
      createdBy: req.sessionUser!.userId,
    });
    return { id: doc._id.toString() };
  }

  async updateVital(req: FastifyRequest, id: string, input: { type?: VitalType | undefined; value?: string | number | undefined; unit?: string | undefined; date?: Date | undefined; notes?: string | undefined }) {
    const tenantId = assertTenantId(req);
    const set: Record<string, unknown> = { updatedBy: req.sessionUser!.userId };
    if (input.type !== undefined) set.type = input.type;
    if (input.value !== undefined) set.value = input.value;
    if (input.unit !== undefined) set.unit = input.unit;
    if (input.date !== undefined) set.date = input.date;
    if (input.notes !== undefined) set.notes = input.notes;
    const doc = await VitalReadingModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: set },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) throw new NotFoundError('vital reading not found');
    return toRow(doc as unknown as VitalReadingDoc);
  }

  async aggregateVitalTrends(req: FastifyRequest, residentId: string, type: VitalType, months: number) {
    const tenantId = assertTenantId(req);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1, 0, 0, 0, 0);
    const match: Record<string, unknown> = {
      tenantId,
      residentId,
      type,
      date: { $gte: from, $lte: now },
      deletedAt: null,
    };
    const daily = await VitalReadingModel.find(match).sort({ date: 1 }).select('date value unit').lean();
    const numericValues = daily.map((d) => this.numericValue(d.value)).filter((n): n is number => n !== null);
    const avg = numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : null;
    const min = numericValues.length > 0 ? Math.min(...numericValues) : null;
    const max = numericValues.length > 0 ? Math.max(...numericValues) : null;
    return {
      residentId,
      type,
      months,
      from,
      to: now,
      readings: daily.map((d) => ({ date: d.date, value: d.value, unit: d.unit })),
      summary: { count: numericValues.length, avg, min, max },
    };
  }

  async listReports(req: FastifyRequest, residentId?: string, reportType?: string) {
    const tenantId = assertTenantId(req);
    const filter: Record<string, unknown> = { tenantId, deletedAt: null };
    if (residentId) filter.residentId = residentId;
    if (reportType) filter.reportType = reportType;
    const docs = await HealthReportModel.find(filter).sort({ periodStart: -1 }).limit(200).lean();
    return docs.map((d) => toRow(d as unknown as HealthReportDoc));
  }

  async generateReport(req: FastifyRequest, input: { residentId: string; reportType: 'weekly' | 'monthly'; periodStart: Date; periodEnd: Date; summary?: string | undefined }) {
    const tenantId = assertTenantId(req);
    const { residentId, reportType, periodStart, periodEnd } = input;
    const vitals = await VitalReadingModel.find({
      tenantId,
      residentId,
      date: { $gte: periodStart, $lte: periodEnd },
      deletedAt: null,
    }).lean();

    const avg = (type: VitalType) => {
      const vals = vitals.filter((v) => v.type === type).map((v) => this.numericValue(v.value)).filter((n): n is number => n !== null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const bpDiastolicValues = vitals
      .filter((v) => v.type === 'bp')
      .map((v) => (typeof v.value === 'string' ? Number(v.value.split('/')[1]) : null))
      .filter((n): n is number => n !== null && Number.isFinite(n));

    const averages = {
      temperature: avg('temperature'),
      pulse: avg('pulse'),
      systolic: avg('bp'),
      diastolic: bpDiastolicValues.length > 0 ? bpDiastolicValues.reduce((a, b) => a + b, 0) / bpDiastolicValues.length : null,
      sugar: avg('sugar'),
      weight: avg('weight'),
      height: avg('height'),
      bmi: avg('bmi'),
    };

    const doc = await HealthReportModel.create({
      tenantId,
      residentId,
      reportType,
      periodStart,
      periodEnd,
      averages,
      summary: input.summary ?? '',
      createdBy: req.sessionUser!.userId,
    });
    return { id: doc._id.toString(), averages };
  }

  async getReportById(req: FastifyRequest, id: string) {
    const tenantId = assertTenantId(req);
    const doc = await HealthReportModel.findOne({ _id: id, tenantId }).lean();
    if (!doc) throw new NotFoundError('health report not found');
    return toRow(doc as unknown as HealthReportDoc);
  }
}

export default HealthMonitoringRepository;
