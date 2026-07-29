import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const AIJobSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    kind: { type: String, required: true, index: true },
    prompt: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', index: true },
    result: { type: Schema.Types.Mixed, default: null },
    error: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'ai_jobs' },
);

export type AIJobDoc = InferSchemaType<typeof AIJobSchema> & { _id: Types.ObjectId };
export const AIJobModel = model<AIJobDoc & Document>('AIJob', AIJobSchema) as Model<AIJobDoc & Document>;
