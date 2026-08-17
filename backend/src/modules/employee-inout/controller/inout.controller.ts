import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import InOutService from '../service/inout.service.js';
import { ok, okPaginated } from '../../../kernel/response/api-response.js';
import { normalizePageQuery } from '../../../kernel/pagination/pagination.js';

export class InOutController {
  constructor(private readonly service: InOutService = new InOutService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];
    const writeGuard = [app.authenticate, app.requireTenantScope];

    app.get('/employee-inout/meta', { preHandler: readGuard }, async (req, reply) => {
      reply.send(ok(await this.service.getMeta(req)));
    });

    app.get('/employee-inout', { preHandler: readGuard }, async (req, reply) => {
      const { page, pageSize } = normalizePageQuery(req.query as Record<string, string | undefined>);
      const result = await this.service.list(req, page, pageSize, req.query as Record<string, unknown>);
      reply.send(okPaginated({ ...result, page, pageSize, totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize) }));
    });

    app.get('/employee-inout/active', { preHandler: readGuard }, async (req, reply) => {
      reply.send(ok(await this.service.currentlyOut(req)));
    });

    app.get('/employee-inout/late', { preHandler: readGuard }, async (req, reply) => {
      reply.send(ok(await this.service.lateReturns(req)));
    });

    app.get('/employee-inout/:id', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.send(ok(await this.service.getById(req, id)));
    });

    app.get('/employee-inout/:id/history', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.send(ok(await this.service.history(req, id)));
    });

    app.post('/employee-inout', { preHandler: writeGuard }, async (req, reply) => {
      const row = await this.service.createOut(req, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'create', 'employee-inout', row.id);
      reply.code(201).send(ok(row));
    });

    app.patch('/employee-inout/:id', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.updateDraft(req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'update', 'employee-inout', id);
      reply.send(ok(row));
    });

    app.post('/employee-inout/:id/submit', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.submitOut(app, req, id);
      reply.send(ok(row));
    });

    app.post('/employee-inout/:id/return', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.recordReturn(app, req, id, (req.body ?? {}) as Record<string, unknown>);
      reply.send(ok(row));
    });

    app.post('/employee-inout/:id/correct', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.correct(req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'correct', 'employee-inout', id);
      reply.send(ok(row));
    });

    app.get('/employee-inout/export/csv', { preHandler: readGuard }, async (req, reply) => {
      const csv = await this.service.exportCsv(req);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="employee-inout.csv"');
      reply.send(csv);
    });

    app.get('/employee-inout/export/xlsx', { preHandler: readGuard }, async (req, reply) => {
      const { buffer, filename } = await this.service.exportXlsx(req);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.send(buffer);
    });

    app.get('/employee-inout/export/pdf', { preHandler: readGuard }, async (req, reply) => {
      const { html } = await this.service.exportPdf(req);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.send(html);
    });
  }
}

export default InOutController;