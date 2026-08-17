import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const MEDICAL_STATUSES = ['DRAFT', 'SUBMITTED', 'FINALIZED'] as const;
export type MedicalStatus = (typeof MEDICAL_STATUSES)[number];

export const MEDICAL_EDITABLE_FIELDS = [
  'personId',
  'personName',
  'diseaseNature',
  'illnessDate',
  'medicineParticulars',
  'medicineAllowances',
  'medicalOfficerName',
  'medicalOfficerSignature',
  'remarks',
] as const;
export type MedicalField = (typeof MEDICAL_EDITABLE_FIELDS)[number];

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

const MedicalEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    entryNumber: { type: String, required: true, index: true },
    status: { type: String, enum: MEDICAL_STATUSES, default: 'DRAFT', index: true },

    personId: { type: Schema.Types.ObjectId, default: null, index: true },
    personName: { type: String, default: '', index: true },
    diseaseNature: { type: String, default: '' },
    illnessDate: { type: Date, default: null },
    medicineParticulars: { type: String, default: '' },
    medicineAllowances: { type: String, default: '' },
    medicalOfficerName: { type: String, default: '' },
    medicalOfficerSignature: { type: String, default: '' },
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
  { timestamps: true, versionKey: false, collection: 'medical_entries' },
);
MedicalEntrySchema.index({ tenantId: 1, entryNumber: 1 }, { unique: true });
MedicalEntrySchema.index({ tenantId: 1, illnessDate: -1 });
MedicalEntrySchema.index({ tenantId: 1, personId: 1, illnessDate: -1 });

export type MedicalChange = InferSchemaType<typeof ChangeSchema>;
export type MedicalEntryDoc = InferSchemaType<typeof MedicalEntrySchema> & { _id: Types.ObjectId };

export const MedicalEntryModel = model<MedicalEntryDoc & Document>('MedicalEntry', MedicalEntrySchema) as Model<MedicalEntryDoc & Document>;

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'medical_counters' },
);
CounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export const MedicalCounterModel = model('MedicalCounter', CounterSchema);
