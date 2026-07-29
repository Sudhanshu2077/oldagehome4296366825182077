import { getLogger } from '../../../config/logger.js';
import { NotificationRepository, type NotificationRow } from '../repository/notification.repository.js';
import { InAppProvider, EmailProvider, SmsProvider, WhatsAppProvider, PushProvider } from '../providers/index.js';
import type { NotificationProvider, NotificationPayload, DeliveryResult } from '../providers/notification-provider.js';
import type { NotifyInput } from '../dto/notification.dto.js';

interface QueueItem {
  id: string;
  payload: NotificationPayload;
  attempts: number;
  nextAt: number;
}

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 30000;

export class NotificationService {
  private readonly repo = new NotificationRepository();
  private readonly providers: Map<string, NotificationProvider>;
  private readonly queue: QueueItem[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.providers = new Map<string, NotificationProvider>([
      ['in-app', new InAppProvider()],
      ['email', new EmailProvider()],
      ['sms', new SmsProvider()],
      ['whatsapp', new WhatsAppProvider()],
      ['push', new PushProvider()],
    ]);
    this.startProcessor();
  }

  async notify(input: NotifyInput): Promise<NotificationRow> {
    const channel = input.channel ?? 'in-app';
    const row = await this.repo.create({
      tenantId: input.tenantId,
      userId: input.userId,
      channel,
      title: input.title,
      body: input.body ?? '',
      data: input.data ?? null,
    });
    if (channel !== 'in-app') {
      this.enqueue(row.id, {
        tenantId: input.tenantId ?? null,
        userId: input.userId,
        channel,
        title: input.title,
        body: input.body ?? '',
        data: input.data ?? {},
      });
    }
    return row;
  }

  async send(input: NotifyInput): Promise<NotificationRow> {
    return this.notify(input);
  }

  async list(userId: string): Promise<NotificationRow[]> {
    return this.repo.findByUser(userId, 50);
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    return this.repo.markRead(id, userId);
  }

  private enqueue(id: string, payload: NotificationPayload): void {
    this.queue.push({ id, payload, attempts: 0, nextAt: Date.now() });
    void this.processNext();
  }

  private async processNext(): Promise<void> {
    const now = Date.now();
    const due = this.queue.filter((i) => i.nextAt <= now);
    for (const item of due) {
      const idx = this.queue.indexOf(item);
      if (idx > -1) this.queue.splice(idx, 1);
      await this.deliver(item);
    }
  }

  private async deliver(item: QueueItem): Promise<void> {
    const provider = this.providers.get(item.payload.channel);
    if (!provider) {
      await this.repo.markFailed(item.id, `no provider for ${item.payload.channel}`);
      return;
    }
    let result: DeliveryResult;
    try {
      result = await provider.send(item.payload);
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : 'provider error' };
    }
    if (result.success) {
      await this.repo.markDelivered(item.id);
      return;
    }
    if (item.attempts + 1 >= MAX_ATTEMPTS) {
      await this.repo.markFailed(item.id, result.error ?? 'max attempts reached');
      return;
    }
    getLogger().warn({ notificationId: item.id, channel: item.payload.channel, attempt: item.attempts + 1 }, 'notification delivery failed, will retry');
    this.queue.push({
      ...item,
      attempts: item.attempts + 1,
      nextAt: Date.now() + RETRY_BACKOFF_MS * (item.attempts + 1),
    });
  }

  private startProcessor(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.processNext();
    }, 15000);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
