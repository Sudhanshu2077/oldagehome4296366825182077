import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { model as getModel } from 'mongoose';
import { getLogger } from '../../../config/logger.js';
import { notificationService } from '../../notifications/index.js';

interface AutomationJob {
  name: string;
  intervalMinutes: number;
  run: () => Promise<void>;
}

async function scanExpiringMedicines(): Promise<void> {
  const logger = getLogger();
  const Stock = getModel('Erp_pharmacy_stock');
  const soon = new Date(Date.now() + 30 * 86400000);
  const expiring = await Stock.find({ expiryDate: { $lte: soon }, deletedAt: null }).limit(200).lean();
  const byTenant = new Map<string, number>();
  for (const doc of expiring) {
    const t = String(doc.tenantId);
    byTenant.set(t, (byTenant.get(t) ?? 0) + 1);
  }
  for (const [tenantId, count] of byTenant) {
    const users = await getModel('User').find({ tenantId, roleId: { $in: ['institution-head', 'assistant-manager'] }, isActive: true }).select('_id').lean();
    for (const u of users) {
      await notificationService.notify({
        tenantId,
        userId: String(u._id),
        title: `Medicine expiry alert`,
        body: `${count} medicine batch(es) expiring within 30 days`,
        data: { kind: 'medicine-expiry', count },
      });
    }
  }
  logger.info({ tenants: byTenant.size }, 'automation: medicine expiry scan complete');
}

async function scanExpiringLicenses(): Promise<void> {
  const logger = getLogger();
  const Licenses = getModel('Erp_licenses');
  const soon = new Date(Date.now() + 60 * 86400000);
  const expiring = await Licenses.find({ expiryDate: { $lte: soon }, status: { $in: ['active', 'expiring-soon'] }, deletedAt: null }).limit(200).lean();
  for (const doc of expiring) {
    await Licenses.findByIdAndUpdate(doc._id, { $set: { status: 'expiring-soon' } });
  }
  const byTenant = new Map<string, number>();
  for (const doc of expiring) {
    const t = String(doc.tenantId);
    byTenant.set(t, (byTenant.get(t) ?? 0) + 1);
  }
  for (const [tenantId, count] of byTenant) {
    const users = await getModel('User').find({ tenantId, roleId: { $in: ['institution-head', 'assistant-manager'] }, isActive: true }).select('_id').lean();
    for (const u of users) {
      await notificationService.notify({
        tenantId,
        userId: String(u._id),
        title: 'License renewal reminder',
        body: `${count} license(s) expiring within 60 days`,
        data: { kind: 'license-expiry', count },
      });
    }
  }
  logger.info({ tenants: byTenant.size }, 'automation: license expiry scan complete');
}

async function scanLowStock(): Promise<void> {
  const logger = getLogger();
  const Items = getModel('Erp_inventory_items');
  const low = await Items.find({ $expr: { $lte: ['$currentStock', '$reorderLevel'] }, deletedAt: null }).limit(200).lean();
  const byTenant = new Map<string, number>();
  for (const doc of low) {
    const t = String(doc.tenantId);
    byTenant.set(t, (byTenant.get(t) ?? 0) + 1);
  }
  for (const [tenantId, count] of byTenant) {
    const users = await getModel('User').find({ tenantId, roleId: { $in: ['institution-head', 'assistant-manager'] }, isActive: true }).select('_id').lean();
    for (const u of users) {
      await notificationService.notify({
        tenantId,
        userId: String(u._id),
        title: 'Low stock alert',
        body: `${count} inventory item(s) at or below reorder level`,
        data: { kind: 'low-stock', count },
      });
    }
  }
  logger.info({ tenants: byTenant.size }, 'automation: low stock scan complete');
}

const JOBS: AutomationJob[] = [
  { name: 'medicine-expiry-scan', intervalMinutes: 360, run: scanExpiringMedicines },
  { name: 'license-expiry-scan', intervalMinutes: 720, run: scanExpiringLicenses },
  { name: 'low-stock-scan', intervalMinutes: 360, run: scanLowStock },
];

async function automationPlugin(app: FastifyInstance): Promise<void> {
  const logger = getLogger();
  const timers: NodeJS.Timeout[] = [];

  for (const job of JOBS) {
    const timer = setInterval(() => {
      job.run().catch((err) => logger.error({ err, job: job.name }, 'automation job failed'));
    }, job.intervalMinutes * 60 * 1000);
    timer.unref();
    timers.push(timer);
    logger.info({ job: job.name, intervalMinutes: job.intervalMinutes }, 'automation job scheduled');
  }

  app.addHook('onClose', async () => {
    for (const t of timers) clearInterval(t);
  });
}

export const automationModule = fp(automationPlugin, { name: 'automation', fastify: '4.x' });
export default automationModule;
