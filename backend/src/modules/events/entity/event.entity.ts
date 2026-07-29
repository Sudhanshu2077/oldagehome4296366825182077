import { model, Schema, type InferSchemaType, type Model, type Document, type Types } from 'mongoose';

const EventSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    titleMr: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionMr: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    eventDate: { type: Date, required: true, index: true },
    isPublic: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, collection: 'events' },
);

export type EventDoc = InferSchemaType<typeof EventSchema> & { _id: Types.ObjectId }
export const EventModel = model<EventDoc & Document>('Event', EventSchema) as Model<EventDoc & Document>;
