import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const SREG_STATUSES = ['DRAFT', 'SUBMITTED', 'FINALIZED'] as const;
export type SRegStatus = (typeof SREG_STATUSES)[number];

export const SREG_CODES = ['food-taste', 'source-verified'] as const;
export type SRegCode = (typeof SREG_CODES)[number];

export const SREG_CODE_LABELS: Record<SRegCode, { en: string; mr: string; hi: string; prefix: string }> = {
  'food-taste': { en: 'FOOD TASTE REGISTER', mr: 'भोजन चव रजिस्टर', hi: 'भोजन स्वाद रजिस्टर', prefix: 'FT' },
  'source-verified': { en: 'SOURCE-VERIFIED REGISTER', mr: 'स्रोत-पडताळलेले रजिस्टर', hi: 'स्रोत-सत्यापित रजिस्टर', prefix: 'SV' },
};

export const SREG_COLUMN_TYPES = ['text', 'number', 'date', 'signature'] as const;
export type SRegColumnType = (typeof SREG_COLUMN_TYPES)[number];

const ColumnSchema = new Schema(
  {
    key: { type: String, required: true },
    en: { type: String, required: true },
    mr: { type: String, default: '' },
    hi: { type: String, default: '' },
    type: { type: String, enum: SREG_COLUMN_TYPES, default: 'text' },
    required: { type: Boolean, default: false },
    sourceFlag: { type: Boolean, default: false },
    sourceFieldNumber: { type: Number, default: null, nullable: true },
  },
  { _id: false },
);

const SchemaRegisterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    code: { type: String, enum: SREG_CODES, required: true },
    columns: { type: [ColumnSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'schema_register_defs' },
);
SchemaRegisterSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export type SRegColumn = InferSchemaType<typeof ColumnSchema>;
export type SchemaRegisterDoc = InferSchemaType<typeof SchemaRegisterSchema> & { _id: Types.ObjectId };

export const SchemaRegisterModel = model<SchemaRegisterDoc & Document>('SchemaRegister', SchemaRegisterSchema) as Model<SchemaRegisterDoc & Document>;

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

const SchemaRegisterEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    code: { type: String, enum: SREG_CODES, required: true, index: true },
    entryNumber: { type: String, required: true, index: true },
    status: { type: String, enum: SREG_STATUSES, default: 'DRAFT', index: true },
    date: { type: Date, default: null, index: true },
    month: { type: String, default: '' },
    values: { type: Map, of: Schema.Types.Mixed, default: {} },
    signatures: { type: Map, of: String, default: {} },
    documents: { type: [String], default: [] },
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
  { timestamps: true, versionKey: false, collection: 'schema_register_entries' },
);
SchemaRegisterEntrySchema.index({ tenantId: 1, code: 1, entryNumber: 1 }, { unique: true });
SchemaRegisterEntrySchema.index({ tenantId: 1, code: 1, date: -1 });

export type SRegChange = InferSchemaType<typeof ChangeSchema>;
export type SchemaRegisterEntryDoc = InferSchemaType<typeof SchemaRegisterEntrySchema> & { _id: Types.ObjectId };

export const SchemaRegisterEntryModel = model<SchemaRegisterEntryDoc & Document>('SchemaRegisterEntry', SchemaRegisterEntrySchema) as Model<SchemaRegisterEntryDoc & Document>;

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    code: { type: String, enum: SREG_CODES, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'schema_register_counters' },
);
CounterSchema.index({ tenantId: 1, code: 1, year: 1 }, { unique: true });

export const SchemaRegisterCounterModel = model('SchemaRegisterCounter', CounterSchema);
