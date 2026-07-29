import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';
import { GOV_JURISDICTION_SUBSCHEMA } from './jurisdiction.subschema.js';

export const UserRoleSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    emailVerified: { type: Boolean, default: false },
    displayName: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    roleId: { type: String, required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    departmentCode: { type: String, default: null, index: true },
    jurisdiction: GOV_JURISDICTION_SUBSCHEMA,
    grantedPermissions: { type: [String], default: [] },
    registerWriteScopes: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    isLocked: { type: Boolean, default: false },
    lockedReason: { type: String, default: '' },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: '' },
    lastLoginDeviceId: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false },
);

UserRoleSchema.index({ tenantId: 1, roleId: 1 });

export type UserDoc = InferSchemaType<typeof UserRoleSchema> & { _id: Types.ObjectId }

export const UserModel = model<UserDoc & Document>('User', UserRoleSchema) as Model<UserDoc & Document>;
