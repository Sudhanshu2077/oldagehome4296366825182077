import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import PortalController from '../controller/portal.controller.js';

export const portalModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  new PortalController().register(app);
};

export default portalModule;
