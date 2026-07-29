import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import AuditLogService from '../modules/audit-log/service/audit-log.service.js';
import ActivityLogService from '../modules/activity-log/service/activity-log.service.js';

const auditService = new AuditLogService();
const activityService = new ActivityLogService();

async function auditHookPlugin(app: FastifyInstance): Promise<void> {
  app.decorate('auditHook', async (req: FastifyRequest, action: string, entity: string, entityId?: string): Promise<void> => {
    try {
      await auditService.write(req, { action, entity, entityId });
    } catch {
      // never let audit failure break the primary flow
    }
  });

  app.decorate('recordActivity', async (req: FastifyRequest, event: string, meta?: Record<string, unknown>): Promise<void> => {
    try {
      await activityService.write(req, { event, meta });
    } catch {
      // activity log must never block the primary flow
    }
  });
}

const plugin: FastifyPluginAsync = auditHookPlugin;

export default fp(plugin, { name: 'audit-hook', fastify: '4.x' });
