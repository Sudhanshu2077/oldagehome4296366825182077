import type { FastifyInstance, FastifyRequest } from 'fastify';
import HealthMonitoringService from '../service/health-monitoring.service.js';
import { ok } from '../../../kernel/response/api-response.js';

export class HealthMonitoringController {
  constructor(private readonly service: HealthMonitoringService = new HealthMonitoringService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];
    const writeGuard = [app.authenticate, app.requireTenantScope];

    app.get<{ Querystring: { residentId?: string; from?: string; to?: string } }>(
      '/health-monitoring/daily-status',
      { preHandler: readGuard },
      async (req, reply) => {
        reply.send(ok(await this.service.listDailyStatus(req, req.query.residentId, req.query.from, req.query.to)));
      },
    );

    app.post<{ Body: Record<string, unknown> }>(
      '/health-monitoring/daily-status',
      { preHandler: writeGuard },
      async (req, reply) => {
        const result = await this.service.createDailyStatus(req, req.body ?? {});
        await app.auditHook(req, 'create', 'health-monitoring:daily-status', result.id);
        reply.code(201).send(ok(result));
      },
    );

    app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
      '/health-monitoring/daily-status/:id',
      { preHandler: writeGuard },
      async (req, reply) => {
        const item = await this.service.updateDailyStatus(req, req.params.id, req.body ?? {});
        await app.auditHook(req, 'update', 'health-monitoring:daily-status', req.params.id);
        reply.send(ok(item));
      },
    );

    app.get<{ Querystring: { residentId?: string; type?: string; from?: string; to?: string } }>(
      '/health-monitoring/vitals',
      { preHandler: readGuard },
      async (req, reply) => {
        reply.send(ok(await this.service.listVitals(req, req.query.residentId, req.query.type, req.query.from, req.query.to)));
      },
    );

    app.post<{ Body: Record<string, unknown> }>(
      '/health-monitoring/vitals',
      { preHandler: writeGuard },
      async (req, reply) => {
        const result = await this.service.createVital(req, req.body ?? {});
        await app.auditHook(req, 'create', 'health-monitoring:vitals', result.id);
        reply.code(201).send(ok(result));
      },
    );

    app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
      '/health-monitoring/vitals/:id',
      { preHandler: writeGuard },
      async (req, reply) => {
        const item = await this.service.updateVital(req, req.params.id, req.body ?? {});
        await app.auditHook(req, 'update', 'health-monitoring:vitals', req.params.id);
        reply.send(ok(item));
      },
    );

    app.get<{ Querystring: { residentId: string; type: string; months?: string } }>(
      '/health-monitoring/vitals/trends',
      { preHandler: readGuard },
      async (req, reply) => {
        const { residentId, type } = req.query;
        const months = req.query.months ?? '3';
        reply.send(ok(await this.service.getVitalTrends(req, residentId, type, months)));
      },
    );

    app.get<{ Querystring: { residentId?: string; reportType?: string } }>(
      '/health-monitoring/reports',
      { preHandler: readGuard },
      async (req, reply) => {
        reply.send(ok(await this.service.listReports(req, req.query.residentId, req.query.reportType)));
      },
    );

    app.get<{ Params: { id: string } }>(
      '/health-monitoring/reports/:id',
      { preHandler: readGuard },
      async (req, reply) => {
        reply.send(ok(await this.service.getReport(req, req.params.id)));
      },
    );

    app.post<{ Body: Record<string, unknown> }>(
      '/health-monitoring/reports/generate',
      { preHandler: writeGuard },
      async (req, reply) => {
        const result = await this.service.generateReport(req, req.body ?? {});
        await app.auditHook(req, 'generate', 'health-monitoring:report', result.id);
        reply.code(201).send(ok(result));
      },
    );
  }
}

export default HealthMonitoringController;
