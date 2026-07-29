import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const NotificationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: ['in-app', 'email', 'sms', 'whatsapp', 'push'], default: 'in-app' },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    data: { type: Schema.Types.Mixed, default: null },
    readAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failReason: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'notifications' },
);

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & { _id: Types.ObjectId }
export const NotificationModel = model<NotificationDoc & Document>('Notification', NotificationSchema) as Model<NotificationDoc & Document>;

const NotificationTemplateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    channel: { type: String, required: true },
    subject: { type: String, default: '' },
    bodyTemplate: { type: String, required: true },
    bodyTemplateMr: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false, collection: 'notification_templates' },
);

export type NotificationTemplateDoc = InferSchemaType<typeof NotificationTemplateSchema> & { _id: Types.ObjectId }
export const NotificationTemplateModel = model<NotificationTemplateDoc & Document>('NotificationTemplate', NotificationTemplateSchema) as Model<NotificationTemplateDoc & Document>;
