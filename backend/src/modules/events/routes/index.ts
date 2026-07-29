import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { EventModel, type EventDoc } from '../entity/event.entity.js';
import { resolvedTenantId, assertTenantWriteAccess } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { ok } from '../../../kernel/response/api-response.js';

function toRow(d: EventDoc) {
  return {
    id: d._id.toString(),
    title: d.title,
    titleMr: d.titleMr,
    description: d.description,
    descriptionMr: d.descriptionMr,
    photoUrl: d.photoUrl,
    eventDate: d.eventDate,
    isPublic: d.isPublic,
    createdAt: d.createdAt,
  };
}

function canWrite(req: FastifyRequest): boolean {
  const su = req.sessionUser;
  return !!su && su.tier === 'institution' && (su.role === 'institution-head' || su.role === 'assistant-manager');
}

const eventsModule = async (app: FastifyInstance): Promise<void> => {
  app.get('/events', { preHandler: [app.authenticate] }, async (req, reply) => {
    const su = req.sessionUser;
    const tenantId = resolvedTenantId(req);
    if (!su) throw new ForbiddenError();
    const filter: Record<string, unknown> = {};
    if (su.tier === 'external') {
      filter.isPublic = true;
      if (tenantId) filter.tenantId = tenantId;
    } else if (tenantId) {
      filter.tenantId = tenantId;
    } else {
      throw new ForbiddenError('tenant scope required');
    }
    const docs = await EventModel.find(filter).sort({ eventDate: -1 }).limit(100).lean();
    reply.send(ok(docs.map((d) => toRow(d as unknown as EventDoc))));
  });

  app.post<{ Body: { title?: string; titleMr?: string; description?: string; descriptionMr?: string; photoUrl?: string; eventDate?: string; isPublic?: boolean } }>('/events', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
    if (!canWrite(req)) throw new ForbiddenError('only head or manager can create events');
    if (!req.body?.title || !req.body?.eventDate) throw new ValidationError('title and eventDate required');
    const eventDate = new Date(req.body.eventDate);
    if (Number.isNaN(eventDate.getTime())) throw new ValidationError('eventDate invalid');
    const tenantId = assertTenantWriteAccess(req);
    const doc = await EventModel.create({
      tenantId,
      title: req.body.title,
      titleMr: req.body.titleMr ?? '',
      description: req.body.description ?? '',
      descriptionMr: req.body.descriptionMr ?? '',
      photoUrl: req.body.photoUrl ?? '',
      eventDate,
      isPublic: req.body.isPublic ?? true,
      createdBy: req.sessionUser!.userId,
    });
    await app.auditHook(req, 'create', 'event', doc._id.toString());
    reply.code(201).send(ok({ id: doc._id.toString() }));
  });

  app.delete<{ Params: { id: string } }>('/events/:id', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
    if (!canWrite(req)) throw new ForbiddenError('only head or manager can delete events');
    const tenantId = assertTenantWriteAccess(req);
    const doc = await EventModel.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!doc) throw new NotFoundError('event not found');
    await app.auditHook(req, 'delete', 'event', req.params.id);
    reply.code(204).send();
  });
};

export { eventsModule };
export default eventsModule;
