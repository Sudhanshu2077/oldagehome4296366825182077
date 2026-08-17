import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import CashbookController from '../controller/cashbook.controller.js';

export const cashbookModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new CashbookController();
  controller.register(app);
};

export default cashbookModule;