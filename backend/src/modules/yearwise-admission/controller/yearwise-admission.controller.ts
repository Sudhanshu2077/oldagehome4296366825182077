import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { YwaService } from '../service/yearwise-admission.service.js';
import { ok, okPaginated } from '../../../kernel/response/api-response.js';
import { normalizePageQuery } from '../../../kernel/pagination/pagination.js';

export class YwaController {
  constructor(private readonly service: YwaService = new YwaService()) {}
  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];
    const writeGuard = [app.authenticate, app.requireTenantScope];

    app.get('/yearwise-admission/meta', { preHandler: readGuard }, async (req, reply) => {
      reply.send(ok(await this.service.getMeta(req)));
    });

    app.get('/yearwise-admission', { preHandler: readGuard }, async (req, reply) => {
      const { page, pageSize } = normalizePageQuery(req.query as Record<string, string | undefined>);
      const result = await this.service.list(req, page, pageSize, req.query as Record<string, unknown>);
      reply.send(okPaginated({ ...result, page, pageSize, totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize) }));
    });

    app.get('/yearwise-admission/:id/history', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.send(ok(await this.service.history(req, id)));
    });

    app.get('/yearwise-admission/:id', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.send(ok(await this.service.getById(req, id)));
    });

    app.get('/yearwise-admission/:id/aadhaar', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const value = await this.service.getAadhaarFull(app, req, id);
      reply.send(ok({ aadhaar: value }));
    });

    app.post('/yearwise-admission', { preHandler: writeGuard }, async (req, reply) => {
      const result = await this.service.createDraft(req, (req.body ?? {}) as Record<string, unknown>);
      const row = result.entry as { id: string };
      await app.auditHook(req, 'create', 'yearwise-admission', row.id);
      reply.code(201).send(ok(result.entry, result.duplicateWarning ? { duplicateWarning: result.duplicateWarning } : undefined));
    });

    app.patch('/yearwise-admission/:id', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.updateDraft(req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'update', 'yearwise-admission', id);
      reply.send(ok(row));
    });

    app.post('/yearwise-admission/:id/submit', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.submit(app, req, id);
      reply.send(ok(row));
    });

    app.post('/yearwise-admission/:id/approve', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.approve(app, req, id);
      reply.send(ok(row));
    });

    app.post('/yearwise-admission/:id/finalize', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.finalize(app, req, id);
      reply.send(ok(row));
    });

    app.post('/yearwise-admission/:id/void', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.voidEntry(app, req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'void', 'yearwise-admission', id);
      reply.send(ok(row));
    });

    app.post('/yearwise-admission/:id/correct', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.correct(req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'correct', 'yearwise-admission', id);
      reply.send(ok(row));
    });

    app.get('/yearwise-admission/export/csv', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { year?: string };
      const csv = await this.service.exportCsv(req, q.year);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="yearwise-admission-register.csv"');
      reply.send(csv);
    });

    app.get('/yearwise-admission/export/xlsx', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { year?: string };
      const { buffer, filename } = await this.service.exportXlsx(req, q.year);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.send(buffer);
    });

    app.get('/yearwise-admission/export/pdf', { preHandler: readGuard }, async (req, reply) => {
      const q = req.query as { year?: string };
      const { html } = await this.service.exportPdf(req, q.year);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.send(html);
    });
  }
}

export default YwaController;