import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const ATT_STATUSES = ['PRESENT', 'ABSENT', 'ON_LEAVE', 'MEDICAL', 'TEMPORARILY_OUT', 'OTHER'] as const;
export type AttStatus = (typeof ATT_STATUSES)[number];

export const ATT_SESSION_STATUSES = ['DRAFT', 'SUBMITTED'] as const;
export type AttSessionStatus = (typeof ATT_SESSION_STATUSES)[number];

const EntrySchema = new Schema(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'Erp_residents', required: true, index: true },
    residentNumber: { type: String, default: '' },
    fullName: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Erp_rooms', default: null },
    roomName: { type: String, default: '' },
    bedId: { type: Schema.Types.ObjectId, ref: 'Erp_beds', default: null },
    bedName: { type: String, default: '' },
    status: { type: String, enum: ATT_STATUSES, required: true },
    reason: { type: String, default: '' },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    markedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const CorrectionSchema = new Schema(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'Erp_residents', required: true },
    residentNumber: { type: String, default: '' },
    fullName: { type: String, default: '' },
    originalStatus: { type: String, enum: ATT_STATUSES, required: true },
    newStatus: { type: String, enum: ATT_STATUSES, required: true },
    reason: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const AttSessionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    attendanceDate: { type: Date, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    status: { type: String, enum: ATT_SESSION_STATUSES, default: 'DRAFT', index: true },
    entries: { type: [EntrySchema], default: [] },
    corrections: { type: [CorrectionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'resident_attendance_sessions' },
);
AttSessionSchema.index({ tenantId: 1, attendanceDate: 1 }, { unique: true });

export type AttEntry = InferSchemaType<typeof EntrySchema>;
export type AttCorrection = InferSchemaType<typeof CorrectionSchema>;
export type AttSessionDoc = InferSchemaType<typeof AttSessionSchema> & { _id: Types.ObjectId };

export const AttSessionModel = model<AttSessionDoc & Document>('AttSession', AttSessionSchema) as Model<AttSessionDoc & Document>;

const AttSessionCounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'att_session_counters' },
);
AttSessionCounterSchema.index({ tenantId: 1 }, { unique: true });

export const AttSessionCounterModel = model('AttSessionCounter', AttSessionCounterSchema);