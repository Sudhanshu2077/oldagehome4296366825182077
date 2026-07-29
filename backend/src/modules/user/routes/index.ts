import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import UserController from '../controller/user.controller.js';

export const userModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new UserController();
  controller.register(app);
};

export default userModule;
