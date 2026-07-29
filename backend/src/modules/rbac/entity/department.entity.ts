import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const DepartmentSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    labelMr: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export type DepartmentDoc = InferSchemaType<typeof DepartmentSchema> & { _id: Types.ObjectId }

export const DepartmentModel = model<DepartmentDoc & Document>('Department', DepartmentSchema) as Model<
  DepartmentDoc & Document
>;
