import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import InwardController from '../controller/inward.controller.js';

export const inwardModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new InwardController();
  controller.register(app);
};

export default inwardModule;