import type { FastifyInstance } from 'fastify';
import { InquiryModel, type InquiryDoc } from '../entity/inquiry.entity.js';
import { resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { ok } from '../../../kernel/response/api-response.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

export class InquiryService {
  async create(req: FastifyRequest, body: { name?: string; phone?: string; email?: string; subject?: string; message?: string; tenantId?: string }) {
    if (!body?.name || !body?.message) throw new ValidationError('name and message required');
    const su = req.sessionUser;
    const tenantId = su?.tier === 'institution' || su?.tier === 'external' ? su.tenantId ?? body.tenantId ?? null : body.tenantId ?? null;
    const doc = await InquiryModel.create({
      tenantId,
      name: body.name,
      phone: body.phone ?? '',
      email: body.email ?? su?.email ?? '',
      subject: body.subject ?? '',
      message: body.message,
      createdBy: su?.userId ?? null,
    });
    return { id: doc._id.toString() };
  }

  async list(req: FastifyRequest, status?: string) {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    const docs = await InquiryModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return docs.map((d) => toRow(d as unknown as InquiryDoc));
  }

  async updateStatus(req: FastifyRequest, id: string, status: string, notes?: string) {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) throw new ValidationError('invalid status');
    const doc = await InquiryModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { status, notes: notes ?? '', resolvedBy: req.sessionUser!.userId, resolvedAt: status === 'resolved' || status === 'closed' ? new Date() : null } },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundError('inquiry not found');
    return toRow(doc as unknown as InquiryDoc);
  }
}

function toRow(d: InquiryDoc) {
  return {
    id: d._id.toString(),
    tenantId: d.tenantId ? d.tenantId.toString() : null,
    name: d.name,
    phone: d.phone,
    email: d.email,
    subject: d.subject,
    message: d.message,
    status: d.status,
    notes: d.notes,
    createdAt: d.createdAt,
    resolvedAt: d.resolvedAt,
  };
}

export class InquiryController {
  constructor(private readonly service: InquiryService = new InquiryService()) {}

  register(app: FastifyInstance): void {
    app.post<{ Body: Record<string, string> }>('/inquiries', { preHandler: [app.authenticate] }, async (req, reply) => {
      const result = await this.service.create(req, req.body ?? {});
      await app.recordActivity(req, 'inquiry-submitted', result);
      reply.code(201).send(ok(result));
    });

    app.get<{ Querystring: { status?: string } }>('/inquiries', { preHandler: [app.authenticate, app.requireTenantRead] }, async (req, reply) => {
      reply.send(ok(await this.service.list(req, req.query.status)));
    });

    app.patch<{ Params: { id: string }; Body: { status?: string; notes?: string } }>('/inquiries/:id', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
      if (!req.body?.status) throw new ValidationError('status required');
      const item = await this.service.updateStatus(req, req.params.id, req.body.status, req.body.notes);
      reply.send(ok(item));
    });
  }
}

const inquiriesModule = async (app: FastifyInstance): Promise<void> => {
  new InquiryController().register(app);
};

export { inquiriesModule };
export default inquiriesModule;
