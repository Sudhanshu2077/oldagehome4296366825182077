import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const INOUT_STATUSES = ['DRAFT', 'OUT', 'RETURNED'] as const;
export type InOutStatus = (typeof INOUT_STATUSES)[number];

export const INOUT_EDITABLE_FIELDS = ['outDate', 'outTime', 'place', 'reason', 'returnDate', 'returnTime', 'remarks'] as const;
export type InOutField = (typeof INOUT_EDITABLE_FIELDS)[number];

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

const InOutEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    entryNumber: { type: String, required: true, index: true },
    status: { type: String, enum: INOUT_STATUSES, default: 'DRAFT', index: true },

    employeeId: { type: Schema.Types.ObjectId, default: null, index: true },
    employeeCode: { type: String, default: '' },
    employeeName: { type: String, default: '', index: true },

    outDate: { type: Date, default: null, index: true },
    outTime: { type: String, default: '' },
    place: { type: String, default: '' },
    reason: { type: String, default: '' },
    outSignature: { type: String, default: '' },

    returnDate: { type: Date, default: null },
    returnTime: { type: String, default: '' },
    inSignature: { type: String, default: '' },
    remarks: { type: String, default: '' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    outSubmittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    outSubmittedAt: { type: Date, default: null },
    returnSubmittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    returnSubmittedAt: { type: Date, default: null },

    changes: { type: [ChangeSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'employee_inout_entries' },
);
InOutEntrySchema.index({ tenantId: 1, entryNumber: 1 }, { unique: true });
InOutEntrySchema.index({ tenantId: 1, status: 1, outDate: -1 });
InOutEntrySchema.index({ tenantId: 1, employeeId: 1, outDate: -1 });

export type InOutChange = InferSchemaType<typeof ChangeSchema>;
export type InOutEntryDoc = InferSchemaType<typeof InOutEntrySchema> & { _id: Types.ObjectId }

export const InOutEntryModel = model<InOutEntryDoc & Document>('InOutEntry', InOutEntrySchema) as Model<InOutEntryDoc & Document>;

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'employee_inout_counters' },
);
CounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export const InOutCounterModel = model('InOutCounter', CounterSchema);