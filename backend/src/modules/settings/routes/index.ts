import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import SettingsController from '../controller/settings.controller.js';

export const settingsModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new SettingsController();
  controller.register(app);
};

export default settingsModule;
