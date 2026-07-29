import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const ModulePermissionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    roleId: { type: String, required: true, index: true },
    scope: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true, default: '*' },
    action: { type: String, required: true, enum: ['read', 'write', 'approve', 'reject', 'export', 'print', 'delete'], index: true },
    granted: { type: Boolean, default: true },
    grantedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false },
);

ModulePermissionSchema.index(
  { tenantId: 1, userId: 1, roleId: 1, scope: 1, resource: 1, action: 1 },
  { unique: true },
);

export type ModulePermissionDoc = InferSchemaType<typeof ModulePermissionSchema> & { _id: Types.ObjectId }

export const ModulePermissionModel = model<ModulePermissionDoc & Document>(
  'ModulePermission',
  ModulePermissionSchema,
) as Model<ModulePermissionDoc & Document>;
