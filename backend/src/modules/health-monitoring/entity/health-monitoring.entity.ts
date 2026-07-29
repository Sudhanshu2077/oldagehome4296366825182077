import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

export const OVERALL_STATUS_VALUES = ['stable', 'needs-attention', 'critical', 'resolved'] as const;
export type OverallStatus = (typeof OVERALL_STATUS_VALUES)[number];

export const VITAL_TYPE_VALUES = ['temperature', 'pulse', 'bp', 'sugar', 'weight', 'height', 'bmi'] as const;
export type VitalType = (typeof VITAL_TYPE_VALUES)[number];

export const REPORT_TYPE_VALUES = ['weekly', 'monthly'] as const;
export type ReportType = (typeof REPORT_TYPE_VALUES)[number];

const DailyHealthStatusSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Erp_residents' },
    date: { type: Date, required: true, index: true },
    overallStatus: { type: String, enum: OVERALL_STATUS_VALUES, default: 'stable', index: true },
    notes: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'health_daily_status' },
);
DailyHealthStatusSchema.index({ tenantId: 1, residentId: 1, date: -1 });

const VitalReadingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Erp_residents' },
    date: { type: Date, required: true, index: true },
    type: { type: String, enum: VITAL_TYPE_VALUES, required: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    unit: { type: String, required: true },
    notes: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'health_vitals' },
);
VitalReadingSchema.index({ tenantId: 1, residentId: 1, type: 1, date: -1 });

const AveragesSubSchema = new Schema(
  {
    temperature: { type: Number, default: null },
    pulse: { type: Number, default: null },
    systolic: { type: Number, default: null },
    diastolic: { type: Number, default: null },
    sugar: { type: Number, default: null },
    weight: { type: Number, default: null },
    height: { type: Number, default: null },
    bmi: { type: Number, default: null },
  },
  { _id: false },
);

const HealthReportSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Erp_residents' },
    reportType: { type: String, enum: REPORT_TYPE_VALUES, required: true, index: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    averages: { type: AveragesSubSchema, default: () => ({}) },
    summary: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'health_reports' },
);
HealthReportSchema.index({ tenantId: 1, residentId: 1, reportType: 1, periodStart: -1 });

export type DailyHealthStatusDoc = InferSchemaType<typeof DailyHealthStatusSchema> & { _id: Types.ObjectId };
export type VitalReadingDoc = InferSchemaType<typeof VitalReadingSchema> & { _id: Types.ObjectId };
export type HealthReportDoc = InferSchemaType<typeof HealthReportSchema> & { _id: Types.ObjectId };

export const DailyHealthStatusModel = model<DailyHealthStatusDoc & Document>('DailyHealthStatus', DailyHealthStatusSchema) as Model<DailyHealthStatusDoc & Document>;
export const VitalReadingModel = model<VitalReadingDoc & Document>('VitalReading', VitalReadingSchema) as Model<VitalReadingDoc & Document>;
export const HealthReportModel = model<HealthReportDoc & Document>('HealthReport', HealthReportSchema) as Model<HealthReportDoc & Document>;
