import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import GovernanceService from '../service/governance.service.js';
import { ok } from '../../../kernel/response/api-response.js';

export class GovernanceController {
  constructor(private readonly service: GovernanceService = new GovernanceService()) {}

  register(app: FastifyInstance): void {
    const govRead = [app.authenticate, app.requireCrossTenantRead];
    const auth = [app.authenticate];
    const tenantWrite = [app.authenticate, app.requireTenantScope];

    app.get('/gov/dashboard', { preHandler: govRead }, this.dashboard.bind(this));
    app.get('/gov/institutions', { preHandler: govRead }, this.listInstitutions.bind(this));
    app.get('/gov/institutions/:id', { preHandler: govRead }, this.getInstitution.bind(this));
    app.get('/gov/institutions/:id/live', { preHandler: govRead }, this.liveInstitution.bind(this));
    app.get('/gov/state-dashboard', { preHandler: govRead }, this.stateDashboard.bind(this));
    app.get('/gov/regional-dashboard', { preHandler: govRead }, this.regionalDashboard.bind(this));
    app.get('/gov/district-dashboard', { preHandler: govRead }, this.districtDashboard.bind(this));
    app.get('/gov/taluka-dashboard', { preHandler: govRead }, this.talukaDashboard.bind(this));
    app.get('/gov/map', { preHandler: govRead }, this.map.bind(this));
    app.get('/gov/analytics/:type', { preHandler: govRead }, this.analytics.bind(this));

    app.post('/gov/monthly-close', { preHandler: tenantWrite }, this.monthlyClose.bind(this));
    app.get('/gov/locks', { preHandler: auth }, this.listLocks.bind(this));
    app.post('/gov/unlock-requests', { preHandler: tenantWrite }, this.createUnlockRequest.bind(this));
    app.get('/gov/unlock-requests', { preHandler: auth }, this.listUnlockRequests.bind(this));
    app.post('/gov/unlock-requests/:id/decide', { preHandler: govRead }, this.decideUnlockRequest.bind(this));
    app.get('/gov/approvals', { preHandler: auth }, this.listApprovals.bind(this));
    app.post('/gov/approvals', { preHandler: tenantWrite }, this.createApproval.bind(this));
    app.post('/gov/approvals/:id/decide', { preHandler: govRead }, this.decideApproval.bind(this));
    app.get('/gov/inspections', { preHandler: auth }, this.listInspections.bind(this));
    app.post('/gov/inspections', { preHandler: govRead }, this.createInspection.bind(this));
    app.get('/gov/inspections/:id', { preHandler: auth }, this.getInspection.bind(this));
    app.get('/gov/inspections/:id/notice', { preHandler: govRead }, this.getInspectionNotice.bind(this));
    app.post('/gov/inspections/:id/complete', { preHandler: govRead }, this.completeInspection.bind(this));

    app.get('/gov/compliance', { preHandler: govRead }, this.listCompliance.bind(this));
    app.post('/gov/compliance', { preHandler: govRead }, this.upsertCompliance.bind(this));
    app.get('/gov/audits', { preHandler: govRead }, this.listGovAudits.bind(this));
    app.post('/gov/audits', { preHandler: govRead }, this.createGovAudit.bind(this));
    app.get('/gov/grants', { preHandler: govRead }, this.listGovGrants.bind(this));
    app.post('/gov/grants', { preHandler: govRead }, this.createGovGrant.bind(this));
    app.get('/gov/emergency-control', { preHandler: govRead }, this.listEmergencyControls.bind(this));
    app.post('/gov/emergency-control', { preHandler: govRead }, this.createEmergencyControl.bind(this));
    app.post('/gov/circulars', { preHandler: govRead }, this.createCircular.bind(this));
  }

  private jurisdictionScope(req: FastifyRequest): Record<string, unknown> {
    const su = req.sessionUser!;
    return {
      level: su.jurisdiction?.level ?? 'all',
      stateId: su.jurisdiction?.stateId ?? null,
      regionId: su.jurisdiction?.regionId ?? null,
      districtId: su.jurisdiction?.districtId ?? null,
      talukaId: su.jurisdiction?.talukaId ?? null,
    };
  }

  async dashboard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = await this.service.getDashboard(req);
    reply.send(ok({ ...data, scope: this.jurisdictionScope(req) }));
  }

  async listInstitutions(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listInstitutions(req)));
  }

  async getInstitution(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    reply.send(ok(await this.service.getInstitution(req, id)));
  }

  async liveInstitution(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    reply.send(ok(await this.service.getLiveMonitoring(req, id)));
  }

  async stateDashboard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.stateDashboard(req)));
  }

  async regionalDashboard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.regionalDashboard(req)));
  }

  async districtDashboard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.districtDashboard(req)));
  }

  async talukaDashboard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.talukaDashboard(req)));
  }

  async monthlyClose(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.monthlyClose(req, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'monthly-close', 'monthly-lock', String(result.id));
    reply.send(ok(result));
  }

  async listLocks(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listLocks(req)));
  }

  async createUnlockRequest(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.createUnlockRequest(req, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'create', 'unlock-request', String(result.id));
    reply.code(201).send(ok(result));
  }

  async listUnlockRequests(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listUnlockRequests(req)));
  }

  async decideUnlockRequest(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    const result = await this.service.decideUnlockRequest(req, id, req.body as Record<string, unknown>);
    await req.server.auditHook(req, `unlock-${result.status}`, 'unlock-request', id);
    reply.send(ok(result));
  }

  async listApprovals(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listApprovals(req)));
  }

  async createApproval(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.createApproval(req, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'create', 'approval', String(result.id));
    reply.code(201).send(ok(result));
  }

  async decideApproval(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const result = await this.service.decideApproval(req, id, body);
    await req.server.auditHook(req, `approval-${body.decision}`, 'approval', id);
    reply.send(ok(result));
  }

  async listInspections(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listInspections(req)));
  }

  async createInspection(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.createInspection(req, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'create', 'inspection', String(result.id));
    reply.code(201).send(ok(result));
  }

  async getInspection(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    reply.send(ok(await this.service.getInspection(req, id)));
  }

  async getInspectionNotice(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    reply.send(ok(await this.service.getInspectionNotice(req, id)));
  }

  async completeInspection(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = req.params as { id: string };
    const result = await this.service.completeInspection(req, id, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'complete', 'inspection', id);
    reply.send(ok(result));
  }

  async listCompliance(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listCompliance(req)));
  }

  async upsertCompliance(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.upsertCompliance(req, req.body as Record<string, unknown>);
    const action = (req.body as Record<string, unknown>).id ? 'update' : 'create';
    await req.server.auditHook(req, action, 'compliance-item', String(result.id));
    reply.code(201).send(ok(result));
  }

  async listGovAudits(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listGovAudits(req)));
  }

  async createGovAudit(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.createGovAudit(req, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'create', 'gov-audit-finding', String(result.id));
    reply.code(201).send(ok(result));
  }

  async listGovGrants(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.listGovGrants(req)));
  }

  async createGovGrant(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.createGovGrant(req, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'create', 'gov-grant', String(result.id));
    reply.code(201).send(ok(result));
  }

  async listEmergencyControls(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = req.query as Record<string, string | undefined>;
    reply.send(ok(await this.service.listEmergencyControls(req, query.active === 'true')));
  }

  async createEmergencyControl(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.createEmergencyControl(req, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'create', 'emergency-control', String(result.id));
    reply.code(201).send(ok(result));
  }

  async createCircular(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.service.createCircular(req, req.body as Record<string, unknown>);
    await req.server.auditHook(req, 'create', 'gov-circular', String(result.id));
    reply.code(201).send(ok(result));
  }

  async map(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(ok(await this.service.getMapData(req)));
  }

  async analytics(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { type } = req.params as { type: string };
    const query = req.query as Record<string, string | undefined>;
    const months = query.months ? Number(query.months) : undefined;
    reply.send(ok(await this.service.getAnalytics(req, type, months)));
  }
}

export default GovernanceController;
