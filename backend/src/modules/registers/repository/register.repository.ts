import { CounterModel, RegisterEntryModel, type RegisterEntryDoc } from '../entity/register-entry.entity.js';
import type { RegisterScopeId } from '../../../kernel/types/rbac.js';

export interface RegisterEntryRow {
  id: string;
  tenantId: string;
  register: string;
  entryNumber: string;
  entryYear: number;
  entrySeq: number;
  fields: Record<string, unknown>;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toEntryRow(doc: RegisterEntryDoc): RegisterEntryRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    register: doc.register,
    entryNumber: doc.entryNumber,
    entryYear: doc.entryYear,
    entrySeq: doc.entrySeq,
    fields: (doc.fields ?? {}) as Record<string, unknown>,
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class RegisterRepository {
  async nextEntryNumber(tenantId: string, register: RegisterScopeId): Promise<{ entryNumber: string; entryYear: number; entrySeq: number }> {
    const year = new Date().getFullYear();
    const counter = await CounterModel.findOneAndUpdate(
      { tenantId, register, year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    const seq = counter?.seq ?? 1;
    return { entryNumber: `REG${year}-${String(seq).padStart(6, '0')}`, entryYear: year, entrySeq: seq };
  }

  async create(input: {
    tenantId: string;
    register: RegisterScopeId;
    fields: Record<string, unknown>;
    createdBy: string;
  }): Promise<RegisterEntryRow> {
    const { entryNumber, entryYear, entrySeq } = await this.nextEntryNumber(input.tenantId, input.register);
    const doc = await RegisterEntryModel.create({
      tenantId: input.tenantId,
      register: input.register,
      entryNumber,
      entryYear,
      entrySeq,
      fields: input.fields,
      createdBy: input.createdBy,
    });
    return toEntryRow(doc.toObject() as RegisterEntryDoc);
  }

  async list(tenantId: string, register: RegisterScopeId, page: number, pageSize: number): Promise<{ items: RegisterEntryRow[]; total: number }> {
    const filter = { tenantId, register, deletedAt: null };
    const [docs, total] = await Promise.all([
      RegisterEntryModel.find(filter).sort({ entrySeq: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      RegisterEntryModel.countDocuments(filter),
    ]);
    return { items: docs.map((d) => toEntryRow(d as unknown as RegisterEntryDoc)), total };
  }

  async findById(tenantId: string, id: string): Promise<RegisterEntryRow | null> {
    const doc = await RegisterEntryModel.findOne({ _id: id, tenantId, deletedAt: null }).lean();
    return doc ? toEntryRow(doc as unknown as RegisterEntryDoc) : null;
  }

  async update(tenantId: string, id: string, fields: Record<string, unknown>, updatedBy: string): Promise<RegisterEntryRow | null> {
    const doc = await RegisterEntryModel.findOneAndUpdate(
      { _id: id, tenantId, deletedAt: null },
      { $set: { fields, updatedBy } },
      { new: true },
    ).lean();
    return doc ? toEntryRow(doc as unknown as RegisterEntryDoc) : null;
  }

  async softDelete(tenantId: string, id: string, deletedBy: string): Promise<boolean> {
    const doc = await RegisterEntryModel.findOneAndUpdate(
      { _id: id, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), updatedBy: deletedBy } },
    );
    return doc !== null;
  }

  async countByRegister(tenantId: string, register: string, since?: Date): Promise<number> {
    const filter: Record<string, unknown> = { tenantId, register, deletedAt: null };
    if (since) filter.createdAt = { $gte: since };
    return RegisterEntryModel.countDocuments(filter);
  }
}

export default RegisterRepository;
