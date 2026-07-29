import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { model, type Document, type Model, Types } from 'mongoose';
import { DocumentModel, type DocumentDoc } from '../entity/document.entity.js';
import { getStorageDriver } from '../../../services/storage.service.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { ok } from '../../../kernel/response/api-response.js';

function toRow(d: DocumentDoc) {
  return {
    id: d._id.toString(),
    name: d.name,
    category: d.category,
    tags: d.tags,
    mimeType: d.mimeType,
    size: d.size,
    version: d.version,
    createdAt: d.createdAt,
  };
}

function getErpModel(name: string): Model<Document> {
  return model<Document>(name.startsWith('Erp_') ? name : `Erp_${name}`);
}

function requireTenantId(req: FastifyRequest): string {
  const tenantId = resolvedTenantId(req);
  if (!tenantId) throw new ForbiddenError('tenant scope required');
  return tenantId;
}

function asRecord(doc: unknown): Record<string, unknown> {
  return doc as Record<string, unknown>;
}

function num(value: unknown): number {
  return Number(value ?? 0);
}

function str(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

async function findErpOne(req: FastifyRequest, modelName: string, id: string): Promise<Record<string, unknown>> {
  const tenantId = requireTenantId(req);
  const doc = await getErpModel(modelName).findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), deletedAt: null }).lean();
  if (!doc) throw new NotFoundError(`${modelName} not found`);
  return asRecord(doc);
}

const documentsModule = async (app: FastifyInstance): Promise<void> => {
  app.get<{ Querystring: { category?: string } }>('/documents', { preHandler: [app.authenticate, app.requireTenantRead] }, async (req, reply) => {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const filter: Record<string, unknown> = { tenantId };
    if (req.query.category) filter.category = req.query.category;
    const docs = await DocumentModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    reply.send(ok(docs.map((d) => toRow(d as unknown as DocumentDoc))));
  });

  app.post('/documents', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
    const tenantId = assertTenantWriteAccess(req);
    const file = await req.file();
    if (!file) throw new ValidationError('file required');
    const buffer = await file.toBuffer();
    const fields = file.fields as Record<string, { value?: string } | undefined>;
    const category = (fields.category?.value ?? 'general') as string;
    const tags = ((fields.tags?.value ?? '') as string).split(',').map((t) => t.trim()).filter(Boolean);

    const storageKey = `${tenantId}/${randomUUID()}/${file.filename}`;
    const driver = getStorageDriver();
    const info = await driver.putObject({ key: storageKey, body: buffer, contentType: file.mimetype, contentLength: buffer.length });

    const doc = await DocumentModel.create({
      tenantId,
      name: file.filename,
      category,
      tags,
      mimeType: file.mimetype,
      size: info.size,
      storageKey,
      version: 1,
      versions: [{ storageKey, version: 1, size: info.size, uploadedAt: new Date(), uploadedBy: req.sessionUser!.userId }],
      uploadedBy: req.sessionUser!.userId,
    });
    await app.auditHook(req, 'create', 'document', doc._id.toString());
    reply.code(201).send(ok({ id: doc._id.toString(), name: doc.name, size: doc.size }));
  });

  app.get<{ Params: { id: string } }>('/documents/:id/download', { preHandler: [app.authenticate, app.requireTenantRead] }, async (req, reply) => {
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    const doc = await DocumentModel.findOne({ _id: req.params.id, tenantId }).lean();
    if (!doc) throw new NotFoundError('document not found');
    const driver = getStorageDriver();
    const { body, info } = await driver.getObject(doc.storageKey);
    reply.header('Content-Type', doc.mimeType || info.contentType);
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
    reply.send(body);
  });

  app.delete<{ Params: { id: string } }>('/documents/:id', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
    const tenantId = assertTenantWriteAccess(req);
    const doc = await DocumentModel.findOne({ _id: req.params.id, tenantId }).lean();
    if (!doc) throw new NotFoundError('document not found');
    await getStorageDriver().deleteObject(doc.storageKey);
    await DocumentModel.findByIdAndDelete(doc._id);
    await app.auditHook(req, 'delete', 'document', req.params.id);
    reply.code(204).send();
  });

  const generateReadGuard = [app.authenticate, app.requireTenantRead];

  app.post<{ Body: { donationId?: string } }>('/documents/generate/receipt', { preHandler: generateReadGuard }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const donationId = req.body?.donationId;
    if (!donationId) throw new ValidationError('donationId required');
    const donation = await findErpOne(req, 'donations', donationId);
    const payload = {
      documentType: 'donation-receipt',
      tenantId,
      donationId,
      donorName: str(donation.donorName),
      donorPhone: str(donation.donorPhone),
      donorEmail: str(donation.donorEmail),
      donorPan: str(donation.donorPan),
      donationDate: donation.donationDate ? new Date(String(donation.donationDate)).toISOString() : '',
      amount: num(donation.amount),
      mode: str(donation.mode),
      donationType: str(donation.donationType),
      receiptNumber: str(donation.receiptNumber),
      inKindDescription: str(donation.inKindDescription),
      generatedAt: new Date().toISOString(),
      generatedBy: req.sessionUser!.userId,
      note: 'PDF generation placeholder: return structured receipt metadata',
    };
    await app.auditHook(req, 'generate', 'document:receipt', donationId);
    reply.send(ok(payload));
  });

  app.post<{ Body: { donationId?: string } }>('/documents/generate/80g', { preHandler: generateReadGuard }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const donationId = req.body?.donationId;
    if (!donationId) throw new ValidationError('donationId required');
    const donation = await findErpOne(req, 'donations', donationId);
    const payload = {
      documentType: '80g-certificate',
      tenantId,
      donationId,
      donorName: str(donation.donorName),
      donorPan: str(donation.donorPan),
      donationDate: donation.donationDate ? new Date(String(donation.donationDate)).toISOString() : '',
      amount: num(donation.amount),
      mode: str(donation.mode),
      donationType: str(donation.donationType),
      receiptNumber: str(donation.receiptNumber),
      certificateText: 'This is to certify that the donation is eligible for deduction under Section 80G of the Income Tax Act, 1961.',
      generatedAt: new Date().toISOString(),
      generatedBy: req.sessionUser!.userId,
      note: 'PDF generation placeholder: return structured 80G certificate metadata',
    };
    await app.auditHook(req, 'generate', 'document:80g', donationId);
    reply.send(ok(payload));
  });

  app.post<{ Body: { payrollId?: string } }>('/documents/generate/payslip', { preHandler: generateReadGuard }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const payrollId = req.body?.payrollId;
    if (!payrollId) throw new ValidationError('payrollId required');
    const payroll = await findErpOne(req, 'payrolls', payrollId);
    const employee = payroll.employeeId
      ? asRecord(await getErpModel('employees').findOne({ _id: new Types.ObjectId(String(payroll.employeeId)), tenantId: new Types.ObjectId(tenantId), deletedAt: null }).lean() ?? {})
      : {};
    const payload = {
      documentType: 'payslip',
      tenantId,
      payrollId,
      employeeId: str(payroll.employeeId),
      employeeName: str(employee.fullName),
      employeeCode: str(employee.employeeCode),
      department: str(employee.department),
      designation: str(employee.designation),
      year: num(payroll.year),
      month: num(payroll.month),
      basic: num(payroll.basic),
      hra: num(payroll.hra),
      allowances: num(payroll.allowances),
      deductions: num(payroll.deductions),
      advance: num(payroll.advance),
      loan: num(payroll.loan),
      bonus: num(payroll.bonus),
      netPay: num(payroll.netPay),
      status: str(payroll.status),
      generatedAt: new Date().toISOString(),
      generatedBy: req.sessionUser!.userId,
      note: 'PDF generation placeholder: return structured payslip metadata',
    };
    await app.auditHook(req, 'generate', 'document:payslip', payrollId);
    reply.send(ok(payload));
  });

  app.post<{ Body: { dischargeId?: string } }>('/documents/generate/discharge-certificate', { preHandler: generateReadGuard }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const dischargeId = req.body?.dischargeId;
    if (!dischargeId) throw new ValidationError('dischargeId required');
    const discharge = await findErpOne(req, 'discharges', dischargeId);
    const resident = discharge.residentId
      ? asRecord(await getErpModel('residents').findOne({ _id: new Types.ObjectId(String(discharge.residentId)), tenantId: new Types.ObjectId(tenantId), deletedAt: null }).lean() ?? {})
      : {};
    const payload = {
      documentType: 'discharge-certificate',
      tenantId,
      dischargeId,
      residentId: str(discharge.residentId),
      residentName: str(resident.fullName),
      residentNumber: str(resident.residentNumber),
      dischargeDate: discharge.dischargeDate ? new Date(String(discharge.dischargeDate)).toISOString() : '',
      type: str(discharge.type),
      reason: str(discharge.reason),
      destinationInstitution: str(discharge.destinationInstitution),
      notes: str(discharge.notes),
      certificateText: 'This is to certify that the resident has been discharged from the institution.',
      generatedAt: new Date().toISOString(),
      generatedBy: req.sessionUser!.userId,
      note: 'PDF generation placeholder: return structured discharge certificate metadata',
    };
    await app.auditHook(req, 'generate', 'document:discharge-certificate', dischargeId);
    reply.send(ok(payload));
  });

  app.post<{ Body: { deathId?: string } }>('/documents/generate/death-certificate', { preHandler: generateReadGuard }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const deathId = req.body?.deathId;
    if (!deathId) throw new ValidationError('deathId required');
    const death = await findErpOne(req, 'deaths', deathId);
    const resident = death.residentId
      ? asRecord(await getErpModel('residents').findOne({ _id: new Types.ObjectId(String(death.residentId)), tenantId: new Types.ObjectId(tenantId), deletedAt: null }).lean() ?? {})
      : {};
    const payload = {
      documentType: 'death-certificate',
      tenantId,
      deathId,
      residentId: str(death.residentId),
      residentName: str(resident.fullName),
      residentNumber: str(resident.residentNumber),
      deathDate: death.deathDate ? new Date(String(death.deathDate)).toISOString() : '',
      deathTime: str(death.deathTime),
      cause: str(death.cause),
      governmentReported: Boolean(death.governmentReported),
      familyNotified: Boolean(death.familyNotified),
      certificateText: 'This is a record of death of the resident at the institution.',
      generatedAt: new Date().toISOString(),
      generatedBy: req.sessionUser!.userId,
      note: 'PDF generation placeholder: return structured death certificate metadata',
    };
    await app.auditHook(req, 'generate', 'document:death-certificate', deathId);
    reply.send(ok(payload));
  });
};

export { documentsModule };
export default documentsModule;
