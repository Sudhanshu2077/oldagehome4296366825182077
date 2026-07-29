import { InstitutionModel, type InstitutionDoc } from '../entity/institution.entity.js';
import { jurisdictionFilter } from '../../../plugins/tenant.plugin.js';
import type { FilterQuery } from 'mongoose';
import type { FastifyRequest } from 'fastify';

export interface InstitutionRow {
  id: string;
  name: string;
  nameMr: string;
  code: string;
  type: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  villageId: string | null;
  talukaId: string | null;
  districtId: string | null;
  stateId: string | null;
  regionId: string | null;
  capacity: number;
  active: boolean;
  registeredAt: Date | null;
}

function toRow(doc: InstitutionDoc): InstitutionRow {
  return {
    id: doc._id.toString(),
    name: doc.name,
    nameMr: doc.nameMr,
    code: doc.code,
    type: doc.type,
    contactEmail: doc.contactEmail,
    contactPhone: doc.contactPhone,
    addressLine: doc.addressLine,
    villageId: doc.villageId ? doc.villageId.toString() : null,
    talukaId: doc.talukaId ? doc.talukaId.toString() : null,
    districtId: doc.districtId ? doc.districtId.toString() : null,
    stateId: doc.stateId ? doc.stateId.toString() : null,
    regionId: doc.regionId ? doc.regionId.toString() : null,
    capacity: doc.capacity,
    active: doc.active,
    registeredAt: doc.registeredAt,
  };
}

export interface CreateInstitutionInput {
  name: string;
  nameMr?: string;
  code: string;
  type?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine?: string;
  villageId?: string | null;
  talukaId?: string | null;
  districtId?: string | null;
  stateId?: string | null;
  regionId?: string | null;
  capacity?: number;
}

export interface UpdateInstitutionInput {
  name?: string;
  nameMr?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine?: string;
  capacity?: number;
  active?: boolean;
}

export class TenantRepository {
  async findById(id: string): Promise<InstitutionRow | null> {
    const doc = await InstitutionModel.findById(id).lean();
    return doc ? toRow(doc as InstitutionDoc) : null;
  }

  async findByCode(code: string): Promise<InstitutionRow | null> {
    const doc = await InstitutionModel.findOne({ code }).lean();
    return doc ? toRow(doc as InstitutionDoc) : null;
  }

  async create(input: CreateInstitutionInput): Promise<InstitutionRow> {
    const doc = await InstitutionModel.create({
      name: input.name,
      nameMr: input.nameMr ?? '',
      code: input.code,
      type: input.type ?? 'old-age-home',
      contactEmail: input.contactEmail ?? '',
      contactPhone: input.contactPhone ?? '',
      addressLine: input.addressLine ?? '',
      villageId: input.villageId ?? null,
      talukaId: input.talukaId ?? null,
      districtId: input.districtId ?? null,
      stateId: input.stateId ?? null,
      regionId: input.regionId ?? null,
      capacity: input.capacity ?? 0,
      registeredAt: new Date(),
    });
    return toRow(doc.toObject() as InstitutionDoc);
  }

  async update(id: string, input: UpdateInstitutionInput): Promise<InstitutionRow | null> {
    const doc = await InstitutionModel.findByIdAndUpdate(id, { $set: input }, { new: true }).lean();
    return doc ? toRow(doc as InstitutionDoc) : null;
  }

  async listForGovRead(req: FastifyRequest): Promise<InstitutionRow[]> {
    const filter = jurisdictionFilter<InstitutionDoc>(req, {});
    const docs = await InstitutionModel.find(filter as FilterQuery<InstitutionDoc>).sort({ name: 1 }).lean();
    return docs.map((d) => toRow(d as InstitutionDoc));
  }

  async listForLocalRead(tenantId: string): Promise<InstitutionRow[]> {
    const doc = await InstitutionModel.findById(tenantId).lean();
    return doc ? [toRow(doc as InstitutionDoc)] : [];
  }
}

export default TenantRepository;
