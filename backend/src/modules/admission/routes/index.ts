import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import AdmissionController from '../controller/admission.controller.js';

export const admissionModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new AdmissionController();
  controller.register(app);
};

export default admissionModule;
