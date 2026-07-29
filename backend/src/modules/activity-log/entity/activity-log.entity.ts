import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const ActivityLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    event: { type: String, required: true, index: true },
    meta: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
    deviceId: { type: String, default: '' },
    requestId: { type: String, default: '' },
    timestamp: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false, versionKey: false, collection: 'activity_logs' },
);

export type ActivityLogDoc = InferSchemaType<typeof ActivityLogSchema> & { _id: Types.ObjectId }

export const ActivityLogModel = model<ActivityLogDoc & Document>('ActivityLog', ActivityLogSchema) as Model<
  ActivityLogDoc & Document
>;
