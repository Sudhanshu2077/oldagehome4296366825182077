import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import RegisterController from '../controller/register.controller.js';

export const registerModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  new RegisterController().register(app);
};

export default registerModule;
