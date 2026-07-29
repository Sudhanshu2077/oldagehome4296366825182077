import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import NotificationController from '../controller/notification.controller.js';
import { notificationService } from '../service/notification.service.js';

const notificationsPlugin = async (app: FastifyInstance): Promise<void> => {
  app.decorate('notify', notificationService.notify.bind(notificationService));
  new NotificationController().register(app);
};

export const notificationsModule = fp(notificationsPlugin, { name: 'notifications', fastify: '4.x' });
export default notificationsModule;
