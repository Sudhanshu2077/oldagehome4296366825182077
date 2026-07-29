import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const InstitutionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    nameMr: { type: String, default: '', trim: true },
    code: { type: String, required: true, unique: true, index: true },
    type: { type: String, default: 'old-age-home', index: true },
    contactEmail: { type: String, default: '', lowercase: true, trim: true },
    contactPhone: { type: String, default: '' },
    addressLine: { type: String, default: '' },
    villageId: { type: Schema.Types.ObjectId, ref: 'Village', default: null, index: true },
    talukaId: { type: Schema.Types.ObjectId, ref: 'Taluka', default: null, index: true },
    districtId: { type: Schema.Types.ObjectId, ref: 'District', default: null, index: true },
    stateId: { type: Schema.Types.ObjectId, ref: 'State', default: null, index: true },
    regionId: { type: Schema.Types.ObjectId, ref: 'Region', default: null, index: true },
    jurisdictionPath: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    gpsLat: { type: Number, default: null },
    gpsLng: { type: Number, default: null },
    registeredAt: { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export type InstitutionDoc = InferSchemaType<typeof InstitutionSchema> & { _id: Types.ObjectId }

export const InstitutionModel = model<InstitutionDoc & Document>('Institution', InstitutionSchema) as Model<
  InstitutionDoc & Document
>;
