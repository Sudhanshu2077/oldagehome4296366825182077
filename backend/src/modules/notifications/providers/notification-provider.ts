export interface NotificationPayload {
  tenantId?: string | null | undefined;
  userId: string;
  channel: 'in-app' | 'email' | 'sms' | 'whatsapp' | 'push';
  title: string;
  body?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

export interface DeliveryResult {
  success: boolean;
  error?: string;
  externalId?: string;
}

export interface NotificationProvider {
  readonly name: string;
  send(payload: NotificationPayload): Promise<DeliveryResult>;
}
