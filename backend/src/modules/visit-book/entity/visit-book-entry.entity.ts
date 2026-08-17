import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const VISIT_BOOK_STATUSES = ['DRAFT', 'SUBMITTED', 'FINALIZED'] as const;
export type VisitBookStatus = (typeof VISIT_BOOK_STATUSES)[number];

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

const VisitBookEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    entryNumber: { type: String, required: true, index: true },
    status: { type: String, enum: VISIT_BOOK_STATUSES, default: 'DRAFT', index: true },

    entryDate: { type: Date, default: null },
    officerName: { type: String, default: '', index: true },
    officerPost: { type: String, default: '' },
    remark: { type: String, default: '' },

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
  { timestamps: true, versionKey: false, collection: 'visit_book_entries' },
);
VisitBookEntrySchema.index({ tenantId: 1, entryNumber: 1 }, { unique: true });
VisitBookEntrySchema.index({ tenantId: 1, entryDate: -1 });
VisitBookEntrySchema.index({ tenantId: 1, officerName: 1 });

export type VisitBookChange = InferSchemaType<typeof ChangeSchema>;
export type VisitBookEntryDoc = InferSchemaType<typeof VisitBookEntrySchema> & { _id: Types.ObjectId }

export const VisitBookEntryModel = model<VisitBookEntryDoc & Document>('VisitBookEntry', VisitBookEntrySchema) as Model<VisitBookEntryDoc & Document>;

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'visit_book_counters' },
);
CounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export const VisitBookCounterModel = model('VisitBookCounter', CounterSchema);
