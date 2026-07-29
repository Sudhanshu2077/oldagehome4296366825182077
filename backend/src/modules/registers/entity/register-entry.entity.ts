import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    register: { type: String, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'counters' },
);
CounterSchema.index({ tenantId: 1, register: 1, year: 1 }, { unique: true });

export type CounterDoc = InferSchemaType<typeof CounterSchema> & { _id: Types.ObjectId }
export const CounterModel = model<CounterDoc & Document>('Counter', CounterSchema) as Model<CounterDoc & Document>;

const RegisterEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    register: { type: String, required: true, index: true },
    entryNumber: { type: String, required: true },
    entryYear: { type: Number, required: true },
    entrySeq: { type: Number, required: true },
    fields: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'register_entries' },
);
RegisterEntrySchema.index({ tenantId: 1, register: 1, entryNumber: 1 }, { unique: true });
RegisterEntrySchema.index({ tenantId: 1, register: 1, createdAt: -1 });

export type RegisterEntryDoc = InferSchemaType<typeof RegisterEntrySchema> & { _id: Types.ObjectId }
export const RegisterEntryModel = model<RegisterEntryDoc & Document>('RegisterEntry', RegisterEntrySchema) as Model<RegisterEntryDoc & Document>;
