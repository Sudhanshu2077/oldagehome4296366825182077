import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import VisitBookController from '../controller/visit-book.controller.js';

export const visitBookModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new VisitBookController();
  controller.register(app);
};

export default visitBookModule;
