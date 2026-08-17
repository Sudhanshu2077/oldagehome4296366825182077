import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

import { authModule } from './auth/index.js';
import { rbacModule } from './rbac/index.js';
import { userModule } from './user/index.js';
import { tenantModule } from './tenant/index.js';
import { masterDataModule } from './master-data/routes/index.js';
import { settingsModule } from './settings/index.js';
import { documentsModule } from './documents/routes/index.js';
import { notificationsModule } from './notifications/index.js';
import { auditLogModule } from './audit-log/index.js';
import { activityLogModule } from './activity-log/index.js';
import { dashboardModule } from './dashboard/index.js';
import { registerModule } from './registers/index.js';
import { admissionModule } from './admission/index.js';
import { visitBookModule } from './visit-book/index.js';
import { inwardModule } from './inward/index.js';
import { employeeInOutModule } from './employee-inout/index.js';
import { distributionModule } from './distribution/index.js';
import { schemaRegisterModule } from './schema-register/index.js';
import { medicalModule } from './medical/index.js';
import { cashbookModule } from './cashbook/index.js';
import { inquiriesModule } from './inquiries/routes/index.js';
import { announcementsModule } from './announcements/routes/index.js';
import { eventsModule } from './events/routes/index.js';
import { erpModule } from './erp/index.js';
import { governanceModule } from './governance/routes/index.js';
import { aiModule } from './ai/index.js';
import { portalModule } from './portal/routes/index.js';
import { automationModule } from './automation/routes/index.js';
import { reportModule } from './reports/index.js';
import { healthMonitoringModule } from './health-monitoring/index.js';
import { financeStatementsModule } from './finance-statements/routes/index.js';

const modules: FastifyPluginAsync[] = [
  authModule,
  rbacModule,
  userModule,
  tenantModule,
  masterDataModule,
  settingsModule,
  documentsModule,
  notificationsModule,
  auditLogModule,
  activityLogModule,
  dashboardModule,
  registerModule,
  admissionModule,
  visitBookModule,
  inwardModule,
  employeeInOutModule,
  distributionModule,
  schemaRegisterModule,
  medicalModule,
  cashbookModule,
  inquiriesModule,
  announcementsModule,
  eventsModule,
  erpModule,
  governanceModule,
  aiModule,
  portalModule,
  automationModule,
  reportModule,
  healthMonitoringModule,
  financeStatementsModule,
];

async function registerModules(app: FastifyInstance): Promise<void> {
  for (const module of modules) {
    await app.register(module);
  }
}

export default registerModules;
