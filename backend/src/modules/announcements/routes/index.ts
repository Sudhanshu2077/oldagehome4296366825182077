import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AnnouncementModel, type AnnouncementDoc } from '../entity/announcement.entity.js';
import { resolvedTenantId, assertTenantWriteAccess } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { ok } from '../../../kernel/response/api-response.js';

function toRow(d: AnnouncementDoc) {
  return {
    id: d._id.toString(),
    title: d.title,
    titleMr: d.titleMr,
    body: d.body,
    bodyMr: d.bodyMr,
    audience: d.audience,
    publishedAt: d.publishedAt,
    expiresAt: d.expiresAt,
    createdAt: d.createdAt,
  };
}

function canWrite(req: FastifyRequest): boolean {
  const su = req.sessionUser;
  return !!su && su.tier === 'institution' && (su.role === 'institution-head' || su.role === 'assistant-manager');
}

const announcementsModule = async (app: FastifyInstance): Promise<void> => {
  app.get('/announcements', { preHandler: [app.authenticate] }, async (req, reply) => {
    const su = req.sessionUser;
    const tenantId = resolvedTenantId(req);
    if (!su) throw new ForbiddenError();
    const filter: Record<string, unknown> = {};
    if (su.tier === 'external') {
      filter.audience = { $in: ['all', 'external'] };
      if (tenantId) filter.tenantId = tenantId;
    } else if (tenantId) {
      filter.tenantId = tenantId;
    } else {
      throw new ForbiddenError('tenant scope required');
    }
    const docs = await AnnouncementModel.find(filter).sort({ publishedAt: -1 }).limit(100).lean();
    reply.send(ok(docs.map((d) => toRow(d as unknown as AnnouncementDoc))));
  });

  app.post<{ Body: { title?: string; titleMr?: string; body?: string; bodyMr?: string; audience?: string } }>('/announcements', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
    if (!canWrite(req)) throw new ForbiddenError('only head or manager can publish');
    if (!req.body?.title || !req.body?.body) throw new ValidationError('title and body required');
    const tenantId = assertTenantWriteAccess(req);
    const doc = await AnnouncementModel.create({
      tenantId,
      title: req.body.title,
      titleMr: req.body.titleMr ?? '',
      body: req.body.body,
      bodyMr: req.body.bodyMr ?? '',
      audience: ['all', 'staff', 'external'].includes(req.body.audience ?? '') ? req.body.audience : 'all',
      createdBy: req.sessionUser!.userId,
    });
    await app.auditHook(req, 'create', 'announcement', doc._id.toString());
    reply.code(201).send(ok({ id: doc._id.toString() }));
  });

  app.delete<{ Params: { id: string } }>('/announcements/:id', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
    if (!canWrite(req)) throw new ForbiddenError('only head or manager can delete');
    const tenantId = assertTenantWriteAccess(req);
    const doc = await AnnouncementModel.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!doc) throw new NotFoundError('announcement not found');
    await app.auditHook(req, 'delete', 'announcement', req.params.id);
    reply.code(204).send();
  });
};

export { announcementsModule };
export default announcementsModule;
