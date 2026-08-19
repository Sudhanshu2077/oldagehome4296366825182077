import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import AttController from '../controller/resident-attendance.controller.js';

export const residentAttendanceModule: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const controller = new AttController();
  controller.register(app);
};

export default residentAttendanceModule;