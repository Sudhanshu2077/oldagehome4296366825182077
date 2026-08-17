import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import MedicalController from '../controller/medical.controller.js';

export const medicalModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new MedicalController();
  controller.register(app);
};

export default medicalModule;
