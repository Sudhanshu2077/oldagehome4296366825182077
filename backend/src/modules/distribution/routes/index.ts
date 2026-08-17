import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import DistributionController from '../controller/distribution.controller.js';

export const distributionModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new DistributionController();
  controller.register(app);
};

export default distributionModule;