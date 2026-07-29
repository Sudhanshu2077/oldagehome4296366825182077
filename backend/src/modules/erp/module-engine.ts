import { Schema, model, type Model, type Document, Types, type SchemaDefinition } from 'mongoose';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { FieldDef, ModuleDef } from './module-definition.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../kernel/errors/app-error.js';
import { ok, okPaginated } from '../../kernel/response/api-response.js';
import { normalizePageQuery, buildPaginatedResult } from '../../kernel/pagination/pagination.js';
import { resolvedTenantId, assertTenantWriteAccess } from '../../plugins/tenant.plugin.js';
import { MonthlyLockModel } from '../governance/entity/governance.entity.js';

function fieldToSchemaType(f: FieldDef): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  switch (f.type) {
    case 'string':
    case 'text':
    case 'enum':
      base.type = String;
      if (f.type === 'enum' && f.enum) base.enum = [...f.enum];
      break;
    case 'number':
      base.type = Number;
      break;
    case 'date':
      base.type = Date;
      break;
    case 'boolean':
      base.type = Boolean;
      break;
    case 'objectid':
      base.type = Schema.Types.ObjectId;
      if (f.ref) base.ref = f.ref;
      break;
    case 'array':
      base.type = [String];
      break;
    case 'mixed':
      base.type = Schema.Types.Mixed;
      break;
  }
  if (f.required) base.required = true;
  if (f.index) base.index = true;
  if (f.unique) base.unique = true;
  if (f.default !== undefined) base.default = f.default;
  return base;
}

export function buildModelFor(def: ModuleDef): Model<Document> {
  const shape: Record<string, unknown> = {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  };
  for (const f of def.fields) {
    shape[f.key] = fieldToSchemaType(f);
  }
  const schema = new Schema(shape as SchemaDefinition, { timestamps: true, versionKey: false, collection: def.collection, strict: true });
  schema.index({ tenantId: 1, deletedAt: 1 });
  return model<Document>(`Erp_${def.code}`, schema);
}

const VoucherCounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'voucher_counters' },
);
VoucherCounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

const VoucherCounterModel = model('VoucherCounter', VoucherCounterSchema);

async function nextVoucherNumber(tenantId: string, year: number): Promise<string> {
  const counter = await VoucherCounterModel.findOneAndUpdate(
    { tenantId, year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  const seq = counter?.seq ?? 1;
  return `VCH${year}-${String(seq).padStart(6, '0')}`;
}

function validateBody(def: ModuleDef, body: Record<string, unknown>, partial: boolean): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('body must be an object');
  const out: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const f of def.fields) {
    const value = body[f.key];
    if (value === undefined || value === null || value === '') {
      if (f.required && !partial) missing.push(f.key);
      continue;
    }
    if (f.type === 'enum' && f.enum && !f.enum.includes(String(value))) {
      throw new ValidationError(`${f.key} must be one of ${f.enum.join(', ')}`);
    }
    if (f.type === 'number' && Number.isNaN(Number(value))) {
      throw new ValidationError(`${f.key} must be a number`);
    }
    if (f.type === 'objectid' && !Types.ObjectId.isValid(String(value))) {
      throw new ValidationError(`${f.key} must be a valid id`);
    }
    out[f.key] = value;
  }
  if (missing.length > 0) {
    throw new ValidationError(`missing required fields: ${missing.join(', ')}`, missing.map((k) => ({ field: k, message: 'required' })));
  }
  return out;
}

function canWriteModule(def: ModuleDef, req: FastifyRequest): boolean {
  const su = req.sessionUser;
  if (!su || su.tier !== 'institution') return false;
  if (def.writeRoles && def.writeRoles.length > 0) {
    return def.writeRoles.includes(su.role);
  }
  if (su.role === 'institution-head' || su.role === 'assistant-manager') return true;
  if (su.role === 'department-user') {
    if (!def.writeDepartments || def.writeDepartments.length === 0) return true;
    return su.department !== null && def.writeDepartments.includes(su.department);
  }
  return false;
}

async function checkMonthLock(req: FastifyRequest, def: ModuleDef, body?: Record<string, unknown>): Promise<void> {
  if (!def.dateFieldForLock) return;
  const su = req.sessionUser;
  if (!su?.tenantId || su.tier === 'government') return;
  const rawDate = body?.[def.dateFieldForLock];
  const date = rawDate ? new Date(String(rawDate)) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const lock = await MonthlyLockModel.findOne({ tenantId: su.tenantId, year, month, locked: true }).lean();
  if (lock) {
    throw new ForbiddenError(`month ${year}-${String(month).padStart(2, '0')} is locked by government closing workflow`);
  }
}

async function runInventoryMoveHook(_app: FastifyInstance, _req: FastifyRequest, doc: Document): Promise<void> {
  const d = doc.toObject() as Record<string, unknown>;
  const itemId = d.itemId;
  const type = String(d.type ?? '');
  const quantity = Number(d.quantity ?? 0);
  if (!itemId || !quantity) return;
  const Items = model<Document>('Erp_inventory-items');
  const delta = type === 'stock-in' ? quantity : type === 'stock-out' || type === 'transfer' ? -quantity : 0;
  if (delta === 0) return;
  await Items.findOneAndUpdate(
    { _id: itemId, tenantId: d.tenantId },
    { $inc: { currentStock: delta } },
  );
}

async function runPostCreateHook(app: FastifyInstance, req: FastifyRequest, def: ModuleDef, doc: Document): Promise<void> {
  if (def.code === 'inventory-moves') {
    await runInventoryMoveHook(app, req, doc);
  }
}

async function runAdmissionApproveHook(app: FastifyInstance, req: FastifyRequest, doc: Document): Promise<void> {
  const d = doc.toObject() as Record<string, unknown>;
  if (String(d.status) !== 'room-allocated') return;
  const su = req.sessionUser;
  if (!su?.tenantId) return;

  const { model: mongooseModel } = await import('mongoose');
  const bedsModel = mongooseModel<Document>('Erp_beds');
  const residentsModel = mongooseModel<Document>('Erp_residents');

  const year = new Date().getFullYear();
  const count = await residentsModel.countDocuments({ tenantId: su.tenantId });
  const residentNumber = `RES${year}-${String(count + 1).padStart(6, '0')}`;

  const resident = await residentsModel.create({
    tenantId: su.tenantId,
    residentNumber,
    fullName: d.applicantName,
    aadhaar: d.aadhaar ?? '',
    gender: d.gender ?? 'other',
    age: d.age ?? null,
    address: d.address ?? '',
    admissionDate: new Date(),
    status: 'active',
    qrCode: `QR:${residentNumber}`,
    roomId: d.roomId ?? null,
    bedId: d.bedId ?? null,
    createdBy: su.userId,
  });

  if (d.bedId) {
    await bedsModel.findOneAndUpdate(
      { _id: d.bedId, tenantId: su.tenantId },
      { $set: { status: 'occupied', currentResidentId: resident._id } },
    );
  }

  doc.set({ residentId: resident._id, status: 'admitted', admittedDate: new Date() });
  await doc.save();

  await app.notify?.({
    tenantId: su.tenantId,
    userId: su.userId,
    title: `Admission complete: ${String(d.applicantName)}`,
    body: `Resident ${residentNumber} created`,
    data: { module: 'admissions', id: String(doc._id) },
  });
}

export function registerErpModule(app: FastifyInstance, def: ModuleDef, model: Model<Document>): void {
  const base = `/m/${def.code}`;
  const readGuard = [app.authenticate, app.requireTenantRead];
  const writeGuard = [app.authenticate, app.requireTenantScope];

  app.get(base, { preHandler: readGuard }, async (req, reply) => {
    const tenantId = resolvedTenantId(req);
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError();
    const query = req.query as Record<string, string | undefined>;
    const { page, pageSize } = normalizePageQuery(query);
    const filter: Record<string, unknown> = { deletedAt: null };
    if (su.tier !== 'government') {
      if (!tenantId) throw new ForbiddenError('tenant scope required');
      filter.tenantId = tenantId;
    } else if (query.tenantId) {
      filter.tenantId = query.tenantId;
    }
    for (const f of def.fields) {
      const v = query[`f_${f.key}`];
      if (v !== undefined && v !== '') filter[f.key] = f.type === 'number' ? Number(v) : v;
    }
    if (query.q && def.searchableFields && def.searchableFields.length > 0) {
      filter.$or = def.searchableFields.map((k) => ({ [k]: { $regex: query.q, $options: 'i' } }));
    }
    const sortField = def.defaultSort ?? 'createdAt';
    const sortDir = query.sortDir === 'asc' ? 1 : -1;
    const [docs, total] = await Promise.all([
      model.find(filter).sort({ [sortField]: sortDir }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      model.countDocuments(filter),
    ]);
    reply.send(okPaginated(buildPaginatedResult(docs.map((d) => ({ ...d, id: String(d._id) })), total, { page, pageSize })));
  });

  app.get(`${base}/:id`, { preHandler: readGuard }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await model.findOne({ _id: id, deletedAt: null }).lean();
    if (!doc) throw new NotFoundError(`${def.code} item not found`);
    const su = req.sessionUser;
    const docTenantId = String((doc as Record<string, unknown>).tenantId);
    if (su?.tier !== 'government' && docTenantId !== su?.tenantId) throw new ForbiddenError('cross-tenant access denied');
    reply.send(ok({ ...doc, id: String(doc._id) }));
  });

  app.post(base, { preHandler: writeGuard }, async (req, reply) => {
    if (!canWriteModule(def, req)) throw new ForbiddenError('write access denied for this module');
    let body = validateBody(def, req.body as Record<string, unknown>, false);
    await checkMonthLock(req, def, body);
    const tenantId = assertTenantWriteAccess(req);
    if (def.code === 'vouchers' && !body.voucherNumber) {
      const year = new Date(String(body.voucherDate)).getFullYear();
      body = { ...body, voucherNumber: await nextVoucherNumber(tenantId, year) };
    }
    const doc = await model.create({ ...body, tenantId, createdBy: req.sessionUser!.userId });
    await runPostCreateHook(app, req, def, doc);
    await app.auditHook(req, 'create', `erp:${def.code}`, String(doc._id));
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('module:changed', { module: def.code, action: 'created', id: String(doc._id) });
    reply.code(201).send(ok({ id: String(doc._id) }));
  });

  app.patch(`${base}/:id`, { preHandler: writeGuard }, async (req, reply) => {
    if (!canWriteModule(def, req)) throw new ForbiddenError('write access denied for this module');
    const { id } = req.params as { id: string };
    const tenantId = assertTenantWriteAccess(req);
    const body = validateBody(def, req.body as Record<string, unknown>, true);
    await checkMonthLock(req, def, body);
    const doc = await model.findOneAndUpdate(
      { _id: id, tenantId, deletedAt: null },
      { $set: { ...body, updatedBy: req.sessionUser!.userId } },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) throw new NotFoundError(`${def.code} item not found`);
    await app.auditHook(req, 'update', `erp:${def.code}`, id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('module:changed', { module: def.code, action: 'updated', id });
    reply.send(ok({ ...doc, id: String(doc._id) }));
  });

  app.delete(`${base}/:id`, { preHandler: writeGuard }, async (req, reply) => {
    if (!canWriteModule(def, req)) throw new ForbiddenError('write access denied for this module');
    const { id } = req.params as { id: string };
    const tenantId = assertTenantWriteAccess(req);
    const doc = await model.findOneAndUpdate(
      { _id: id, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), updatedBy: req.sessionUser!.userId } },
    );
    if (!doc) throw new NotFoundError(`${def.code} item not found`);
    await app.auditHook(req, 'delete', `erp:${def.code}`, id);
    app.io?.of('/registers').to(`tenant:${tenantId}`).emit('module:changed', { module: def.code, action: 'deleted', id });
    reply.code(204).send();
  });

  if (def.workflow) {
    const wf = def.workflow;
    app.post(`${base}/:id/transition`, { preHandler: writeGuard }, async (req: FastifyRequest, reply: FastifyReply) => {
      const su = req.sessionUser;
      if (!su) throw new ForbiddenError();
      if (wf.transitionRoles && !wf.transitionRoles.includes(su.role)) {
        throw new ForbiddenError(`role ${su.role} cannot perform workflow transitions on ${def.code}`);
      }
      const { id } = req.params as { id: string };
      const { to, reason } = (req.body ?? {}) as { to?: string; reason?: string };
      if (!to) throw new ValidationError('to is required');
      const tenantId = assertTenantWriteAccess(req);
      const doc = await model.findOne({ _id: id, tenantId, deletedAt: null });
      if (!doc) throw new NotFoundError(`${def.code} item not found`);
      const current = String(doc.get(wf.field));
      const allowed = wf.transitions[current] ?? [];
      if (!allowed.includes(to)) {
        throw new ValidationError(`invalid transition ${current} -> ${to}; allowed: ${allowed.join(', ') || 'none'}`);
      }
      doc.set(wf.field, to);
      doc.set('updatedBy', su.userId);
      await doc.save();
      await app.auditHook(req, `transition:${current}->${to}${reason ? ` (${reason})` : ''}`, `erp:${def.code}`, id);
      if (def.onTransitionHook === 'admission-approve') {
        await runAdmissionApproveHook(app, req, doc);
      }
      app.io?.of('/registers').to(`tenant:${tenantId}`).emit('module:changed', { module: def.code, action: 'transition', id, to });
      reply.send(ok({ id, status: to }));
    });
  }
}
