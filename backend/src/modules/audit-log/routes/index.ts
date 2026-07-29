import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import AuditLogController from '../controller/audit-log.controller.js';

export const auditLogModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new AuditLogController();
  controller.register(app);
};

export default auditLogModule;
