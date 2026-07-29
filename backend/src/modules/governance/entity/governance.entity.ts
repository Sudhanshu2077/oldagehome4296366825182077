import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const MonthlyLockSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    locked: { type: Boolean, default: true },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lockedAt: { type: Date, default: () => new Date() },
    governmentApprovedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'monthly_locks' },
);
MonthlyLockSchema.index({ tenantId: 1, year: 1, month: 1 }, { unique: true });

export type MonthlyLockDoc = InferSchemaType<typeof MonthlyLockSchema> & { _id: Types.ObjectId };
export const MonthlyLockModel = model<MonthlyLockDoc & Document>('MonthlyLock', MonthlyLockSchema) as Model<MonthlyLockDoc & Document>;

const UnlockRequestSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    reason: { type: String, required: true },
    documentsUrls: { type: String, default: '' },
    status: { type: String, enum: ['submitted', 'district-review', 'approved', 'rejected', 'temporary-unlock', 'expired'], default: 'submitted', index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNotes: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'unlock_requests' },
);

export type UnlockRequestDoc = InferSchemaType<typeof UnlockRequestSchema> & { _id: Types.ObjectId };
export const UnlockRequestModel = model<UnlockRequestDoc & Document>('UnlockRequest', UnlockRequestSchema) as Model<UnlockRequestDoc & Document>;

const ApprovalSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    requestType: { type: String, required: true, index: true },
    referenceId: { type: String, default: '' },
    summary: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: null },
    currentLevel: { type: String, enum: ['district', 'regional', 'state'], default: 'district', index: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'changes-requested', 'escalated'], default: 'pending', index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decisionNotes: { type: String, default: '' },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'approvals' },
);

export type ApprovalDoc = InferSchemaType<typeof ApprovalSchema> & { _id: Types.ObjectId };
export const ApprovalModel = model<ApprovalDoc & Document>('Approval', ApprovalSchema) as Model<ApprovalDoc & Document>;

const InspectionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    scheduledDate: { type: Date, required: true, index: true },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    inspectorName: { type: String, default: '' },
    checklist: { type: Schema.Types.Mixed, default: null },
    gpsLat: { type: Number, default: null },
    gpsLng: { type: Number, default: null },
    qrVerified: { type: Boolean, default: false },
    photoUrls: { type: [String], default: [] },
    voiceNoteUrls: { type: [String], default: [] },
    score: { type: Number, default: null },
    findings: { type: String, default: '' },
    noticeIssued: { type: Boolean, default: false },
    digitalSignatureUrl: { type: String, default: '' },
    status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'follow-up'], default: 'scheduled', index: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'inspections' },
);

export type InspectionDoc = InferSchemaType<typeof InspectionSchema> & { _id: Types.ObjectId };
export const InspectionModel = model<InspectionDoc & Document>('Inspection', InspectionSchema) as Model<InspectionDoc & Document>;

const ComplianceItemSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    category: { type: String, enum: ['license', 'inspection', 'finance', 'health', 'safety', 'hygiene', 'staffing', 'documentation', 'other'], default: 'other', index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'in-progress', 'compliant', 'non-compliant', 'overdue', 'waived'], default: 'pending', index: true },
    score: { type: Number, default: null },
    evidenceUrl: { type: String, default: '' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'compliance_items' },
);
ComplianceItemSchema.index({ tenantId: 1, status: 1 });
ComplianceItemSchema.index({ tenantId: 1, dueDate: 1 });

export type ComplianceItemDoc = InferSchemaType<typeof ComplianceItemSchema> & { _id: Types.ObjectId };
export const ComplianceItemModel = model<ComplianceItemDoc & Document>('ComplianceItem', ComplianceItemSchema) as Model<ComplianceItemDoc & Document>;

const GovGrantSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    scheme: { type: String, required: true, index: true },
    grantCode: { type: String, default: '', index: true },
    financialYear: { type: Number, default: null },
    sanctionedAmount: { type: Number, required: true },
    releasedAmount: { type: Number, default: 0 },
    utilizedAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['sanctioned', 'released', 'partially-utilized', 'fully-utilized', 'lapsed', 'suspended'], default: 'sanctioned', index: true },
    releaseDate: { type: Date, default: null },
    utilizationCertificateUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'gov_grants' },
);

export type GovGrantDoc = InferSchemaType<typeof GovGrantSchema> & { _id: Types.ObjectId };
export const GovGrantModel = model<GovGrantDoc & Document>('GovGrant', GovGrantSchema) as Model<GovGrantDoc & Document>;

const EmergencyControlSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, enum: ['fire', 'medical', 'disaster', 'missing', 'security', 'outbreak', 'other'], required: true, index: true },
    status: { type: String, enum: ['active', 'resolved', 'stand-down'], default: 'active', index: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNotes: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'emergency_controls' },
);
EmergencyControlSchema.index({ tenantId: 1, status: 1 });

export type EmergencyControlDoc = InferSchemaType<typeof EmergencyControlSchema> & { _id: Types.ObjectId };
export const EmergencyControlModel = model<EmergencyControlDoc & Document>('EmergencyControl', EmergencyControlSchema) as Model<EmergencyControlDoc & Document>;

const GovAuditFindingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    auditId: { type: String, default: '', index: true },
    source: { type: String, enum: ['government', 'inspection', 'institution'], default: 'government' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    severity: { type: String, enum: ['observation', 'minor', 'major', 'critical'], default: 'observation', index: true },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open', index: true },
    dueDate: { type: Date, default: null },
    correctiveAction: { type: String, default: '' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'gov_audit_findings' },
);
GovAuditFindingSchema.index({ tenantId: 1, status: 1 });

export type GovAuditFindingDoc = InferSchemaType<typeof GovAuditFindingSchema> & { _id: Types.ObjectId };
export const GovAuditFindingModel = model<GovAuditFindingDoc & Document>('GovAuditFinding', GovAuditFindingSchema) as Model<GovAuditFindingDoc & Document>;

const GovCircularSchema = new Schema(
  {
    title: { type: String, required: true, index: true },
    body: { type: String, default: '' },
    scope: { type: String, enum: ['all', 'state', 'region', 'district', 'taluka'], default: 'all', index: true },
    stateId: { type: Schema.Types.ObjectId, ref: 'State', default: null, index: true },
    regionId: { type: Schema.Types.ObjectId, ref: 'Region', default: null, index: true },
    districtId: { type: Schema.Types.ObjectId, ref: 'District', default: null, index: true },
    talukaId: { type: Schema.Types.ObjectId, ref: 'Taluka', default: null, index: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', index: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    issuedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, default: null },
    attachments: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false, collection: 'gov_circulars' },
);

export type GovCircularDoc = InferSchemaType<typeof GovCircularSchema> & { _id: Types.ObjectId };
export const GovCircularModel = model<GovCircularDoc & Document>('GovCircular', GovCircularSchema) as Model<GovCircularDoc & Document>;
