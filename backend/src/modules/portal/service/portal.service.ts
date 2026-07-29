import type { FastifyInstance, FastifyRequest } from 'fastify';
import { model as getModel, Types } from 'mongoose';
import PortalRepository, {
  type PortalRequestRow,
  type VisitorBookingRow,
  type VideoCallBookingRow,
  type VolunteerProfileRow,
  type SponsorPledgeRow,
  type VolunteerActivityLogRow,
} from '../repository/portal.repository.js';
import {
  PortalRequestKindValues,
  type PortalRequestKind,
} from '../entity/portal-request.entity.js';
import { InstitutionModel } from '../../tenant/entity/institution.entity.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { normalizePageQuery } from '../../../kernel/pagination/pagination.js';

export class PortalService {
  constructor(private readonly repo: PortalRepository = new PortalRepository()) {}

  private requireRole(req: FastifyRequest, role: 'family' | 'donor' | 'citizen' | 'volunteer'): void {
    const su = req.sessionUser;
    if (!su || su.tier !== 'external' || su.role !== role) throw new ForbiddenError(`${role} portal users only`);
  }

  private parseDate(value: unknown): Date {
    if (!value) throw new ValidationError('date required');
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) throw new ValidationError('invalid date');
    return d;
  }

  async listPublicInstitutions(query: Record<string, unknown>): Promise<{ items: unknown[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { page, pageSize } = normalizePageQuery(query);
    const filter: Record<string, unknown> = { active: true };
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
      ];
    }
    const [docs, total] = await Promise.all([
      InstitutionModel.find(filter).select('name nameMr code addressLine capacity contactEmail contactPhone').sort({ name: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      InstitutionModel.countDocuments(filter),
    ]);
    const items = docs.map((d) => ({ id: String(d._id), name: d.name, nameMr: d.nameMr, code: d.code, addressLine: d.addressLine, capacity: d.capacity, contactEmail: d.contactEmail, contactPhone: d.contactPhone }));
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    return { items, total, page, pageSize, totalPages };
  }

  async getPublicInstitution(id: string): Promise<unknown> {
    const doc = await InstitutionModel.findOne({ _id: id, active: true }).lean();
    if (!doc) throw new NotFoundError('institution not found');
    return {
      id: String(doc._id),
      name: doc.name,
      nameMr: doc.nameMr,
      code: doc.code,
      type: doc.type,
      contactEmail: doc.contactEmail,
      contactPhone: doc.contactPhone,
      addressLine: doc.addressLine,
      capacity: doc.capacity,
      registeredAt: doc.registeredAt,
    };
  }

  async getInstitutionBeds(id: string): Promise<{ institutionId: string; bedsTotal: number; bedsAvailable: number }> {
    const beds = getModel('Erp_beds');
    const [vacant, total] = await Promise.all([
      beds.countDocuments({ tenantId: id, status: 'vacant', deletedAt: null }),
      beds.countDocuments({ tenantId: id, deletedAt: null }),
    ]);
    return { institutionId: id, bedsTotal: total, bedsAvailable: vacant };
  }

  async searchInstitutions(query: Record<string, unknown>): Promise<unknown[]> {
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (!q || q.length < 2) throw new ValidationError('search query must be at least 2 characters');
    const docs = await InstitutionModel.find({
      active: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
      ],
    }).select('name nameMr code addressLine capacity').limit(50).lean();
    return docs.map((d) => ({ id: String(d._id), name: d.name, nameMr: d.nameMr, code: d.code, addressLine: d.addressLine, capacity: d.capacity }));
  }

  async createPortalRequest(app: FastifyInstance, req: FastifyRequest, kind: PortalRequestKind, body: Record<string, unknown>): Promise<PortalRequestRow> {
    if (!PortalRequestKindValues.includes(kind)) throw new ValidationError('invalid request kind');
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('name required');
    const tenantId = typeof body.tenantId === 'string' && body.tenantId ? body.tenantId : null;
    if (tenantId && !Types.ObjectId.isValid(tenantId)) throw new ValidationError('invalid institution id');

    const row = await this.repo.createPortalRequest({
      tenantId,
      kind,
      name,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      subject: typeof body.subject === 'string' ? body.subject : undefined,
      message: typeof body.message === 'string' ? body.message : undefined,
      payload: typeof body.payload === 'object' && body.payload !== null && !Array.isArray(body.payload)
        ? (body.payload as Record<string, unknown>)
        : undefined,
      sourceIp: req.ip,
    });
    await app.auditHook(req, 'create', `portal-request:${kind}`, row.id);
    return row;
  }

  async volunteerRegister(app: FastifyInstance, req: FastifyRequest, body: Record<string, unknown>): Promise<{ request: PortalRequestRow; profile: VolunteerProfileRow | null }> {
    const request = await this.createPortalRequest(app, req, 'volunteer-register', body);
    let profile: VolunteerProfileRow | null = null;
    if (req.sessionUser?.userId) {
      profile = await this.repo.upsertVolunteerProfile({
        userId: req.sessionUser.userId,
        tenantId: req.sessionUser.tenantId ?? undefined,
        skills: Array.isArray(body.skills) ? body.skills.filter((s): s is string => typeof s === 'string') : undefined,
        interests: Array.isArray(body.interests) ? body.interests.filter((s): s is string => typeof s === 'string') : undefined,
        availability: typeof body.availability === 'string' ? body.availability : undefined,
        emergencyContact: typeof body.emergencyContact === 'string' ? body.emergencyContact : undefined,
      });
    }
    return { request, profile };
  }

  async createAnonymousPledge(app: FastifyInstance, req: FastifyRequest, body: Record<string, unknown>): Promise<SponsorPledgeRow> {
    const donorName = typeof body.donorName === 'string' ? body.donorName.trim() : '';
    if (!donorName) throw new ValidationError('donorName required');
    const kind = body.kind === 'meals' ? 'meals' : 'resident';
    const tenantId = typeof body.tenantId === 'string' && body.tenantId ? body.tenantId : null;
    if (tenantId && !Types.ObjectId.isValid(tenantId)) throw new ValidationError('invalid institution id');
    const residentId = typeof body.residentId === 'string' && body.residentId ? body.residentId : null;
    if (residentId && !Types.ObjectId.isValid(residentId)) throw new ValidationError('invalid resident id');

    const row = await this.repo.createSponsorPledge({
      tenantId,
      kind,
      residentId,
      donorName,
      donorEmail: typeof body.donorEmail === 'string' ? body.donorEmail : undefined,
      donorPhone: typeof body.donorPhone === 'string' ? body.donorPhone : undefined,
      amount: typeof body.amount === 'number' ? body.amount : null,
      frequency: typeof body.frequency === 'string' ? body.frequency : 'one-time',
      startDate: body.startDate ? this.parseDate(body.startDate) : null,
      endDate: body.endDate ? this.parseDate(body.endDate) : null,
      mealCount: typeof body.mealCount === 'number' ? body.mealCount : null,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    });
    await app.auditHook(req, 'create', `sponsor-pledge:${kind}`, row.id);
    return row;
  }

  async listFamilyResidents(req: FastifyRequest): Promise<unknown[]> {
    this.requireRole(req, 'family');
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('no institution linked to your account');
    const su = req.sessionUser!;
    const Family = getModel('Erp_family_members');
    const Residents = getModel('Erp_residents');
    const links = await Family.find({ tenantId, email: su.email ?? '', deletedAt: null }).lean();
    const residentIds = links.map((l) => l.residentId);
    const residents = await Residents.find({ _id: { $in: residentIds }, tenantId, deletedAt: null })
      .select('fullName residentNumber status admissionDate roomId bedId')
      .lean();
    return residents.map((r) => ({ ...r, id: String(r._id) }));
  }

  async getFamilyResidentHealth(req: FastifyRequest, residentId: string): Promise<unknown[]> {
    this.requireRole(req, 'family');
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('no institution linked to your account');
    await this.ensureFamilyLink(req, tenantId, residentId);
    const MedicalRecords = getModel('Erp_medical-records');
    const docs = await MedicalRecords.find({ tenantId, residentId, deletedAt: null }).sort({ recordDate: -1 }).limit(50).lean();
    return docs.map((d) => ({ ...d, id: String(d._id) }));
  }

  async getFamilyResidentMedicines(req: FastifyRequest, residentId: string): Promise<unknown[]> {
    this.requireRole(req, 'family');
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('no institution linked to your account');
    await this.ensureFamilyLink(req, tenantId, residentId);
    const MedicineIssues = getModel('Erp_medicine-issues');
    const docs = await MedicineIssues.find({ tenantId, residentId, deletedAt: null }).sort({ issueDate: -1 }).limit(50).lean();
    return docs.map((d) => ({ ...d, id: String(d._id) }));
  }

  private async ensureFamilyLink(req: FastifyRequest, tenantId: string, residentId: string): Promise<void> {
    const su = req.sessionUser!;
    const Family = getModel('Erp_family_members');
    const link = await Family.findOne({ tenantId, email: su.email ?? '', residentId, deletedAt: null }).lean();
    if (!link) throw new ForbiddenError('resident not linked to your account');
  }

  async createVisitorBooking(app: FastifyInstance, req: FastifyRequest, body: Record<string, unknown>): Promise<VisitorBookingRow> {
    this.requireRole(req, 'family');
    const tenantId = assertTenantWriteAccess(req);
    const residentId = typeof body.residentId === 'string' ? body.residentId : '';
    if (!residentId || !Types.ObjectId.isValid(residentId)) throw new ValidationError('residentId required');
    await this.ensureFamilyLink(req, tenantId, residentId);
    const visitorName = typeof body.visitorName === 'string' ? body.visitorName.trim() : '';
    if (!visitorName) throw new ValidationError('visitorName required');

    const row = await this.repo.createVisitorBooking({
      tenantId,
      residentId,
      userId: req.sessionUser!.userId,
      visitorName,
      visitorPhone: typeof body.visitorPhone === 'string' ? body.visitorPhone : undefined,
      relation: typeof body.relation === 'string' ? body.relation : undefined,
      proposedDate: this.parseDate(body.proposedDate),
      proposedTimeSlot: typeof body.proposedTimeSlot === 'string' ? body.proposedTimeSlot : undefined,
      purpose: typeof body.purpose === 'string' ? body.purpose : undefined,
    });
    await app.auditHook(req, 'create', 'portal:visitor-booking', row.id);
    return row;
  }

  async createVideoCallBooking(app: FastifyInstance, req: FastifyRequest, body: Record<string, unknown>): Promise<VideoCallBookingRow> {
    this.requireRole(req, 'family');
    const tenantId = assertTenantWriteAccess(req);
    const residentId = typeof body.residentId === 'string' ? body.residentId : '';
    if (!residentId || !Types.ObjectId.isValid(residentId)) throw new ValidationError('residentId required');
    await this.ensureFamilyLink(req, tenantId, residentId);

    const row = await this.repo.createVideoCallBooking({
      tenantId,
      residentId,
      userId: req.sessionUser!.userId,
      requestedDate: this.parseDate(body.requestedDate),
      requestedTimeSlot: typeof body.requestedTimeSlot === 'string' ? body.requestedTimeSlot : undefined,
    });
    await app.auditHook(req, 'create', 'portal:video-call-booking', row.id);
    return row;
  }

  async listFamilyDonations(req: FastifyRequest): Promise<unknown[]> {
    this.requireRole(req, 'family');
    const su = req.sessionUser!;
    const Donations = getModel('Erp_donations');
    const docs = await Donations.find({ donorEmail: su.email ?? '', deletedAt: null }).sort({ donationDate: -1 }).limit(50).lean();
    return docs.map((d) => ({ ...d, id: String(d._id) }));
  }

  async createFamilyDonation(app: FastifyInstance, req: FastifyRequest, body: Record<string, unknown>): Promise<unknown> {
    this.requireRole(req, 'family');
    const tenantId = assertTenantWriteAccess(req);
    const donorName = typeof body.donorName === 'string' ? body.donorName.trim() : '';
    if (!donorName) throw new ValidationError('donorName required');
    const amount = typeof body.amount === 'number' ? body.amount : null;
    if (amount !== null && amount <= 0) throw new ValidationError('amount must be positive');
    const Donations = getModel('Erp_donations');
    const su = req.sessionUser!;
    const doc = await Donations.create({
      tenantId,
      donorName,
      donorEmail: su.email ?? '',
      donorPhone: typeof body.donorPhone === 'string' ? body.donorPhone : '',
      donationDate: body.donationDate ? this.parseDate(body.donationDate) : new Date(),
      amount,
      mode: typeof body.mode === 'string' ? body.mode : 'online',
      donationType: typeof body.donationType === 'string' ? body.donationType : 'general',
      createdBy: su.userId,
    });
    await app.auditHook(req, 'create', 'portal:family-donation', String(doc._id));
    return { ...doc.toObject(), id: String(doc._id) };
  }

  async listDonorHistory(req: FastifyRequest): Promise<unknown[]> {
    this.requireRole(req, 'donor');
    const su = req.sessionUser!;
    const Donations = getModel('Erp_donations');
    const docs = await Donations.find({ donorEmail: su.email ?? '', deletedAt: null }).sort({ donationDate: -1 }).limit(100).lean();
    return docs.map((d) => ({ ...d, id: String(d._id) }));
  }

  async getDonorReceipt(req: FastifyRequest, id: string): Promise<unknown> {
    this.requireRole(req, 'donor');
    const su = req.sessionUser!;
    const Donations = getModel('Erp_donations');
    const doc = await Donations.findOne({ _id: id, donorEmail: su.email ?? '', deletedAt: null }).lean() as Record<string, unknown> | null;
    if (!doc) throw new NotFoundError('receipt not found');
    return {
      id: String(doc._id),
      donorName: doc.donorName,
      donorEmail: doc.donorEmail,
      donationDate: doc.donationDate,
      amount: doc.amount,
      mode: doc.mode,
      donationType: doc.donationType,
      receiptNumber: doc.receiptNumber,
      receipt80GIssued: doc.receipt80GIssued,
      tenantId: doc.tenantId ? String(doc.tenantId) : null,
    };
  }

  async createDonorSponsorResident(app: FastifyInstance, req: FastifyRequest, body: Record<string, unknown>): Promise<SponsorPledgeRow> {
    this.requireRole(req, 'donor');
    const tenantId = assertTenantWriteAccess(req);
    const su = req.sessionUser!;
    const donorName = typeof body.donorName === 'string' ? body.donorName.trim() : su.displayName ?? '';
    if (!donorName) throw new ValidationError('donorName required');
    const residentId = typeof body.residentId === 'string' && body.residentId ? body.residentId : null;
    if (residentId && !Types.ObjectId.isValid(residentId)) throw new ValidationError('invalid resident id');

    const row = await this.repo.createSponsorPledge({
      tenantId,
      userId: su.userId,
      kind: 'resident',
      residentId,
      donorName,
      donorEmail: su.email,
      donorPhone: typeof body.donorPhone === 'string' ? body.donorPhone : undefined,
      amount: typeof body.amount === 'number' ? body.amount : null,
      frequency: typeof body.frequency === 'string' ? body.frequency : 'one-time',
      startDate: body.startDate ? this.parseDate(body.startDate) : null,
      endDate: body.endDate ? this.parseDate(body.endDate) : null,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    });
    await app.auditHook(req, 'create', 'portal:sponsor-resident', row.id);
    return row;
  }

  async createDonorSponsorMeals(app: FastifyInstance, req: FastifyRequest, body: Record<string, unknown>): Promise<SponsorPledgeRow> {
    this.requireRole(req, 'donor');
    const tenantId = assertTenantWriteAccess(req);
    const su = req.sessionUser!;
    const donorName = typeof body.donorName === 'string' ? body.donorName.trim() : su.displayName ?? '';
    if (!donorName) throw new ValidationError('donorName required');

    const row = await this.repo.createSponsorPledge({
      tenantId,
      userId: su.userId,
      kind: 'meals',
      donorName,
      donorEmail: su.email,
      donorPhone: typeof body.donorPhone === 'string' ? body.donorPhone : undefined,
      amount: typeof body.amount === 'number' ? body.amount : null,
      frequency: typeof body.frequency === 'string' ? body.frequency : 'one-time',
      startDate: body.startDate ? this.parseDate(body.startDate) : null,
      endDate: body.endDate ? this.parseDate(body.endDate) : null,
      mealCount: typeof body.mealCount === 'number' ? body.mealCount : null,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    });
    await app.auditHook(req, 'create', 'portal:sponsor-meals', row.id);
    return row;
  }

  async getVolunteerProfile(req: FastifyRequest): Promise<VolunteerProfileRow | null> {
    this.requireRole(req, 'volunteer');
    return this.repo.findVolunteerProfileByUserId(req.sessionUser!.userId);
  }

  async listVolunteerActivities(req: FastifyRequest): Promise<VolunteerActivityLogRow[]> {
    this.requireRole(req, 'volunteer');
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('no institution linked to your account');
    return this.repo.listVolunteerActivityLogs(tenantId, req.sessionUser!.userId, 100);
  }

  async createVolunteerActivityLog(app: FastifyInstance, req: FastifyRequest, body: Record<string, unknown>): Promise<VolunteerActivityLogRow> {
    this.requireRole(req, 'volunteer');
    const tenantId = assertTenantWriteAccess(req);
    const hours = typeof body.hours === 'number' ? body.hours : Number(body.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw new ValidationError('hours must be between 0 and 24');
    const activityType = typeof body.activityType === 'string' ? body.activityType.trim() : '';
    if (!activityType) throw new ValidationError('activityType required');
    const description = typeof body.description === 'string' ? body.description : '';
    const residentIds = Array.isArray(body.residentIds)
      ? body.residentIds.filter((r): r is string => typeof r === 'string' && Types.ObjectId.isValid(r))
      : [];

    const row = await this.repo.createVolunteerActivityLog({
      tenantId,
      userId: req.sessionUser!.userId,
      activityDate: this.parseDate(body.activityDate),
      hours,
      activityType,
      description,
      residentIds,
    });
    await app.auditHook(req, 'create', 'portal:volunteer-activity', row.id);
    return row;
  }
}

export default PortalService;
