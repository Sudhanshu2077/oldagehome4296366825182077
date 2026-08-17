import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import InwardService from '../service/inward.service.js';
import { ok, okPaginated } from '../../../kernel/response/api-response.js';
import { normalizePageQuery } from '../../../kernel/pagination/pagination.js';

export class InwardController {
  constructor(private readonly service: InwardService = new InwardService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];
    const writeGuard = [app.authenticate, app.requireTenantScope];

    app.get('/inward/meta', { preHandler: readGuard }, async (req, reply) => {
      reply.send(ok(await this.service.getMeta(req)));
    });

    app.get('/inward', { preHandler: readGuard }, async (req, reply) => {
      const { page, pageSize } = normalizePageQuery(req.query as Record<string, string | undefined>);
      const result = await this.service.list(req, page, pageSize, req.query as Record<string, unknown>);
      reply.send(okPaginated({ ...result, page, pageSize, totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize) }));
    });

    app.get('/inward/:id', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.send(ok(await this.service.getById(req, id)));
    });

    app.get('/inward/:id/history', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.send(ok(await this.service.history(req, id)));
    });

    app.post('/inward', { preHandler: writeGuard }, async (req, reply) => {
      const row = await this.service.createDraft(req, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'create', 'inward', row.id);
      reply.code(201).send(ok(row));
    });

    app.patch('/inward/:id', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.updateDraft(req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'update', 'inward', id);
      reply.send(ok(row));
    });

    app.post('/inward/:id/submit', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.submit(app, req, id);
      reply.send(ok(row));
    });

    app.post('/inward/:id/review', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.review(app, req, id);
      reply.send(ok(row));
    });

    app.post('/inward/:id/correct', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.correct(req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'correct', 'inward', id);
      reply.send(ok(row));
    });

    app.get('/inward/export/csv', { preHandler: readGuard }, async (req, reply) => {
      const csv = await this.service.exportCsv(req);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="inward-register.csv"');
      reply.send(csv);
    });

    app.get('/inward/export/xlsx', { preHandler: readGuard }, async (req, reply) => {
      const { buffer, filename } = await this.service.exportXlsx(req);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.send(buffer);
    });

    app.get('/inward/export/pdf', { preHandler: readGuard }, async (req, reply) => {
      const { html } = await this.service.exportPdf(req);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.send(html);
    });
  }
}

export default InwardController;