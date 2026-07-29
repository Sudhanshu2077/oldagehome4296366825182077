import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import ActivityLogController from '../controller/activity-log.controller.js';

export const activityLogModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new ActivityLogController();
  controller.register(app);
};

export default activityLogModule;
