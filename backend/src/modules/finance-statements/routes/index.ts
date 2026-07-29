import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import FinanceStatementsController from '../controller/finance-statements.controller.js';

export const financeStatementsModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  new FinanceStatementsController().register(app);
};

export default financeStatementsModule;
