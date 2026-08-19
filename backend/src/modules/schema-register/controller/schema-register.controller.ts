import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import SchemaRegisterService from '../service/schema-register.service.js';
import { ok, okPaginated } from '../../../kernel/response/api-response.js';
import { normalizePageQuery } from '../../../kernel/pagination/pagination.js';

export class SchemaRegisterController {
  constructor(private readonly service: SchemaRegisterService = new SchemaRegisterService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];
    const writeGuard = [app.authenticate, app.requireTenantScope];

    app.get('/schema-register/:code/meta', { preHandler: readGuard }, async (req, reply) => {
      const { code } = req.params as { code: string };
      reply.send(ok(await this.service.getMeta(req, code)));
    });

    app.put('/schema-register/:code/schema', { preHandler: writeGuard }, async (req, reply) => {
      const { code } = req.params as { code: string };
      const result = await this.service.updateSchema(app, req, code, (req.body ?? {}) as Record<string, unknown>);
      reply.send(ok(result));
    });

    app.get('/schema-register/:code', { preHandler: readGuard }, async (req, reply) => {
      const { code } = req.params as { code: string };
      const { page, pageSize } = normalizePageQuery(req.query as Record<string, string | undefined>);
      const result = await this.service.list(req, code, page, pageSize, req.query as Record<string, unknown>);
      reply.send(okPaginated({ ...result, page, pageSize, totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize) }));
    });

    app.get('/schema-register/:code/:id', { preHandler: readGuard }, async (req, reply) => {
      const { code, id } = req.params as { code: string; id: string };
      reply.send(ok(await this.service.getById(req, code, id)));
    });

    app.get('/schema-register/:code/:id/history', { preHandler: readGuard }, async (req, reply) => {
      const { code, id } = req.params as { code: string; id: string };
      reply.send(ok(await this.service.history(req, code, id)));
    });

    app.post('/schema-register/:code', { preHandler: writeGuard }, async (req, reply) => {
      const { code } = req.params as { code: string };
      const row = await this.service.createDraft(req, code, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'create', 'schema-register', row.id);
      reply.code(201).send(ok(row));
    });

    app.patch('/schema-register/:code/:id', { preHandler: writeGuard }, async (req, reply) => {
      const { code, id } = req.params as { code: string; id: string };
      const row = await this.service.updateDraft(req, code, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'update', 'schema-register', id);
      reply.send(ok(row));
    });

    app.post('/schema-register/:code/:id/submit', { preHandler: writeGuard }, async (req, reply) => {
      const { code, id } = req.params as { code: string; id: string };
      const row = await this.service.submit(app, req, code, id);
      reply.send(ok(row));
    });

    app.post('/schema-register/:code/:id/review', { preHandler: writeGuard }, async (req, reply) => {
      const { code, id } = req.params as { code: string; id: string };
      const row = await this.service.review(app, req, code, id);
      reply.send(ok(row));
    });

    app.post('/schema-register/:code/:id/correct', { preHandler: writeGuard }, async (req, reply) => {
      const { code, id } = req.params as { code: string; id: string };
      const row = await this.service.correct(req, code, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'correct', 'schema-register', id);
      reply.send(ok(row));
    });

    app.post('/schema-register/:code/:id/documents', { preHandler: writeGuard }, async (req, reply) => {
      const { code, id } = req.params as { code: string; id: string };
      const row = await this.service.attachDocument(app, req, code, id);
      reply.code(201).send(ok(row));
    });

    app.get('/schema-register/media', { preHandler: readGuard }, async (req, reply) => {
      const key = String((req.query as { key?: string }).key ?? '');
      const buf = await this.service.serveDocument(req, key);
      reply.header('Content-Type', buf.contentType);
      reply.header('Content-Length', buf.buffer.length);
      reply.send(buf.buffer);
    });

    app.get('/schema-register/:code/export/csv', { preHandler: readGuard }, async (req, reply) => {
      const { code } = req.params as { code: string };
      const csv = await this.service.exportCsv(req, code);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${code}-register.csv"`);
      reply.send(csv);
    });

    app.get('/schema-register/:code/export/xlsx', { preHandler: readGuard }, async (req, reply) => {
      const { code } = req.params as { code: string };
      const { buffer, filename } = await this.service.exportXlsx(req, code);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.send(buffer);
    });

    app.get('/schema-register/:code/export/pdf', { preHandler: readGuard }, async (req, reply) => {
      const { code } = req.params as { code: string };
      const { html } = await this.service.exportPdf(req, code);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.send(html);
    });
  }
}

export default SchemaRegisterController;
