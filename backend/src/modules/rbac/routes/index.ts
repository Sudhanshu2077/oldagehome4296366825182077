import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import RbacController from '../controller/rbac.controller.js';

export const rbacModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new RbacController();
  controller.register(app);
};

export default rbacModule;
