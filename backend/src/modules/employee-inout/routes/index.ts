import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import InOutController from '../controller/inout.controller.js';

export const employeeInOutModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new InOutController();
  controller.register(app);
};

export default employeeInOutModule;