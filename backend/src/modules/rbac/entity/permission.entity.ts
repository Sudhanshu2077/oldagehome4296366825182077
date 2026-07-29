import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const PermissionSchema = new Schema(
  {
    scope: { type: String, required: true, index: true },
    action: { type: String, required: true, enum: ['read', 'write', 'approve', 'reject', 'export', 'print', 'delete'], index: true },
    resource: { type: String, required: true, default: '*' },
    label: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
);

PermissionSchema.index({ scope: 1, action: 1, resource: 1 }, { unique: true });

export type PermissionDoc = InferSchemaType<typeof PermissionSchema> & { _id: Types.ObjectId }

export const PermissionModel = model<PermissionDoc & Document>('Permission', PermissionSchema) as Model<
  PermissionDoc & Document
>;
