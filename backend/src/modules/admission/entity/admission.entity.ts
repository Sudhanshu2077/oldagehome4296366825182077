import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const ADMISSION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_REVIEW',
  'RECOMMENDED',
  'NOT_RECOMMENDED',
  'APPROVED',
  'REJECTED',
  'QUERY_RAISED',
] as const;

export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

export const OCCUPATION_STATUSES = ['government', 'private', 'homemaker', 'unmarried'] as const;
export type OccupationStatus = (typeof OCCUPATION_STATUSES)[number];

const RelativeSchema = new Schema(
  {
    name: { type: String, default: '' },
    age: { type: Number, default: null },
    relation: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  { _id: false },
);

const ChangeSchema = new Schema(
  {
    field: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: () => new Date() },
    ip: { type: String, default: '' },
    device: { type: String, default: '' },
  },
  { _id: false },
);

const CommitteeEntrySchema = new Schema(
  {
    role: { type: String, default: '' },
    memberName: { type: String, default: '' },
    comment: { type: String, default: '' },
    decision: { type: String, default: '' },
    signatureUrl: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { _id: false },
);

const AdmissionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    applicationNumber: { type: String, required: true, index: true },
    status: { type: String, enum: ADMISSION_STATUSES, default: 'DRAFT', index: true },

    name: { type: String, required: true, index: true },
    fatherName: { type: String, default: '' },
    husbandName: { type: String, default: '' },
    surname: { type: String, default: '' },
    caste: { type: String, default: '' },
    religion: { type: String, default: '' },
    address: { type: String, default: '' },
    village: { type: String, default: '' },
    taluka: { type: String, default: '' },
    district: { type: String, default: '' },
    admissionDate: { type: Date, default: null },

    currentAge: { type: Number, default: null },
    idProofNumber: { type: String, default: '' },
    aadhaarEnc: { type: String, default: '' },
    aadhaarLast4: { type: String, default: '' },

    occupationStatus: { type: String, enum: OCCUPATION_STATUSES, default: null },

    husband: { type: RelativeSchema, default: null },
    wife: { type: RelativeSchema, default: null },
    sonsDaughters: { type: [RelativeSchema], default: [] },
    brothers: { type: [RelativeSchema], default: [] },

    annualIncome: { type: Number, default: null },
    freeAdmissionRequested: { type: Boolean, default: false },
    paidAdmission: { type: Boolean, default: false },
    monthlyFeeAcceptance: { type: Boolean, default: false },

    dailyActivitiesSelf: { type: Boolean, default: false },
    noInfectiousDisease: { type: Boolean, default: false },
    rulesAccepted: { type: Boolean, default: false },
    noSubstanceAddiction: { type: Boolean, default: false },
    govRuleReference: { type: String, default: '' },
    recreationalActivities: { type: [String], default: [] },
    femaleRoomAvailable: { type: Boolean, default: null },

    photoUrl: { type: String, default: '' },
    photoVerificationStatus: { type: String, default: 'pending' },
    photoUploadedAt: { type: Date, default: null },
    photoUploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    signatureMethod: { type: String, default: '' },
    signatureUrl: { type: String, default: '' },
    thumbImpressionUrl: { type: String, default: '' },
    signatureCapturedAt: { type: Date, default: null },
    signatureDevice: { type: String, default: '' },
    signatureCapturedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    finalDeclarationAccepted: { type: Boolean, default: false },
    submissionId: { type: String, default: '' },

    committee: { type: [CommitteeEntrySchema], default: [] },
    committeeDecision: { type: Schema.Types.Mixed, default: null },

    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvalDate: { type: Date, default: null },
    residentId: { type: Schema.Types.ObjectId, ref: 'Erp_residents', default: null },

    changes: { type: [ChangeSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'admission_applications' },
);

AdmissionSchema.index({ tenantId: 1, status: 1 });
AdmissionSchema.index({ tenantId: 1, createdAt: -1 });

export type Relative = InferSchemaType<typeof RelativeSchema>;
export type ChangeRecord = InferSchemaType<typeof ChangeSchema>;
export type CommitteeEntry = InferSchemaType<typeof CommitteeEntrySchema>;
export type AdmissionDoc = InferSchemaType<typeof AdmissionSchema> & { _id: Types.ObjectId }

export const AdmissionModel = model<AdmissionDoc & Document>('Admission', AdmissionSchema) as Model<AdmissionDoc & Document>;

const CounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false, collection: 'admission_counters' },
);
CounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export const AdmissionCounterModel = model('AdmissionCounter', CounterSchema);
