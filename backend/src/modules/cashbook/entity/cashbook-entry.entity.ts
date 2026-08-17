import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const CASHBOOK_STATUSES = ['DRAFT', 'SUBMITTED', 'FINALIZED'] as const;
export type CashbookStatus = (typeof CASHBOOK_STATUSES)[number];

export const CASHBOOK_EDITABLE_FIELDS = [
  'entryDate',
  'month',
  'vrNo',
  'particulars',
  'lfNo',
  'cashRupees',
  'cashPaise',
  'bankRupees',
  'bankPaise',
  'remarks',
] as const;
export type CashbookField = (typeof CASHBOOK_EDITABLE_FIELDS)[number];

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

const CashbookEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    entryNumber: { type: String, required: true, index: true },
    status: { type: String, enum: CASHBOOK_STATUSES, default: 'DRAFT', index: true },

    entryDate: { type: Date, default: null, index: true },
    month: { type: String, default: '' },
    vrNo: { type: String, default: '' },
    particulars: { type: String, default: '' },
    lfNo: { type: String, default: '' },
    cashRupees: { type: Number, default: 0 },
    cashPaise: { type: Number, default: 0 },
    bankRupees: { type: Number, default: 0 },
    bankPaise: { type: Number, default: 0 },
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
  { timestamps: true, versionKey: false, collection: 'cashbook_entries' },
);
CashbookEntrySchema.index({ tenantId: 1, entryNumber: 1 }, { unique: true });
CashbookEntrySchema.index({ tenantId: 1, entryDate: -1 });

export type CashbookChange = InferSchemaType<typeof ChangeSchema>;
export type CashbookEntryDoc = InferSchemaType<typeof CashbookEntrySchema> & { _id: Types.ObjectId };

export const CashbookEntryModel = model<CashbookEntryDoc & Document>('CashbookEntry', CashbookEntrySchema) as Model<CashbookEntryDoc & Document>;

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'cashbook_counters' },
);
CounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export const CashbookCounterModel = model('CashbookCounter', CounterSchema);
