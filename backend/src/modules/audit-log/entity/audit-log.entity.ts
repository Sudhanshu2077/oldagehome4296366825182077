import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const AuditLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    role: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, default: '' },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    device: { type: String, default: '' },
    browser: { type: String, default: '' },
    ip: { type: String, default: '' },
    geo: { type: Schema.Types.Mixed, default: null },
    requestId: { type: String, default: '' },
    timestamp: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false, versionKey: false, collection: 'audit_logs' },
);

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: Types.ObjectId }

export const AuditLogModel = model<AuditLogDoc & Document>('AuditLog', AuditLogSchema) as Model<
  AuditLogDoc & Document
>;
