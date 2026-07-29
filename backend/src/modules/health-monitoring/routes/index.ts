import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import HealthMonitoringController from '../controller/health-monitoring.controller.js';

export const healthMonitoringModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  new HealthMonitoringController().register(app);
};

export default healthMonitoringModule;
