import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import SchemaRegisterController from '../controller/schema-register.controller.js';

export const schemaRegisterModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new SchemaRegisterController();
  controller.register(app);
};

export default schemaRegisterModule;
