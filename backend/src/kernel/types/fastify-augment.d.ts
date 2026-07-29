import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import type { NotificationRow } from '../../modules/notifications/repository/notification.repository.js';
import type {
  SessionUser,
  SessionUserStore,
} from './session.js';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
    sessionUserStoreRef: { current: SessionUserStore };
    setSessionUserStore(store: SessionUserStore): void;

    authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    requirePermission(
      scope: string,
      action: string,
      resource?: string,
    ): (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

    requireTenantScope(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireCrossTenantRead(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireTenantRead(req: FastifyRequest, reply: FastifyReply): Promise<void>;

    auditHook(req: FastifyRequest, action: string, entity: string, entityId?: string): Promise<void>;
    recordActivity(req: FastifyRequest, event: string, meta?: Record<string, unknown>): Promise<void>;
    notify(input: {
      tenantId?: string | null | undefined;
      userId: string;
      channel?: 'in-app' | 'email' | 'sms' | 'whatsapp' | 'push' | undefined;
      title: string;
      body?: string | undefined;
      data?: Record<string, unknown> | undefined;
    }): Promise<NotificationRow>;
  }

  interface FastifyRequest {
    sessionUser: SessionUser | null;
    snapshot?: { before?: unknown; after?: unknown } | undefined;
  }
}

export {};
