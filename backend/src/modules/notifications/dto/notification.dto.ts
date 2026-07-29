export interface NotifyInput {
  tenantId?: string | null | undefined;
  userId: string;
  channel?: 'in-app' | 'email' | 'sms' | 'whatsapp' | 'push' | undefined;
  title: string;
  body?: string | undefined;
  data?: Record<string, unknown> | undefined;
}
