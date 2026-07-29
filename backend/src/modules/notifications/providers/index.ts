import { getLogger } from '../../../config/logger.js';
import type { NotificationProvider, NotificationPayload, DeliveryResult } from './notification-provider.js';

export class InAppProvider implements NotificationProvider {
  readonly name = 'in-app';
  async send(_payload: NotificationPayload): Promise<DeliveryResult> {
    return { success: true };
  }
}

export class EmailProvider implements NotificationProvider {
  readonly name = 'email';
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    getLogger().info({ channel: this.name, userId: payload.userId, title: payload.title }, 'email notification queued (provider not configured)');
    return { success: true };
  }
}

export class SmsProvider implements NotificationProvider {
  readonly name = 'sms';
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    getLogger().info({ channel: this.name, userId: payload.userId, title: payload.title }, 'sms notification queued (provider not configured)');
    return { success: true };
  }
}

export class WhatsAppProvider implements NotificationProvider {
  readonly name = 'whatsapp';
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    getLogger().info({ channel: this.name, userId: payload.userId, title: payload.title }, 'whatsapp notification queued (provider not configured)');
    return { success: true };
  }
}

export class PushProvider implements NotificationProvider {
  readonly name = 'push';
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    getLogger().info(
      { channel: this.name, userId: payload.userId, title: payload.title, topic: `user-${payload.userId}` },
      'push notification queued via FCM topic (provider not configured)',
    );
    return { success: true };
  }
}
