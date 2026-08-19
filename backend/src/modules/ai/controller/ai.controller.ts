import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { model as getModel } from 'mongoose';
import AIService from '../service/ai.service.js';
import OpenRouterService, { type ChatMessage } from '../service/openrouter.service.js';
import { ok } from '../../../kernel/response/api-response.js';
import { ForbiddenError, ValidationError } from '../../../kernel/errors/app-error.js';
import { resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { getLogger } from '../../../config/logger.js';

const logger = getLogger();
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
  constructor(
    private readonly service: AIService = new AIService(),
    private readonly llm: OpenRouterService = new OpenRouterService(),
  ) {}

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
      const { query, history } = (req.body ?? {}) as { query?: string; history?: { role: 'user' | 'assistant'; text: string }[] };
      if (!query || typeof query !== 'string') {
        reply.send(ok({ answer: 'Please provide a question.', results: [], intent: null }));
        return;
      }
      const su = req.sessionUser;
      if (!su) throw new ForbiddenError();
      const tenantId = su.tier === 'government' ? null : resolvedTenantId(req);

      const intent = INTENTS.find((i) => i.patterns.some((p) => p.test(query)));
      let contextBlock = '';
      let results: Record<string, unknown>[] = [];
      let intentModule: string | null = intent?.module ?? null;
      let count = 0;
      if (intent) {
        try {
          const Model = getModel(intent.module);
          const filter = intent.buildFilter(query, tenantId);
          const docs = await Model.find(filter).sort({ createdAt: -1 }).limit(25).lean();
          results = docs.map((d) => ({ ...d, id: String((d as { _id: unknown })._id) }));
          count = docs.length;
          const sample = docs.slice(0, 10).map((d) => {
            const r = d as Record<string, unknown>;
            const entries = Object.entries(r)
              .filter(([k]) => !['_id', '__v', 'tenantId', 'createdBy', 'updatedBy', 'deletedAt'].includes(k))
              .map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? '[object]' : String(v)}`)
              .join(', ');
            return `{ ${entries} }`;
          });
          contextBlock = `\n\nLive data retrieved from the system for "${intent.describe(query)}" (${count} total records, showing ${sample.length} samples):\n${sample.join('\n')}`;
        } catch (err) {
          logger.warn({ err: (err as Error).message }, 'ai intent fetch failed');
        }
      }

      const systemPrompt = this.buildSystemPrompt(su, contextBlock, intent?.describe(query) ?? null);

      const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
      const prior = (history ?? []).slice(-6);
      for (const m of prior) {
        if (m && (m.role === 'user' || m.role === 'assistant') && m.text?.trim()) {
          messages.push({ role: m.role, content: m.text });
        }
      }
      messages.push({ role: 'user', content: query });

      let answer = '';
      let model = 'none';
      if (this.llm.configured) {
        const result = await this.llm.chat(messages, 0.3);
        answer = result.content;
        model = result.model;
        if (!answer) {
          logger.warn({ tried: result.tried.map((x) => `${x.model}:${x.ok ? 'ok' : x.reason}`) }, 'openrouter all free models failed; falling back to rule_answer');
        }
      }

      if (!answer) {
        if (intent) {
          answer = `${intent.describe(query)} — ${count} record(s) found.${results.length > 0 ? ' Recent: ' + results.slice(0, 3).map((r) => String(r.fullName ?? r.name ?? r.donorName ?? r.subject ?? r.id)).join(', ') : ''}`;
        } else {
          answer =
            'I could not reach the AI service right now. Try rephrasing, or ask: "residents admitted this month", "medicines expiring", "low stock", "pending complaints", "vacant beds", "pending inspections".';
        }
      }

      reply.send(
        ok({
          answer,
          intent: intentModule,
          count: intent ? count : undefined,
          results,
          model,
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

  private buildSystemPrompt(
    su: { tier: string; role?: string; department?: string | null },
    contextBlock: string,
    intentLabel: string | null,
  ): string {
    const roleLabel = su.role ?? 'user';
    const deptLabel = su.department ?? 'general';
    const tier = su.tier === 'government' ? 'Government officer (read-only oversight)' : su.tier === 'external' ? 'External portal user' : 'Institution staff';
    return [
      'You are the AI assistant for IGOHMS — the Maharashtra Integrated Old Age Home Management System.',
      'It is a government ERP managing old age homes: residents, admissions, medical/health, pharmacy, kitchen, inventory, finance (income, expense, vouchers, donations, budgets, bank/cash books), HR, payroll, compliance/licenses, audits, govt grants, complaints, emergencies, and 13 registers.',
      'Architecture: multi-tenant (each Old Age Home is one isolated tenant). Government tier has cross-tenant read oversight within jurisdiction.',
      `Current user: ${tier}, role="${roleLabel}", department="${deptLabel}".`,
      'Guidelines:',
      '- Answer in clear, concise English. Use short bullet points for lists.',
      '- When live system data is provided, ground your answer strictly in that data; do NOT invent records, names, IDs, dates or amounts.',
      '- For counts/totals, derive them from the provided data block; state the number clearly.',
      '- Do not expose internal tenant IDs, JWTs or secrets. Do not reveal other tenants data.',
      '- If the data block is empty for the relevant intent, say so plainly and suggest the relevant register to check.',
      '- Keep answers practical for an old-age-home administrator: actions, summaries, risk flags.',
      intentLabel ? `- This query matched the intent: "${intentLabel}".` : '- No specific report intent matched; answer generally using the app context and any provided data.',
      'Legal questions:',
      '- You are permitted and expected to answer legal/regulatory questions about old age homes in India, especially Maharashtra.',
      '- Ground answers in the following key Indian statutes and rules:',
      '  * The Maintenance and Welfare of Parents and Senior Citizens Act, 2007 (MWPSCA) — Section 19 requires old age homes to be registered with the State Government; Sections 4-5 maintenance of parents; State Maintenance and Welfare of Parents and Senior Citizens Rules.',
      '  * Maharashtra Maintenance and Welfare of Parents and Senior Citizens Rules, 2010 — registration procedure, minimum facilities/standards, monthly reports to the State Government.',
      '  * The Senior Citizens (Amendment) Bill and the Maintenance of Parents principles under the Act.',
      '  * For charitable trusts/societies: Maharashtra Public Trusts Act, 1950; Societies Registration Act, 1860; Companies Act, 2013 (Section 8 company); Foreign Contribution (Regulation) Act (FCRA) for foreign donations.',
      '  * Relevant obligations: food, shelter, medical care, recreation, safety of residents; maintenance of registers; reporting abuse/neglect; tax exemptions under Income-tax Act 1961 (e.g., 80G for donations); employment/labour rules; MGNREGA has no bearing on old age homes.',
      '  * For donation/CSR: Section 135 Companies Act (CSR), CSR spending rules; Income-tax 80G registration and its renewal.',
      '  * For documents/registrations: get-up certificates (Section 8), trust registration, 12A/12AA/80G registration with the Income Tax Department.',
      '- Answer legal questions factually and in plain language; cite the specific Act/Section/Rule when known.',
      '- If you are unsure about a specific provision or the law has changed, say so honestly and recommend verifying with a qualified lawyer or the State Government department (Directorate of Social Justice and Special Assistance, Maharashtra).',
      '- Add a brief note that general AI responses are not a substitute for formal legal advice.',
      '- Do not invent section numbers, case law, or deadlines; if unknown, say you cannot confirm the exact provision.',
      'Be helpful, factual, and never speculate beyond provided data.',
      contextBlock,
    ].join('\n');
  }
}

export default AIController;
