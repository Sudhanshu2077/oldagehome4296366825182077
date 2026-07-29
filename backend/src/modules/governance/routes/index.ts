import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import GovernanceController from '../controller/governance.controller.js';

export const governanceModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new GovernanceController();
  controller.register(app);
};

export default governanceModule;
