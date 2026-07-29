import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ReportService from '../service/report.service.js';
import { ok } from '../../../kernel/response/api-response.js';

const REPORT_TYPES = [
  'admissions',
  'discharges',
  'deaths',
  'medical',
  'medicine',
  'attendance',
  'kitchen',
  'diet',
  'laundry',
  'housekeeping',
  'incidents',
  'visitors',
  'emergencies',
  'monthly',
  'finance',
  'ledger',
  'donations',
  'inventory',
  'assets',
  'payroll',
  'complaints',
  'audits',
] as const;

export class ReportController {
  constructor(private readonly service: ReportService = new ReportService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];

    for (const type of REPORT_TYPES) {
      app.get<{ Querystring: Record<string, unknown> }>(`/reports/${type}`, { preHandler: readGuard }, async (req, reply) => {
        const result = await this.service.generate(req, type, req.query);
        await app.auditHook(req, 'generate', `report:${type}`, '');
        if (result.format !== 'json') {
          return this.sendCsv(reply, type, result.data as string);
        }
        reply.send(ok(result.data));
      });
    }
  }

  private sendCsv(reply: FastifyReply, type: string, csv: string): void {
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${type}.csv"`);
    reply.send(csv);
  }
}

export default ReportController;
