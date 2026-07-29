import { Schema } from 'mongoose';

export const GOV_JURISDICTION_SUBSCHEMA = new Schema(
  {
    level: { type: String, enum: ['all', 'state', 'region', 'district', 'taluka'], default: null },
    stateId: { type: Schema.Types.ObjectId, default: null, ref: 'State' },
    regionId: { type: Schema.Types.ObjectId, default: null, ref: 'Region' },
    districtId: { type: Schema.Types.ObjectId, default: null, ref: 'District' },
    talukaId: { type: Schema.Types.ObjectId, default: null, ref: 'Taluka' },
  },
  { _id: false },
);
