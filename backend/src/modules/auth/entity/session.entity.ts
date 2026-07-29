import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    firebaseUid: { type: String, required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    deviceId: { type: String, default: '', index: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    refreshTokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: '' },
    rememberDevice: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, collection: 'sessions' },
);

export type SessionDoc = InferSchemaType<typeof SessionSchema> & { _id: Types.ObjectId }

export const SessionModel = model<SessionDoc & Document>('Session', SessionSchema) as Model<SessionDoc & Document>;
