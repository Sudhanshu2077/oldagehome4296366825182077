import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import AIController from '../controller/ai.controller.js';

export const aiModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  new AIController().register(app);
};

export default aiModule;
