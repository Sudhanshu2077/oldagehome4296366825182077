import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const YWA_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'FINALIZED', 'VOIDED'] as const;
export type YwaStatus = (typeof YWA_STATUSES)[number];

export const YWA_SIGNATURE_TYPES = ['digital', 'uploaded', 'thumb', 'none'] as const;
export type YwaSignatureType = (typeof YWA_SIGNATURE_TYPES)[number];

export const YWA_EDITABLE_FIELDS = [
  'registerYear',
  'residentId',
  'residentNumber',
  'fullName',
  'birthDate',
  'birthYear',
  'aadhaar',
  'signatureType',
  'signatureUrl',
  'thumbImpressionUrl',
  'noSignatureReason',
  'photoUrl',
  'admissionDate',
  'officerId',
  'officerName',
  'officerDesignation',
  'officerSignature',
  'remarks',
] as const;
export type YwaField = (typeof YWA_EDITABLE_FIELDS)[number];

const ChangeSchema = new Schema(
  {
    field: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const YwaEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    registerYear: { type: String, required: true, index: true },
    entryNumber: { type: String, required: true, index: true },
    status: { type: String, enum: YWA_STATUSES, default: 'DRAFT', index: true },

    residentId: { type: Schema.Types.ObjectId, ref: 'Erp_residents', default: null, index: true },
    residentNumber: { type: String, default: '', index: true },
    fullName: { type: String, default: '', index: true },
    birthDate: { type: Date, default: null },
    birthYear: { type: Number, default: null },
    aadhaarEnc: { type: String, default: '' },
    aadhaarLast4: { type: String, default: '' },
    signatureType: { type: String, enum: YWA_SIGNATURE_TYPES, default: 'none' },
    signatureUrl: { type: String, default: '' },
    thumbImpressionUrl: { type: String, default: '' },
    noSignatureReason: { type: String, default: '' },
    signatureCapturedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    signatureCapturedAt: { type: Date, default: null },
    photoUrl: { type: String, default: '' },
    photoUploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    photoUploadedAt: { type: Date, default: null },
    admissionDate: { type: Date, default: null, index: true },
    officerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    officerName: { type: String, default: '' },
    officerDesignation: { type: String, default: '' },
    officerSignature: { type: String, default: '' },
    officerSignedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedAt: { type: Date, default: null },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, default: '' },

    changes: { type: [ChangeSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'ywa_entries' },
);
YwaEntrySchema.index({ tenantId: 1, registerYear: 1, entryNumber: 1 }, { unique: true });
YwaEntrySchema.index({ tenantId: 1, registerYear: 1, residentId: 1 });
YwaEntrySchema.index({ tenantId: 1, admissionDate: -1 });

export type YwaChange = InferSchemaType<typeof ChangeSchema>;
export type YwaEntryDoc = InferSchemaType<typeof YwaEntrySchema> & { _id: Types.ObjectId };

export const YwaEntryModel = model<YwaEntryDoc & Document>('YwaEntry', YwaEntrySchema) as Model<YwaEntryDoc & Document>;

const YwaCounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    registerYear: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'ywa_counters' },
);
YwaCounterSchema.index({ tenantId: 1, registerYear: 1 }, { unique: true });

export const YwaCounterModel = model('YwaCounter', YwaCounterSchema);