import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const RolePermissionSchema = new Schema(
  {
    roleId: { type: String, required: true, index: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true, index: true },
    scope: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true, default: '*' },
  },
  { timestamps: true, versionKey: false },
);

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
RolePermissionSchema.index({ roleId: 1, scope: 1, action: 1, resource: 1 });

export type RolePermissionDoc = InferSchemaType<typeof RolePermissionSchema> & { _id: Types.ObjectId }

export const RolePermissionModel = model<RolePermissionDoc & Document>(
  'RolePermission',
  RolePermissionSchema,
) as Model<RolePermissionDoc & Document>;
