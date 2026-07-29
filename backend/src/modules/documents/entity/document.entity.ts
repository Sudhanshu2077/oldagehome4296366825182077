import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const DocumentEntitySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: 'general', index: true },
    tags: { type: [String], default: [] },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    storageKey: { type: String, required: true },
    version: { type: Number, default: 1 },
    versions: {
      type: [{ storageKey: String, version: Number, size: Number, uploadedAt: Date, uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' } }],
      default: [],
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'documents' },
);

export type DocumentDoc = InferSchemaType<typeof DocumentEntitySchema> & { _id: Types.ObjectId }
export const DocumentModel = model<DocumentDoc & Document>('DocumentEntity', DocumentEntitySchema) as Model<DocumentDoc & Document>;
