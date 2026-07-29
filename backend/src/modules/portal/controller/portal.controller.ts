import type { FastifyInstance, FastifyRequest } from 'fastify';
import PortalService from '../service/portal.service.js';
import { ok, okPaginated } from '../../../kernel/response/api-response.js';

export class PortalController {
  constructor(private readonly service: PortalService = new PortalService()) {}

  register(app: FastifyInstance): void {
    app.get('/portal/institutions', async (req, reply) => {
      const result = await this.service.listPublicInstitutions(req.query as Record<string, unknown>);
      reply.send(okPaginated(result));
    });

    app.get<{ Params: { id: string } }>('/portal/institutions/:id', async (req, reply) => {
      reply.send(ok(await this.service.getPublicInstitution(req.params.id)));
    });

    app.get('/portal/search', async (req, reply) => {
      reply.send(ok(await this.service.searchInstitutions(req.query as Record<string, unknown>)));
    });

    app.get<{ Params: { id: string } }>('/portal/institutions/:id/beds', async (req, reply) => {
      reply.send(ok(await this.service.getInstitutionBeds(req.params.id)));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/admission-request', async (req, reply) => {
      const row = await this.service.createPortalRequest(app, req, 'admission-request', req.body);
      reply.code(201).send(ok(row));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/complaints', async (req, reply) => {
      const row = await this.service.createPortalRequest(app, req, 'complaint', req.body);
      reply.code(201).send(ok(row));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/feedback', async (req, reply) => {
      const row = await this.service.createPortalRequest(app, req, 'feedback', req.body);
      reply.code(201).send(ok(row));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/volunteer-register', async (req, reply) => {
      const result = await this.service.volunteerRegister(app, req, req.body);
      reply.code(201).send(ok(result));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/donations/pledge', async (req, reply) => {
      const row = await this.service.createAnonymousPledge(app, req, req.body);
      reply.code(201).send(ok(row));
    });

    app.get('/portal/family/residents', { preHandler: [app.authenticate] }, async (req, reply) => {
      reply.send(ok(await this.service.listFamilyResidents(req)));
    });

    app.get<{ Params: { id: string } }>('/portal/family/residents/:id/health', { preHandler: [app.authenticate] }, async (req, reply) => {
      reply.send(ok(await this.service.getFamilyResidentHealth(req, req.params.id)));
    });

    app.get<{ Params: { id: string } }>('/portal/family/residents/:id/medicines', { preHandler: [app.authenticate] }, async (req, reply) => {
      reply.send(ok(await this.service.getFamilyResidentMedicines(req, req.params.id)));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/family/visitor-booking', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
      const row = await this.service.createVisitorBooking(app, req, req.body);
      reply.code(201).send(ok(row));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/family/video-call-booking', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
      const row = await this.service.createVideoCallBooking(app, req, req.body);
      reply.code(201).send(ok(row));
    });

    app.get('/portal/family/donations', { preHandler: [app.authenticate] }, async (req, reply) => {
      reply.send(ok(await this.service.listFamilyDonations(req)));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/family/donations', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
      const row = await this.service.createFamilyDonation(app, req, req.body);
      reply.code(201).send(ok(row));
    });

    app.get('/portal/donor/history', { preHandler: [app.authenticate] }, async (req, reply) => {
      reply.send(ok(await this.service.listDonorHistory(req)));
    });

    app.get<{ Params: { id: string } }>('/portal/donor/receipts/:id/download', { preHandler: [app.authenticate] }, async (req, reply) => {
      reply.send(ok(await this.service.getDonorReceipt(req, req.params.id)));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/donor/sponsor-resident', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
      const row = await this.service.createDonorSponsorResident(app, req, req.body);
      reply.code(201).send(ok(row));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/donor/sponsor-meals', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
      const row = await this.service.createDonorSponsorMeals(app, req, req.body);
      reply.code(201).send(ok(row));
    });

    app.get('/portal/volunteer/profile', { preHandler: [app.authenticate] }, async (req, reply) => {
      reply.send(ok(await this.service.getVolunteerProfile(req)));
    });

    app.get('/portal/volunteer/activities', { preHandler: [app.authenticate] }, async (req, reply) => {
      reply.send(ok(await this.service.listVolunteerActivities(req)));
    });

    app.post<{ Body: Record<string, unknown> }>('/portal/volunteer/log-activity', { preHandler: [app.authenticate, app.requireTenantScope] }, async (req, reply) => {
      const row = await this.service.createVolunteerActivityLog(app, req, req.body);
      reply.code(201).send(ok(row));
    });
  }
}

export default PortalController;
