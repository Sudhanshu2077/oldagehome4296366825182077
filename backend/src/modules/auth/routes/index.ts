import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import AuthController from '../controller/auth.controller.js';

export const authModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  new AuthController().register(app);
};

export default authModule;
