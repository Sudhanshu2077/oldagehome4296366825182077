import type { FilterQuery, Types } from 'mongoose';
import {
  PortalRequestModel,
  type PortalRequestDoc,
  type PortalRequestKind,
  VisitorBookingModel,
  type VisitorBookingDoc,
  VideoCallBookingModel,
  type VideoCallBookingDoc,
  VolunteerProfileModel,
  type VolunteerProfileDoc,
  SponsorPledgeModel,
  type SponsorPledgeDoc,
  VolunteerActivityLogModel,
  type VolunteerActivityLogDoc,
  type VolunteerActivityLogInput,
} from '../entity/portal-request.entity.js';

export interface PortalRequestRow {
  id: string;
  tenantId: string | null;
  kind: PortalRequestKind;
  name: string;
  phone: string;
  email: string;
  address: string;
  subject: string;
  message: string;
  payload: Record<string, unknown>;
  status: string;
  userId: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  notes: string;
  sourceIp: string;
  createdAt: Date;
  updatedAt: Date;
}

function toPortalRequestRow(doc: PortalRequestDoc): PortalRequestRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    kind: doc.kind,
    name: doc.name,
    phone: doc.phone ?? '',
    email: doc.email ?? '',
    address: doc.address ?? '',
    subject: doc.subject ?? '',
    message: doc.message ?? '',
    payload: (doc.payload ?? {}) as Record<string, unknown>,
    status: doc.status,
    userId: doc.userId ? doc.userId.toString() : null,
    resolvedBy: doc.resolvedBy ? doc.resolvedBy.toString() : null,
    resolvedAt: doc.resolvedAt,
    notes: doc.notes ?? '',
    sourceIp: doc.sourceIp ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface VisitorBookingRow {
  id: string;
  tenantId: string;
  residentId: string;
  userId: string;
  visitorName: string;
  visitorPhone: string;
  relation: string;
  proposedDate: Date;
  proposedTimeSlot: string;
  purpose: string;
  status: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

function toVisitorBookingRow(doc: VisitorBookingDoc): VisitorBookingRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    residentId: doc.residentId.toString(),
    userId: doc.userId.toString(),
    visitorName: doc.visitorName,
    visitorPhone: doc.visitorPhone ?? '',
    relation: doc.relation ?? '',
    proposedDate: doc.proposedDate,
    proposedTimeSlot: doc.proposedTimeSlot ?? '',
    purpose: doc.purpose ?? '',
    status: doc.status,
    approvedBy: doc.approvedBy ? doc.approvedBy.toString() : null,
    approvedAt: doc.approvedAt,
    notes: doc.notes ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface VideoCallBookingRow {
  id: string;
  tenantId: string;
  residentId: string;
  userId: string;
  requestedDate: Date;
  requestedTimeSlot: string;
  status: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  callUrl: string;
  scheduledAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

function toVideoCallBookingRow(doc: VideoCallBookingDoc): VideoCallBookingRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    residentId: doc.residentId.toString(),
    userId: doc.userId.toString(),
    requestedDate: doc.requestedDate,
    requestedTimeSlot: doc.requestedTimeSlot ?? '',
    status: doc.status,
    approvedBy: doc.approvedBy ? doc.approvedBy.toString() : null,
    approvedAt: doc.approvedAt,
    callUrl: doc.callUrl ?? '',
    scheduledAt: doc.scheduledAt,
    notes: doc.notes ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface VolunteerProfileRow {
  id: string;
  userId: string;
  tenantId: string | null;
  skills: string[];
  interests: string[];
  availability: string;
  emergencyContact: string;
  identityProofUrl: string;
  backgroundVerified: boolean;
  status: string;
  onboardingNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VolunteerActivityLogRow {
  id: string;
  tenantId: string;
  userId: string;
  activityDate: Date;
  hours: number;
  activityType: string;
  description: string;
  residentIds: string[];
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toVolunteerProfileRow(doc: VolunteerProfileDoc): VolunteerProfileRow {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    skills: doc.skills ?? [],
    interests: doc.interests ?? [],
    availability: doc.availability ?? '',
    emergencyContact: doc.emergencyContact ?? '',
    identityProofUrl: doc.identityProofUrl ?? '',
    backgroundVerified: doc.backgroundVerified ?? false,
    status: doc.status,
    onboardingNotes: doc.onboardingNotes ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface SponsorPledgeRow {
  id: string;
  tenantId: string | null;
  userId: string | null;
  kind: 'resident' | 'meals';
  residentId: string | null;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: number | null;
  frequency: string;
  startDate: Date | null;
  endDate: Date | null;
  mealCount: number | null;
  status: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

function toSponsorPledgeRow(doc: SponsorPledgeDoc): SponsorPledgeRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    userId: doc.userId ? doc.userId.toString() : null,
    kind: doc.kind,
    residentId: doc.residentId ? doc.residentId.toString() : null,
    donorName: doc.donorName,
    donorEmail: doc.donorEmail ?? '',
    donorPhone: doc.donorPhone ?? '',
    amount: doc.amount ?? null,
    frequency: doc.frequency,
    startDate: doc.startDate ?? null,
    endDate: doc.endDate ?? null,
    mealCount: doc.mealCount ?? null,
    status: doc.status,
    notes: doc.notes ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toVolunteerActivityLogRow(doc: VolunteerActivityLogDoc): VolunteerActivityLogRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    userId: doc.userId.toString(),
    activityDate: doc.activityDate,
    hours: doc.hours,
    activityType: doc.activityType,
    description: doc.description ?? '',
    residentIds: (doc.residentIds ?? []).map((r) => (r as Types.ObjectId).toString()),
    verified: doc.verified ?? false,
    verifiedBy: doc.verifiedBy ? doc.verifiedBy.toString() : null,
    verifiedAt: doc.verifiedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class PortalRepository {
  async createPortalRequest(input: {
    tenantId?: string | null | undefined;
    kind: PortalRequestKind;
    name: string;
    phone?: string | undefined;
    email?: string | undefined;
    address?: string | undefined;
    subject?: string | undefined;
    message?: string | undefined;
    payload?: Record<string, unknown> | undefined;
    userId?: string | null | undefined;
    sourceIp?: string | undefined;
  }): Promise<PortalRequestRow> {
    const doc = await PortalRequestModel.create({
      tenantId: input.tenantId ?? null,
      kind: input.kind,
      name: input.name,
      phone: input.phone ?? '',
      email: input.email ?? '',
      address: input.address ?? '',
      subject: input.subject ?? '',
      message: input.message ?? '',
      payload: input.payload ?? {},
      userId: input.userId ?? null,
      sourceIp: input.sourceIp ?? '',
    });
    return toPortalRequestRow(doc.toObject() as PortalRequestDoc);
  }

  async listPortalRequests(filter: FilterQuery<PortalRequestDoc>, limit: number): Promise<PortalRequestRow[]> {
    const docs = await PortalRequestModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((d) => toPortalRequestRow(d as PortalRequestDoc));
  }

  async createVisitorBooking(input: {
    tenantId: string;
    residentId: string;
    userId: string;
    visitorName: string;
    visitorPhone?: string | undefined;
    relation?: string | undefined;
    proposedDate: Date;
    proposedTimeSlot?: string | undefined;
    purpose?: string | undefined;
  }): Promise<VisitorBookingRow> {
    const doc = await VisitorBookingModel.create({
      tenantId: input.tenantId,
      residentId: input.residentId,
      userId: input.userId,
      visitorName: input.visitorName,
      visitorPhone: input.visitorPhone ?? '',
      relation: input.relation ?? '',
      proposedDate: input.proposedDate,
      proposedTimeSlot: input.proposedTimeSlot ?? '',
      purpose: input.purpose ?? '',
    });
    return toVisitorBookingRow(doc.toObject() as VisitorBookingDoc);
  }

  async listVisitorBookings(tenantId: string, userId: string, limit: number): Promise<VisitorBookingRow[]> {
    const docs = await VisitorBookingModel.find({ tenantId, userId }).sort({ proposedDate: -1 }).limit(limit).lean();
    return docs.map((d) => toVisitorBookingRow(d as VisitorBookingDoc));
  }

  async createVideoCallBooking(input: {
    tenantId: string;
    residentId: string;
    userId: string;
    requestedDate: Date;
    requestedTimeSlot?: string | undefined;
  }): Promise<VideoCallBookingRow> {
    const doc = await VideoCallBookingModel.create({
      tenantId: input.tenantId,
      residentId: input.residentId,
      userId: input.userId,
      requestedDate: input.requestedDate,
      requestedTimeSlot: input.requestedTimeSlot ?? '',
    });
    return toVideoCallBookingRow(doc.toObject() as VideoCallBookingDoc);
  }

  async listVideoCallBookings(tenantId: string, userId: string, limit: number): Promise<VideoCallBookingRow[]> {
    const docs = await VideoCallBookingModel.find({ tenantId, userId }).sort({ requestedDate: -1 }).limit(limit).lean();
    return docs.map((d) => toVideoCallBookingRow(d as VideoCallBookingDoc));
  }

  async upsertVolunteerProfile(input: {
    userId: string;
    tenantId?: string | null | undefined;
    skills?: string[] | undefined;
    interests?: string[] | undefined;
    availability?: string | undefined;
    emergencyContact?: string | undefined;
    identityProofUrl?: string | undefined;
  }): Promise<VolunteerProfileRow> {
    const doc = await VolunteerProfileModel.findOneAndUpdate(
      { userId: input.userId },
      {
        $set: {
          tenantId: input.tenantId ?? null,
          skills: input.skills ?? [],
          interests: input.interests ?? [],
          availability: input.availability ?? '',
          emergencyContact: input.emergencyContact ?? '',
          identityProofUrl: input.identityProofUrl ?? '',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return toVolunteerProfileRow(doc.toObject() as VolunteerProfileDoc);
  }

  async findVolunteerProfileByUserId(userId: string): Promise<VolunteerProfileRow | null> {
    const doc = await VolunteerProfileModel.findOne({ userId }).lean();
    return doc ? toVolunteerProfileRow(doc as VolunteerProfileDoc) : null;
  }

  async createSponsorPledge(input: {
    tenantId?: string | null | undefined;
    userId?: string | null | undefined;
    kind: 'resident' | 'meals';
    residentId?: string | null | undefined;
    donorName: string;
    donorEmail?: string | undefined;
    donorPhone?: string | undefined;
    amount?: number | null | undefined;
    frequency?: string | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    mealCount?: number | null | undefined;
    notes?: string | undefined;
  }): Promise<SponsorPledgeRow> {
    const doc = await SponsorPledgeModel.create({
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      kind: input.kind,
      residentId: input.residentId ?? null,
      donorName: input.donorName,
      donorEmail: input.donorEmail ?? '',
      donorPhone: input.donorPhone ?? '',
      amount: input.amount ?? null,
      frequency: input.frequency ?? 'one-time',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      mealCount: input.mealCount ?? null,
      notes: input.notes ?? '',
    });
    return toSponsorPledgeRow(doc.toObject() as SponsorPledgeDoc);
  }

  async listSponsorPledges(filter: FilterQuery<SponsorPledgeDoc>, limit: number): Promise<SponsorPledgeRow[]> {
    const docs = await SponsorPledgeModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((d) => toSponsorPledgeRow(d as SponsorPledgeDoc));
  }

  async createVolunteerActivityLog(input: VolunteerActivityLogInput): Promise<VolunteerActivityLogRow> {
    const doc = await VolunteerActivityLogModel.create({
      tenantId: input.tenantId,
      userId: input.userId,
      activityDate: input.activityDate,
      hours: input.hours,
      activityType: input.activityType,
      description: input.description,
      residentIds: input.residentIds ?? [],
    });
    return toVolunteerActivityLogRow(doc.toObject() as VolunteerActivityLogDoc);
  }

  async listVolunteerActivityLogs(tenantId: string, userId: string, limit: number): Promise<VolunteerActivityLogRow[]> {
    const docs = await VolunteerActivityLogModel.find({ tenantId, userId }).sort({ activityDate: -1 }).limit(limit).lean();
    return docs.map((d) => toVolunteerActivityLogRow(d as VolunteerActivityLogDoc));
  }
}

export default PortalRepository;
