import { Schema, model, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const RoleSchema = new Schema(
  {
    roleId: { type: String, required: true, unique: true, index: true },
    tier: { type: String, enum: ['government', 'institution', 'external'], required: true, index: true },
    label: { type: String, required: true },
    labelMr: { type: String, default: '' },
    description: { type: String, default: '' },
    level: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    system: { type: Boolean, default: false },
    parentRoleId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

export type RoleDoc = InferSchemaType<typeof RoleSchema> & { _id: Types.ObjectId }

export const RoleModel = model<RoleDoc & Document>('Role', RoleSchema) as Model<RoleDoc & Document>;
