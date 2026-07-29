import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import ReportController from '../controller/report.controller.js';

export const reportModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  new ReportController().register(app);
};

export default reportModule;
