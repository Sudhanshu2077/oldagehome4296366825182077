import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const SettingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    scope: { type: String, required: true, index: true, default: 'institution' },
    group: { type: String, required: true, index: true },
    key: { type: String, required: true, index: true },
    value: { type: Schema.Types.Mixed, default: null },
    valueType: { type: String, default: 'string' },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false, versionKey: false, collection: 'settings' },
);

SettingSchema.index({ tenantId: 1, scope: 1, group: 1, key: 1 }, { unique: true });

export type SettingDoc = InferSchemaType<typeof SettingSchema> & { _id: Types.ObjectId }

export const SettingModel = model<SettingDoc & Document>('Setting', SettingSchema) as Model<SettingDoc & Document>;
