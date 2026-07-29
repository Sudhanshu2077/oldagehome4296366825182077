import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export type PortalRequestKind =
  | 'admission-request'
  | 'complaint'
  | 'feedback'
  | 'volunteer-register'
  | 'donation-pledge';

export const PortalRequestKindValues: readonly PortalRequestKind[] = [
  'admission-request',
  'complaint',
  'feedback',
  'volunteer-register',
  'donation-pledge',
];

const PortalRequestSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    kind: { type: String, enum: PortalRequestKindValues, required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', lowercase: true, trim: true, index: true },
    address: { type: String, default: '' },
    subject: { type: String, default: '' },
    message: { type: String, default: '' },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    sourceIp: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'portal_requests' },
);

PortalRequestSchema.index({ tenantId: 1, kind: 1, status: 1 });
PortalRequestSchema.index({ createdAt: -1 });

export type PortalRequestDoc = InferSchemaType<typeof PortalRequestSchema> & { _id: Types.ObjectId };
export const PortalRequestModel = model<PortalRequestDoc & Document>('PortalRequest', PortalRequestSchema) as Model<
  PortalRequestDoc & Document
>;

const VisitorBookingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Erp_residents', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visitorName: { type: String, required: true, trim: true },
    visitorPhone: { type: String, default: '' },
    relation: { type: String, default: '' },
    proposedDate: { type: Date, required: true },
    proposedTimeSlot: { type: String, default: '' },
    purpose: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'], default: 'pending', index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'visitor_bookings' },
);

VisitorBookingSchema.index({ tenantId: 1, userId: 1, proposedDate: -1 });

export type VisitorBookingDoc = InferSchemaType<typeof VisitorBookingSchema> & { _id: Types.ObjectId };
export const VisitorBookingModel = model<VisitorBookingDoc & Document>('VisitorBooking', VisitorBookingSchema) as Model<
  VisitorBookingDoc & Document
>;

const VideoCallBookingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Erp_residents', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedDate: { type: Date, required: true },
    requestedTimeSlot: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'], default: 'pending', index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    callUrl: { type: String, default: '' },
    scheduledAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'video_call_bookings' },
);

VideoCallBookingSchema.index({ tenantId: 1, userId: 1, requestedDate: -1 });

export type VideoCallBookingDoc = InferSchemaType<typeof VideoCallBookingSchema> & { _id: Types.ObjectId };
export const VideoCallBookingModel = model<VideoCallBookingDoc & Document>('VideoCallBooking', VideoCallBookingSchema) as Model<
  VideoCallBookingDoc & Document
>;

const VolunteerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    availability: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    identityProofUrl: { type: String, default: '' },
    backgroundVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'active', 'inactive', 'suspended'], default: 'pending', index: true },
    onboardingNotes: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'volunteer_profiles' },
);

export type VolunteerProfileDoc = InferSchemaType<typeof VolunteerProfileSchema> & { _id: Types.ObjectId };
export const VolunteerProfileModel = model<VolunteerProfileDoc & Document>('VolunteerProfile', VolunteerProfileSchema) as Model<
  VolunteerProfileDoc & Document
>;

const SponsorPledgeSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    kind: { type: String, enum: ['resident', 'meals'], required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Erp_residents', default: null, index: true },
    donorName: { type: String, required: true, trim: true },
    donorEmail: { type: String, default: '', lowercase: true, trim: true },
    donorPhone: { type: String, default: '' },
    amount: { type: Number, default: null },
    frequency: { type: String, enum: ['one-time', 'monthly', 'quarterly', 'yearly'], default: 'one-time' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    mealCount: { type: Number, default: null },
    status: { type: String, enum: ['pledged', 'active', 'paused', 'completed', 'cancelled'], default: 'pledged', index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'sponsor_pledges' },
);

SponsorPledgeSchema.index({ tenantId: 1, userId: 1, status: 1 });

export type SponsorPledgeDoc = InferSchemaType<typeof SponsorPledgeSchema> & { _id: Types.ObjectId };
export const SponsorPledgeModel = model<SponsorPledgeDoc & Document>('SponsorPledge', SponsorPledgeSchema) as Model<
  SponsorPledgeDoc & Document
>;

export interface VolunteerActivityLogInput {
  tenantId: string;
  userId: string;
  activityDate: Date;
  hours: number;
  activityType: string;
  description: string;
  residentIds?: string[] | undefined;
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

const VolunteerActivityLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityDate: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0 },
    activityType: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    residentIds: { type: [Schema.Types.ObjectId], default: [], ref: 'Erp_residents' },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'volunteer_activity_logs' },
);

VolunteerActivityLogSchema.index({ tenantId: 1, userId: 1, activityDate: -1 });

export type VolunteerActivityLogDoc = InferSchemaType<typeof VolunteerActivityLogSchema> & { _id: Types.ObjectId };
export const VolunteerActivityLogModel = model<VolunteerActivityLogDoc & Document>('VolunteerActivityLog', VolunteerActivityLogSchema) as Model<
  VolunteerActivityLogDoc & Document
>;
