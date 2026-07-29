import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const MASTER_CATALOGS = [
  'state', 'region', 'district', 'taluka', 'village', 'department',
  'blood-group', 'disease', 'medicine-category', 'room-type', 'bed-type',
  'donation-type', 'complaint-type', 'notification-type',
] as const;

export type MasterCatalog = (typeof MASTER_CATALOGS)[number];

const MasterDataSchema = new Schema(
  {
    catalog: { type: String, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    nameMr: { type: String, default: '' },
    parentCode: { type: String, default: null, index: true },
    active: { type: Boolean, default: true },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'master_data' },
);
MasterDataSchema.index({ catalog: 1, code: 1 }, { unique: true });

export type MasterDataDoc = InferSchemaType<typeof MasterDataSchema> & { _id: Types.ObjectId }
export const MasterDataModel = model<MasterDataDoc & Document>('MasterData', MasterDataSchema) as Model<MasterDataDoc & Document>;
