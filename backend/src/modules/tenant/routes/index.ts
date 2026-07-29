import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import TenantController from '../controller/tenant.controller.js';

export const tenantModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new TenantController();
  controller.register(app);
};

export default tenantModule;
