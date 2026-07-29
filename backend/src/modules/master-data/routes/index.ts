import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { MASTER_CATALOGS, MasterDataModel, type MasterDataDoc, type MasterCatalog } from '../entity/master-data.entity.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { ok } from '../../../kernel/response/api-response.js';

function toRow(d: MasterDataDoc) {
  return {
    id: d._id.toString(),
    catalog: d.catalog,
    code: d.code,
    name: d.name,
    nameMr: d.nameMr,
    parentCode: d.parentCode,
    active: d.active,
    meta: d.meta,
  };
}

function assertCatalog(value: string): MasterCatalog {
  if (!(MASTER_CATALOGS as readonly string[]).includes(value)) throw new ValidationError(`unknown catalog: ${value}`);
  return value as MasterCatalog;
}

function govWriteOnly(req: FastifyRequest): void {
  if (!req.sessionUser || req.sessionUser.tier !== 'government') throw new ForbiddenError('master data writable by government tier only');
}

const masterDataModule = async (app: FastifyInstance): Promise<void> => {
  app.get('/master-data/catalogs', { preHandler: [app.authenticate] }, async (_req, reply) => {
    reply.send(ok(MASTER_CATALOGS));
  });

  app.get<{ Params: { catalog: string }; Querystring: { parentCode?: string } }>('/master-data/:catalog', { preHandler: [app.authenticate] }, async (req, reply) => {
    const catalog = assertCatalog(req.params.catalog);
    const filter: Record<string, unknown> = { catalog, active: true };
    if (req.query.parentCode) filter.parentCode = req.query.parentCode;
    const docs = await MasterDataModel.find(filter).sort({ name: 1 }).limit(1000).lean();
    reply.send(ok(docs.map((d) => toRow(d as unknown as MasterDataDoc))));
  });

  app.post<{ Params: { catalog: string }; Body: { code?: string; name?: string; nameMr?: string; parentCode?: string; meta?: Record<string, unknown> } }>('/master-data/:catalog', { preHandler: [app.authenticate] }, async (req, reply) => {
    govWriteOnly(req);
    const catalog = assertCatalog(req.params.catalog);
    if (!req.body?.code || !req.body?.name) throw new ValidationError('code and name required');
    const existing = await MasterDataModel.findOne({ catalog, code: req.body.code });
    if (existing) throw new ConflictError('code already exists in catalog');
    const doc = await MasterDataModel.create({
      catalog,
      code: req.body.code,
      name: req.body.name,
      nameMr: req.body.nameMr ?? '',
      parentCode: req.body.parentCode ?? null,
      meta: req.body.meta ?? null,
    });
    await app.auditHook(req, 'create', `master-data:${catalog}`, doc._id.toString());
    reply.code(201).send(ok({ id: doc._id.toString() }));
  });

  app.patch<{ Params: { catalog: string; id: string }; Body: { name?: string; nameMr?: string; active?: boolean; parentCode?: string; meta?: Record<string, unknown> } }>('/master-data/:catalog/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    govWriteOnly(req);
    const catalog = assertCatalog(req.params.catalog);
    const set: Record<string, unknown> = {};
    if (req.body?.name !== undefined) set.name = req.body.name;
    if (req.body?.nameMr !== undefined) set.nameMr = req.body.nameMr;
    if (req.body?.active !== undefined) set.active = req.body.active;
    if (req.body?.parentCode !== undefined) set.parentCode = req.body.parentCode;
    if (req.body?.meta !== undefined) set.meta = req.body.meta;
    const doc = await MasterDataModel.findOneAndUpdate({ _id: req.params.id, catalog }, { $set: set }, { new: true }).lean();
    if (!doc) throw new NotFoundError('master data item not found');
    await app.auditHook(req, 'update', `master-data:${catalog}`, req.params.id);
    reply.send(ok(toRow(doc as unknown as MasterDataDoc)));
  });
};

export { masterDataModule };
export default masterDataModule;
