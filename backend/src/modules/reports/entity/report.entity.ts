import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const ReportConfigSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    schedule: { type: String, default: '' },
    recipients: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'report_configs' },
);
ReportConfigSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export type ReportConfigDoc = InferSchemaType<typeof ReportConfigSchema> & { _id: Types.ObjectId };

export const ReportConfigModel = model<ReportConfigDoc & Document>('ReportConfig', ReportConfigSchema) as Model<
  ReportConfigDoc & Document
>;
