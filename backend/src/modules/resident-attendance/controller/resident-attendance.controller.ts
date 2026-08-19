import type { FastifyInstance } from 'fastify';
import AttService from '../service/resident-attendance.service.js';
import { ok, okPaginated } from '../../../kernel/response/api-response.js';
import { normalizePageQuery } from '../../../kernel/pagination/pagination.js';

export class AttController {
  constructor(private readonly service: AttService = new AttService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];
    const writeGuard = [app.authenticate, app.requireTenantScope];

    app.get('/resident-attendance/meta', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { date?: string };
      reply.send(ok(await this.service.getMeta(req, q.date)));
    });

    app.get('/resident-attendance/sessions', { preHandler: readGuard }, async (req, reply) => {
      const { page, pageSize } = normalizePageQuery(req.query as Record<string, string | undefined>);
      const result = await this.service.listSessions(req, page, pageSize);
      reply.send(okPaginated({ ...result, page, pageSize, totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize) }));
    });

    app.post('/resident-attendance/:date/mark', { preHandler: writeGuard }, async (req, reply) => {
      const { date } = req.params as { date: string };
      const result = await this.service.mark(req, date, (req.body ?? {}) as Record<string, unknown>);
      reply.send(ok(result));
    });

    app.post('/resident-attendance/:date/submit', { preHandler: writeGuard }, async (req, reply) => {
      const { date } = req.params as { date: string };
      const result = await this.service.submit(app, req, date);
      reply.send(ok(result));
    });

    app.post('/resident-attendance/:date/correct', { preHandler: writeGuard }, async (req, reply) => {
      const { date } = req.params as { date: string };
      const result = await this.service.correct(app, req, date, (req.body ?? {}) as Record<string, unknown>);
      reply.send(ok(result));
    });

    app.get('/resident-attendance/:date/history', { preHandler: readGuard }, async (req, reply) => {
      const { date } = req.params as { date: string };
      reply.send(ok(await this.service.history(req, date)));
    });

    app.get('/resident-attendance/monthly', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { year?: string; month?: string };
      reply.send(ok(await this.service.monthly(req, q.year, q.month)));
    });

    app.get('/resident-attendance/export/daily-csv', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { date?: string };
      const csv = await this.service.exportDailyCsv(req, q.date);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="resident-attendance.csv"');
      reply.send(csv);
    });

    app.get('/resident-attendance/export/daily-pdf', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { date?: string };
      const { html } = await this.service.exportDailyPdf(req, q.date);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.send(html);
    });

    app.get('/resident-attendance/export/monthly-csv', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { year?: string; month?: string };
      const csv = await this.service.exportMonthlyCsv(req, q.year, q.month);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="resident-attendance-monthly.csv"');
      reply.send(csv);
    });

    app.get('/resident-attendance/export/monthly-pdf', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { year?: string; month?: string };
      const { html } = await this.service.exportMonthlyPdf(req, q.year, q.month);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.send(html);
    });
  }
}

export default AttController;