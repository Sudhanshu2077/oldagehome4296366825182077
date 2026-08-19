import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import YwaController from '../controller/yearwise-admission.controller.js';

export const yearwiseAdmissionModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new YwaController();
  controller.register(app);
};

export default yearwiseAdmissionModule;