import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { EventModel, type EventDoc } from '../entity/event.entity.js';
import { resolvedTenantId, assertTenantWriteAccess } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { ok } from '../../../kernel/response/api-response.js';
import { getStorageDriver } from '../../../services/storage.service.js';

function toRow(d: EventDoc) {
  return {
    id: d._id.toString(),
    title: d.title,
    titleMr: d.titleMr,
    description: d.description,
    descriptionMr: d.descriptionMr,
    photoUrl: d.photoUrl,
    photos: (d.photos ?? []).map((p) => `/events/media?key=${encodeURIComponent(p)}`),
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

  app.post<{ Body: { title?: string; titleMr?: string; description?: string; descriptionMr?: string; photoUrl?: string; photos?: string[]; eventDate?: string; isPublic?: boolean } }>('/events', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
    if (!canWrite(req)) throw new ForbiddenError('only head or manager can create events');
    if (!req.body?.title || !req.body?.eventDate) throw new ValidationError('title and eventDate required');
    const eventDate = new Date(req.body.eventDate);
    if (Number.isNaN(eventDate.getTime())) throw new ValidationError('eventDate invalid');
    const tenantId = assertTenantWriteAccess(req);
    const photos = Array.isArray(req.body.photos) ? req.body.photos.filter((p): p is string => typeof p === 'string' && p.length > 0) : [];
    const doc = await EventModel.create({
      tenantId,
      title: req.body.title,
      titleMr: req.body.titleMr ?? '',
      description: req.body.description ?? '',
      descriptionMr: req.body.descriptionMr ?? '',
      photoUrl: req.body.photoUrl ?? '',
      photos,
      eventDate,
      isPublic: req.body.isPublic ?? true,
      createdBy: req.sessionUser!.userId,
    });
    await app.auditHook(req, 'create', 'event', doc._id.toString());
    reply.code(201).send(ok({ id: doc._id.toString() }));
  });

  app.post<{ Params: { id: string } }>('/events/:id/images', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
    if (!canWrite(req)) throw new ForbiddenError('only head or manager can attach images to events');
    const tenantId = assertTenantWriteAccess(req);
    const doc = await EventModel.findOne({ _id: req.params.id, tenantId }).lean();
    if (!doc) throw new NotFoundError('event not found');
    const file = await req.file();
    if (!file) throw new ValidationError('file required');
    const allowed = new Set(['image/jpeg', 'image/png']);
    if (!allowed.has(file.mimetype)) throw new ValidationError('only PNG or JPEG images are allowed');
    const buffer = await file.toBuffer();
    const storageKey = `${tenantId}/events/${randomUUID()}/${file.filename}`;
    const driver = getStorageDriver();
    const info = await driver.putObject({ key: storageKey, body: buffer, contentType: file.mimetype, contentLength: buffer.length });
    const updated = await EventModel.findByIdAndUpdate(doc._id, { $push: { photos: storageKey } }, { new: true });
    if (!updated) throw new NotFoundError('event not found');
    await app.auditHook(req, 'update', 'event', doc._id.toString());
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('register:changed', { register: 'events', action: 'image-attached', eventId: doc._id.toString() });
    reply.code(201).send(ok({ id: doc._id.toString(), url: `/events/media?key=${encodeURIComponent(storageKey)}`, size: info.size }));
  });

  app.get<{ Querystring: { key?: string } }>('/events/media', { preHandler: [app.authenticate] }, async (req, reply) => {
    const key = req.query.key ?? '';
    if (!key) throw new ValidationError('key required');
    const tenantId = resolvedTenantId(req);
    if (!tenantId || !key.startsWith(`${tenantId}/events/`)) throw new ForbiddenError('media access denied');
    const driver = getStorageDriver();
    const { body, info } = await driver.getObject(key);
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(chunk as Buffer);
    }
    const buf = Buffer.concat(chunks);
    reply.header('Content-Type', info.contentType || 'application/octet-stream');
    reply.header('Content-Length', buf.length);
    reply.send(buf);
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
