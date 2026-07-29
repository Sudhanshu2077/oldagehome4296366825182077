import type { FastifyRequest } from 'fastify';
import { model as getModel } from 'mongoose';
import { AIJobRepository, type AIJobRow } from '../repository/ai.repository.js';
import ReportRepository, { type DateRange } from '../../reports/repository/report.repository.js';
import { resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError, ValidationError } from '../../../kernel/errors/app-error.js';
import type { AIReportKind, AIPredictKind, GenerateReportBody } from '../dto/ai.dto.js';

export class AIService {
  constructor(
    private readonly jobs: AIJobRepository = new AIJobRepository(),
    private readonly reports: ReportRepository = new ReportRepository(),
  ) {}

  private assertAccess(req: FastifyRequest): void {
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError();
    if (su.tier === 'external') throw new ForbiddenError('ai access denied');
  }

  private baseFilter(req: FastifyRequest): Record<string, unknown> {
    const su = req.sessionUser!;
    if (su.tier === 'government') return {};
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    return { tenantId };
  }

  private parseRange(params?: Record<string, unknown>): DateRange {
    const from = params?.from ? new Date(String(params.from)) : undefined;
    const to = params?.to ? new Date(String(params.to)) : undefined;
    return { from, to };
  }

  async generateReport(req: FastifyRequest, kind: AIReportKind, body: GenerateReportBody): Promise<AIJobRow> {
    this.assertAccess(req);
    const tenantId = resolvedTenantId(req);
    const su = req.sessionUser!;
    const job = await this.jobs.create({
      tenantId,
      kind,
      prompt: body.prompt ?? '',
      createdBy: su.userId,
    });
    try {
      const range = this.parseRange(body.params);
      const result = await this.buildReport(req, kind, range, body.params);
      return (await this.jobs.complete(job.id, result)) ?? job;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      return (await this.jobs.fail(job.id, message)) ?? job;
    }
  }

  private async buildReport(
    req: FastifyRequest,
    kind: AIReportKind,
    range: DateRange,
    params?: Record<string, unknown>,
  ): Promise<unknown> {
    switch (kind) {
      case 'admission':
        return this.wrap('Admissions Report', await this.reports.admissions(req, range));
      case 'medical':
        return this.wrap('Medical Report', await this.reports.medical(req, range));
      case 'finance':
        return this.wrap('Finance Report', await this.reports.finance(req, range));
      case 'inventory':
        return this.wrap('Inventory Report', await this.reports.inventory(req, range));
      case 'monthly':
        return this.wrap('Monthly Summary', await this.reports.monthly(req, range));
      case 'custom': {
        const prompt = typeof params?.prompt === 'string' ? params.prompt : 'custom prompt';
        return this.wrap('Custom Report', { prompt, note: 'LLM provider not configured; returning rule-based scaffold' });
      }
      default:
        throw new ValidationError(`unsupported report kind: ${kind}`);
    }
  }

  private wrap(title: string, data: unknown): Record<string, unknown> {
    return {
      title,
      generatedAt: new Date().toISOString(),
      summary: 'Rule-based scaffolding result',
      data,
    };
  }

  async predictiveAnalytics(req: FastifyRequest, kind: AIPredictKind): Promise<AIJobRow> {
    this.assertAccess(req);
    const tenantId = resolvedTenantId(req);
    const su = req.sessionUser!;
    const job = await this.jobs.create({
      tenantId,
      kind,
      prompt: kind,
      createdBy: su.userId,
    });
    try {
      const result = await this.buildPrediction(req, kind);
      return (await this.jobs.complete(job.id, result)) ?? job;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      return (await this.jobs.fail(job.id, message)) ?? job;
    }
  }

  private async buildPrediction(req: FastifyRequest, kind: AIPredictKind): Promise<unknown> {
    const filter = this.baseFilter(req);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 86400000);

    switch (kind) {
      case 'medicine-shortage': {
        const stock = getModel('Erp_pharmacy_stock');
        const [expiring, expired] = await Promise.all([
          stock.countDocuments({ ...filter, deletedAt: null, expiryDate: { $lte: thirtyDays } }),
          stock.countDocuments({ ...filter, deletedAt: null, expiryDate: { $lt: now } }),
        ]);
        return {
          risk: expired > 0 ? 'high' : expiring > 0 ? 'medium' : 'low',
          expiring,
          expired,
          insight: 'Review expiring batches and plan replenishment',
        };
      }
      case 'low-stock': {
        const items = getModel('Erp_inventory-items');
        const low = (await items
          .find({ ...filter, deletedAt: null, $expr: { $lte: ['$currentStock', '$reorderLevel'] } })
          .select('name currentStock reorderLevel')
          .lean()) as Record<string, unknown>[];
        return {
          risk: low.length > 5 ? 'high' : low.length > 0 ? 'medium' : 'low',
          count: low.length,
          items: low,
        };
      }
      case 'health-risk': {
        const residents = getModel('Erp_residents');
        const records = getModel('Erp_medical-records');
        const [active, critical] = await Promise.all([
          residents.countDocuments({ ...filter, deletedAt: null, status: 'active' }),
          records.countDocuments({ ...filter, deletedAt: null, diagnosis: { $regex: 'critical|severe', $options: 'i' } }),
        ]);
        return {
          risk: critical > 0 ? 'high' : active > 0 ? 'medium' : 'low',
          activeResidents: active,
          criticalRecords: critical,
        };
      }
      case 'budget-variance': {
        const budgets = getModel('Erp_budgets');
        const rows = (await budgets
          .find({ ...filter, deletedAt: null, status: 'approved' })
          .select('department allocated spent')
          .lean()) as Record<string, unknown>[];
        const variances = rows.map((r) => ({
          department: r.department,
          allocated: r.allocated,
          spent: r.spent,
          variance: Number(r.allocated ?? 0) - Number(r.spent ?? 0),
        }));
        const overspent = variances.filter((v) => v.variance < 0).length;
        return {
          risk: overspent > 0 ? 'high' : 'low',
          variances,
          overspent,
        };
      }
      case 'donation-trends': {
        const donations = getModel('Erp_donations');
        const [count, amount] = await Promise.all([
          donations.countDocuments({ ...filter, deletedAt: null }),
          donations.aggregate([{ $match: { ...filter, deletedAt: null } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        ]);
        return {
          trend: count > 0 ? 'positive' : 'neutral',
          count,
          totalAmount: (amount[0] as Record<string, unknown> | undefined)?.total ?? 0,
        };
      }
      case 'grant-utilization': {
        const grants = getModel('Erp_grants');
        const rows = (await grants
          .find({ ...filter, deletedAt: null })
          .select('grantName approvedAmount utilizedAmount status')
          .lean()) as Record<string, unknown>[];
        const utilization = rows.map((r) => {
          const approved = Number(r.approvedAmount ?? 0);
          const utilized = Number(r.utilizedAmount ?? 0);
          return {
            name: r.grantName,
            approved,
            utilized,
            rate: approved > 0 ? utilized / approved : 0,
          };
        });
        const low = utilization.filter((u) => u.approved > 0 && u.rate < 0.5).length;
        return {
          risk: low > 0 ? 'medium' : 'low',
          utilization,
          lowUtilizationCount: low,
        };
      }
      case 'inspection-priority': {
        const inspections = getModel('Inspection');
        const [pending, overdue] = await Promise.all([
          inspections.countDocuments({ ...filter, status: 'scheduled' }),
          inspections.countDocuments({ ...filter, status: 'scheduled', scheduledDate: { $lt: now } }),
        ]);
        return {
          risk: overdue > 0 ? 'high' : pending > 0 ? 'medium' : 'low',
          pending,
          overdue,
        };
      }
      case 'emergency-risk': {
        const emergencies = getModel('Erp_emergencies');
        const active = await emergencies.countDocuments({ ...filter, deletedAt: null, status: 'active' });
        return {
          risk: active > 0 ? 'high' : 'low',
          activeEmergencies: active,
        };
      }
      default:
        throw new ValidationError(`unsupported prediction kind: ${kind}`);
    }
  }
}

export default AIService;
