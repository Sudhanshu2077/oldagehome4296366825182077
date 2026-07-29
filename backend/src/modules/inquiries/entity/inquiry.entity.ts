import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const InquirySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'inquiries' },
);

export type InquiryDoc = InferSchemaType<typeof InquirySchema> & { _id: Types.ObjectId }
export const InquiryModel = model<InquiryDoc & Document>('Inquiry', InquirySchema) as Model<InquiryDoc & Document>;
