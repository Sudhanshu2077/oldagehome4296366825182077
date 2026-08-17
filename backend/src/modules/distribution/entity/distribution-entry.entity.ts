import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const DIST_STATUSES = ['DRAFT', 'SUBMITTED', 'FINALIZED'] as const;
export type DistStatus = (typeof DIST_STATUSES)[number];

export const DIST_EDITABLE_FIELDS = [
  'date',
  'personName',
  'className',
  'clothesWashingPowder',
  'clothesWashingSoap',
  'bathingSoap',
  'toothPowder',
  'paste',
  'brush',
  'sourceColumn10',
  'sourceColumn11',
  'distributionDate',
  'superintendentSignature',
  'remarks',
] as const;
export type DistField = (typeof DIST_EDITABLE_FIELDS)[number];

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

const DistributionEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    entryNumber: { type: String, required: true, index: true },
    status: { type: String, enum: DIST_STATUSES, default: 'DRAFT', index: true },

    personId: { type: Schema.Types.ObjectId, default: null, index: true },
    personName: { type: String, default: '', index: true },
    className: { type: String, default: '' },

    date: { type: Date, default: null, index: true },
    clothesWashingPowder: { type: Number, default: 0 },
    clothesWashingSoap: { type: Number, default: 0 },
    bathingSoap: { type: Number, default: 0 },
    toothPowder: { type: Number, default: 0 },
    paste: { type: Number, default: 0 },
    brush: { type: Number, default: 0 },
    sourceColumn10: { type: Number, default: 0 },
    sourceColumn11: { type: Number, default: 0 },

    distributionDate: { type: Date, default: null },
    superintendentSignature: { type: String, default: '' },
    remarks: { type: String, default: '' },

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
  { timestamps: true, versionKey: false, collection: 'distribution_entries' },
);
DistributionEntrySchema.index({ tenantId: 1, entryNumber: 1 }, { unique: true });
DistributionEntrySchema.index({ tenantId: 1, date: -1 });
DistributionEntrySchema.index({ tenantId: 1, personId: 1, date: -1 });

export type DistChange = InferSchemaType<typeof ChangeSchema>;
export type DistributionEntryDoc = InferSchemaType<typeof DistributionEntrySchema> & { _id: Types.ObjectId }

export const DistributionEntryModel = model<DistributionEntryDoc & Document>('DistributionEntry', DistributionEntrySchema) as Model<DistributionEntryDoc & Document>;

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'distribution_counters' },
);
CounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export const DistributionCounterModel = model('DistributionCounter', CounterSchema);