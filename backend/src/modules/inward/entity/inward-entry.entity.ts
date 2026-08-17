import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const INWARD_STATUSES = ['DRAFT', 'SUBMITTED', 'FINALIZED'] as const;
export type InwardStatus = (typeof INWARD_STATUSES)[number];

export const INWARD_EDITABLE_FIELDS = ['fileNo', 'senderName', 'letterNo', 'receivedDate', 'subject', 'issuedTo'] as const;
export type InwardField = (typeof INWARD_EDITABLE_FIELDS)[number];

const ChangeSchema = new Schema(
  {
    field: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const AttachmentSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    filename: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: () => new Date() },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verificationStatus: { type: String, default: 'pending' },
  },
  { _id: false },
);

const InwardEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    entryNumber: { type: String, required: true, index: true },
    status: { type: String, enum: INWARD_STATUSES, default: 'DRAFT', index: true },

    fileNo: { type: String, default: '' },
    senderName: { type: String, default: '', index: true },
    letterNo: { type: String, default: '', index: true },
    receivedDate: { type: Date, default: null, index: true },
    subject: { type: String, default: '' },
    issuedTo: { type: String, default: '' },

    attachments: { type: [AttachmentSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedAt: { type: Date, default: null },

    changes: { type: [ChangeSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'inward_entries' },
);
InwardEntrySchema.index({ tenantId: 1, entryNumber: 1 }, { unique: true });
InwardEntrySchema.index({ tenantId: 1, receivedDate: -1 });
InwardEntrySchema.index({ tenantId: 1, letterNo: 1 });
InwardEntrySchema.index({ tenantId: 1, senderName: 1 });

export type InwardChange = InferSchemaType<typeof ChangeSchema>;
export type InwardAttachment = InferSchemaType<typeof AttachmentSchema>;
export type InwardEntryDoc = InferSchemaType<typeof InwardEntrySchema> & { _id: Types.ObjectId }

export const InwardEntryModel = model<InwardEntryDoc & Document>('InwardEntry', InwardEntrySchema) as Model<InwardEntryDoc & Document>;

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'inward_counters' },
);
CounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export const InwardCounterModel = model('InwardCounter', CounterSchema);
