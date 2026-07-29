import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { model as getModel } from 'mongoose';
import AIService from '../service/ai.service.js';
import { ok } from '../../../kernel/response/api-response.js';
import { ForbiddenError, ValidationError } from '../../../kernel/errors/app-error.js';
import { resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import {
  isAIReportKind,
  isAIPredictKind,
  AI_REPORT_KINDS,
  AI_PREDICT_KINDS,
  type GenerateReportBody,
} from '../dto/ai.dto.js';

interface Intent {
  patterns: RegExp[];
  module: string;
  buildFilter: (query: string, tenantId: string | null) => Record<string, unknown>;
  describe: (query: string) => string;
}

function monthRange(): { $gte: Date; $lte: Date } {
  const now = new Date();
  return {
    $gte: new Date(now.getFullYear(), now.getMonth(), 1),
    $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  };
}

function daysFromNow(days: number): { $lte: Date } {
  return { $lte: new Date(Date.now() + days * 86400000) };
}

const INTENTS: Intent[] = [
  {
    patterns: [/residents? admitted (this month|monthly)/i, /admissions? this month/i, /या महिन्यात प्रवेश/i],
    module: 'Erp_admissions',
    buildFilter: (_q, tenantId) => ({ ...(tenantId ? { tenantId } : {}), applicationDate: monthRange(), deletedAt: null }),
    describe: () => 'Admissions this month',
  },
  {
    patterns: [/medicines? expir/i, /expiry/i, /औषध.*expir/i],
    module: 'Erp_pharmacy_stock',
    buildFilter: (_q, tenantId) => ({ ...(tenantId ? { tenantId } : {}), expiryDate: daysFromNow(30), deletedAt: null }),
    describe: () => 'Medicines expiring within 30 days',
  },
  {
    patterns: [/pending inspections?/i, /inspections? pending/i],
    module: 'Inspection',
    buildFilter: (_q, tenantId) => ({ ...(tenantId ? { tenantId } : {}), status: 'scheduled' }),
    describe: () => 'Pending inspections',
  },
  {
    patterns: [/low stock/i, /reorder/i, /कमी साठा/i],
    module: 'Erp_inventory-items',
    buildFilter: (_q, tenantId) => ({
      ...(tenantId ? { tenantId } : {}),
      $expr: { $lte: ['$currentStock', '$reorderLevel'] },
      deletedAt: null,
    }),
    describe: () => 'Items at or below reorder level',
  },
  {
    patterns: [/pending complaints?/i, /open complaints?/i, /तक्रार/i],
    module: 'Erp_complaints',
    buildFilter: (_q, tenantId) => ({
      ...(tenantId ? { tenantId } : {}),
      status: { $in: ['open', 'investigating'] },
      deletedAt: null,
    }),
    describe: () => 'Pending complaints',
  },
  {
    patterns: [/active residents?/i, /current residents?/i, /रहिवासी/i],
    module: 'Erp_residents',
    buildFilter: (_q, tenantId) => ({ ...(tenantId ? { tenantId } : {}), status: 'active', deletedAt: null }),
    describe: () => 'Active residents',
  },
  {
    patterns: [/vacant beds?/i, /available beds?/i, /beds? available/i, /रिक्त पलंग/i],
    module: 'Erp_beds',
    buildFilter: (_q, tenantId) => ({ ...(tenantId ? { tenantId } : {}), status: 'vacant', deletedAt: null }),
    describe: () => 'Available beds',
  },
  {
    patterns: [/pending approvals?/i, /approvals? pending/i],
    module: 'Approval',
    buildFilter: (_q, tenantId) => ({ ...(tenantId ? { tenantId } : {}), status: 'pending' }),
    describe: () => 'Pending approvals',
  },
  {
    patterns: [/active emergencies/i, /emergency alerts?/i, /आपत्काल/i],
    module: 'Erp_emergencies',
    buildFilter: (_q, tenantId) => ({ ...(tenantId ? { tenantId } : {}), status: 'active', deletedAt: null }),
    describe: () => 'Active emergencies',
  },
  {
    patterns: [/birthdays?/i, /वाढदिवस/i],
    module: 'Erp_residents',
    buildFilter: (_q, tenantId) => ({ ...(tenantId ? { tenantId } : {}), status: 'active', deletedAt: null }),
    describe: () => 'Residents (birthday data in DOB field)',
  },
];

const SEARCH_MODULES: { code: string; model: string; fields: string[] }[] = [
  { code: 'residents', model: 'Erp_residents', fields: ['fullName', 'residentNumber', 'aadhaar'] },
  { code: 'employees', model: 'Erp_employees', fields: ['fullName', 'employeeCode'] },
  { code: 'medicines', model: 'Erp_medicines', fields: ['name', 'category'] },
  { code: 'donations', model: 'Erp_donations', fields: ['donorName', 'receiptNumber'] },
  { code: 'complaints', model: 'Erp_complaints', fields: ['subject', 'complainantName'] },
  { code: 'assets', model: 'Erp_assets', fields: ['name', 'assetCode'] },
  { code: 'visitors', model: 'Erp_visitors', fields: ['visitorName', 'phone'] },
  { code: 'vendors', model: 'Erp_vendors', fields: ['name', 'gst'] },
];

export class AIController {
  constructor(private readonly service: AIService = new AIService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];

    app.post<{ Params: { kind: string }; Body: GenerateReportBody }>(
      '/ai/reports/:kind',
      { preHandler: readGuard },
      async (req, reply) => {
        const { kind } = req.params;
        if (!isAIReportKind(kind)) {
          throw new ValidationError(`kind must be one of ${AI_REPORT_KINDS.join(', ')}`);
        }
        const result = await this.service.generateReport(req, kind, req.body);
        await app.auditHook(req, 'ai-report', `ai:report:${kind}`, result.id);
        reply.send(ok(result));
      },
    );

    app.post<{ Params: { kind: string } }>('/ai/predict/:kind', { preHandler: readGuard }, async (req, reply) => {
      const { kind } = req.params;
      if (!isAIPredictKind(kind)) {
        throw new ValidationError(`kind must be one of ${AI_PREDICT_KINDS.join(', ')}`);
      }
      const result = await this.service.predictiveAnalytics(req, kind);
      await app.auditHook(req, 'ai-predict', `ai:predict:${kind}`, result.id);
      reply.send(ok(result));
    });

    app.post('/ai/ask', { preHandler: [app.authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
      const { query } = (req.body ?? {}) as { query?: string };
      if (!query || typeof query !== 'string') {
        reply.send(ok({ answer: 'Please provide a question.', results: [], intent: null }));
        return;
      }
      const su = req.sessionUser;
      if (!su) throw new ForbiddenError();
      const tenantId = su.tier === 'government' ? null : resolvedTenantId(req);

      const intent = INTENTS.find((i) => i.patterns.some((p) => p.test(query)));
      if (!intent) {
        reply.send(
          ok({
            answer:
              'I could not map that question to a report yet. Try: "residents admitted this month", "medicines expiring", "low stock", "pending complaints", "vacant beds", "pending inspections".',
            results: [],
            intent: null,
          }),
        );
        return;
      }

      const Model = getModel(intent.module);
      const filter = intent.buildFilter(query, tenantId);
      const docs = await Model.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      reply.send(
        ok({
          answer: `${intent.describe(query)} — ${docs.length} record(s) found.`,
          intent: intent.module,
          count: docs.length,
          results: docs.map((d) => ({ ...d, id: String(d._id) })),
        }),
      );
    });

    app.get('/search', { preHandler: [app.authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
      const { q } = req.query as { q?: string };
      if (!q || q.length < 2) {
        reply.send(ok({ results: [] }));
        return;
      }
      const su = req.sessionUser;
      if (!su) throw new ForbiddenError();
      const tenantId = su.tier === 'government' ? null : resolvedTenantId(req);

      const out: { module: string; id: string; label: string }[] = [];
      for (const m of SEARCH_MODULES) {
        const Model = getModel(m.model);
        const filter: Record<string, unknown> = {
          deletedAt: null,
          $or: m.fields.map((f) => ({ [f]: { $regex: q, $options: 'i' } })),
        };
        if (tenantId) filter.tenantId = tenantId;
        const docs = await Model.find(filter).limit(5).lean();
        for (const d of docs) {
          const rec = d as Record<string, unknown>;
          const label = m.fields.map((f) => rec[f]).filter(Boolean).join(' — ');
          out.push({ module: m.code, id: String(d._id), label });
        }
      }
      reply.send(ok({ results: out.slice(0, 25) }));
    });
  }
}

export default AIController;
