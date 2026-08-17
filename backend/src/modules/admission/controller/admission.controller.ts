import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import AdmissionService from '../service/admission.service.js';
import { ok, okPaginated } from '../../../kernel/response/api-response.js';
import { normalizePageQuery } from '../../../kernel/pagination/pagination.js';

export class AdmissionController {
  constructor(private readonly service: AdmissionService = new AdmissionService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];
    const writeGuard = [app.authenticate, app.requireTenantScope];

    app.get('/admissions/meta', { preHandler: readGuard }, async (_req, reply) => {
      reply.send(ok(await this.service.getMeta()));
    });

    app.get('/admissions', { preHandler: readGuard }, async (req, reply) => {
      const { page, pageSize } = normalizePageQuery(req.query as Record<string, string | undefined>);
      const status = (req.query as { status?: string }).status;
      const result = await this.service.list(req, page, pageSize, status);
      reply.send(okPaginated({ ...result, page, pageSize, totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize) }));
    });

    app.get('/admissions/:id', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.send(ok(await this.service.getById(req, id)));
    });

    app.post('/admissions', { preHandler: writeGuard }, async (req, reply) => {
      const row = await this.service.createDraft(req, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'create', 'admission', row.id);
      reply.code(201).send(ok(row));
    });

    app.patch('/admissions/:id', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.updateDraft(req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'update', 'admission', id);
      reply.send(ok(row));
    });

    app.post('/admissions/:id/submit', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.submit(req, id);
      await app.auditHook(req, 'submit', 'admission', id);
      app.io?.of('/registers').to(`tenant:${row.tenantId}`).emit('module:changed', { module: 'admission', action: 'submitted', id });
      reply.send(ok(row));
    });

    app.post('/admissions/:id/committee', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.committeeDecision(req, id, (req.body ?? {}) as Record<string, unknown>);
      await app.auditHook(req, 'committee-decision', 'admission', id);
      reply.send(ok(row));
    });

    app.post('/admissions/:id/approve', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await this.service.approve(app, req, id);
      await app.auditHook(req, 'approve', 'admission', id);
      reply.send(ok(row));
    });

    app.post('/admissions/:id/reject', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const { reason } = (req.body ?? {}) as { reason?: string };
      const row = await this.service.reject(req, id, reason ?? '');
      await app.auditHook(req, 'reject', 'admission', id);
      reply.send(ok(row));
    });

    app.post('/admissions/:id/query', { preHandler: writeGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const { reason } = (req.body ?? {}) as { reason?: string };
      const row = await this.service.raiseQuery(req, id, reason ?? '');
      await app.auditHook(req, 'query', 'admission', id);
      reply.send(ok(row));
    });

    app.post('/admissions/:id/aadhaar/full', { preHandler: readGuard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      reply.send(ok(await this.service.getAadhaarFull(req, id)));
    });
  }
}

export default AdmissionController;
