import { NotificationModel, type NotificationDoc } from '../entity/notification.entity.js';

export interface NotificationRow {
  id: string;
  tenantId: string | null;
  channel: string;
  title: string;
  body: string;
  data: unknown;
  readAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  failReason: string;
  createdAt: Date;
}

export function toNotificationRow(doc: NotificationDoc): NotificationRow {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId ? doc.tenantId.toString() : null,
    channel: doc.channel,
    title: doc.title,
    body: doc.body,
    data: doc.data,
    readAt: doc.readAt,
    deliveredAt: doc.deliveredAt,
    failedAt: doc.failedAt,
    failReason: doc.failReason,
    createdAt: doc.createdAt,
  };
}

export class NotificationRepository {
  async create(input: {
    tenantId?: string | null | undefined;
    userId: string;
    channel: string;
    title: string;
    body: string;
    data?: Record<string, unknown> | null | undefined;
  }): Promise<NotificationRow> {
    const doc = await NotificationModel.create({
      tenantId: input.tenantId ?? null,
      userId: input.userId,
      channel: input.channel,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
      deliveredAt: input.channel === 'in-app' ? new Date() : null,
    });
    return toNotificationRow(doc.toObject() as NotificationDoc);
  }

  async findByUser(userId: string, limit: number): Promise<NotificationRow[]> {
    const docs = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((d) => toNotificationRow(d as unknown as NotificationDoc));
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const doc = await NotificationModel.findOneAndUpdate({ _id: id, userId }, { $set: { readAt: new Date() } });
    return doc !== null;
  }

  async markDelivered(id: string): Promise<void> {
    await NotificationModel.findByIdAndUpdate(id, { $set: { deliveredAt: new Date(), failedAt: null, failReason: '' } });
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await NotificationModel.findByIdAndUpdate(id, { $set: { failedAt: new Date(), failReason: reason } });
  }
}

export default NotificationRepository;
