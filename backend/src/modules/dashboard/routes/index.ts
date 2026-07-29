import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import DashboardController from '../controller/dashboard.controller.js';

export const dashboardModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new DashboardController();
  controller.register(app);
};

export default dashboardModule;
