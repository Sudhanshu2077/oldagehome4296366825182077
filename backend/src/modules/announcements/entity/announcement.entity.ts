import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const AnnouncementSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    titleMr: { type: String, default: '' },
    body: { type: String, required: true },
    bodyMr: { type: String, default: '' },
    audience: { type: String, enum: ['all', 'staff', 'external'], default: 'all' },
    publishedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'announcements' },
);

export type AnnouncementDoc = InferSchemaType<typeof AnnouncementSchema> & { _id: Types.ObjectId }
export const AnnouncementModel = model<AnnouncementDoc & Document>('Announcement', AnnouncementSchema) as Model<AnnouncementDoc & Document>;
