import type { FastifyRequest } from 'fastify';
import { Types } from 'mongoose';
import GovernanceRepository, {
  type UpsertComplianceInput,
  type CreateGovAuditInput,
  type CreateGovGrantInput,
  type CreateEmergencyControlInput,
  type CreateCircularInput,
} from '../repository/governance.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';
import { assertTenantWriteAccess, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import type { ComplianceItemDoc, EmergencyControlDoc, GovAuditFindingDoc, GovGrantDoc, InspectionDoc } from '../entity/governance.entity.js';

const GOV_LEVEL_ORDER = ['all', 'state', 'region', 'district', 'taluka'];

function requireGov(req: FastifyRequest): void {
  if (!req.sessionUser || req.sessionUser.tier !== 'government') throw new ForbiddenError('government tier only');
}

function requireGovAtLeast(req: FastifyRequest, minLevel: string): void {
  requireGov(req);
  const level = req.sessionUser!.jurisdiction?.level ?? 'taluka';
  const minIdx = GOV_LEVEL_ORDER.indexOf(minLevel);
  const idx = GOV_LEVEL_ORDER.indexOf(level);
  if (idx === -1 || idx > minIdx) throw new ForbiddenError(`${minLevel} level access required`);
}

function requireInstitutionWriter(req: FastifyRequest): void {
  const su = req.sessionUser;
  if (!su || su.tier !== 'institution') throw new ForbiddenError('institution tier only');
  if (su.role !== 'institution-head' && su.role !== 'assistant-manager') throw new ForbiddenError('head or manager only');
}

export class GovernanceService {
  constructor(private readonly repo: GovernanceRepository = new GovernanceRepository()) {}

  private async buildTenantScopedFilter(req: FastifyRequest): Promise<Record<string, unknown>> {
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError();
    if (su.tier === 'government') {
      const ids = await this.repo.getScopedInstitutionIds(req);
      return { tenantId: { $in: ids } };
    }
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    return { tenantId: new Types.ObjectId(tenantId) };
  }

  async getDashboard(req: FastifyRequest): Promise<Record<string, unknown>> {
    requireGov(req);
    return this.repo.getDashboardMetrics(req);
  }

  async getInstitution(req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    requireGov(req);
    const doc = await this.repo.findInstitutionById(req, id);
    if (!doc) throw new NotFoundError('institution not found');
    return {
      id: doc._id.toString(),
      name: doc.name,
      nameMr: doc.nameMr,
      code: doc.code,
      type: doc.type,
      contactEmail: doc.contactEmail,
      contactPhone: doc.contactPhone,
      addressLine: doc.addressLine,
      villageId: doc.villageId ? doc.villageId.toString() : null,
      talukaId: doc.talukaId ? doc.talukaId.toString() : null,
      districtId: doc.districtId ? doc.districtId.toString() : null,
      stateId: doc.stateId ? doc.stateId.toString() : null,
      regionId: doc.regionId ? doc.regionId.toString() : null,
      capacity: doc.capacity,
      active: doc.active,
      gpsLat: doc.gpsLat ?? null,
      gpsLng: doc.gpsLng ?? null,
      registeredAt: doc.registeredAt,
    };
  }

  async getLiveMonitoring(req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    requireGov(req);
    const result = await this.repo.getLiveMonitoring(req, id);
    if (!result) throw new NotFoundError('institution not found');
    return result;
  }

  async listInstitutions(req: FastifyRequest): Promise<Record<string, unknown>[]> {
    requireGov(req);
    const docs = await this.repo.listInstitutions(req);
    return docs.map((d) => ({ ...d, id: d._id.toString() }));
  }

  async stateDashboard(req: FastifyRequest): Promise<Record<string, unknown>> {
    requireGovAtLeast(req, 'state');
    return this.repo.getJurisdictionDashboard(req, 'districtId');
  }

  async regionalDashboard(req: FastifyRequest): Promise<Record<string, unknown>> {
    requireGovAtLeast(req, 'region');
    return this.repo.getJurisdictionDashboard(req, 'districtId');
  }

  async districtDashboard(req: FastifyRequest): Promise<Record<string, unknown>> {
    requireGovAtLeast(req, 'district');
    return this.repo.getJurisdictionDashboard(req, 'talukaId');
  }

  async talukaDashboard(req: FastifyRequest): Promise<Record<string, unknown>> {
    requireGovAtLeast(req, 'taluka');
    return this.repo.getJurisdictionDashboard(req);
  }

  async monthlyClose(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireInstitutionWriter(req);
    const year = Number(body.year);
    const month = Number(body.month);
    const notes = String(body.notes ?? '');
    if (!year || !month || month < 1 || month > 12) throw new ValidationError('valid year and month required');
    const tenantId = assertTenantWriteAccess(req);
    return this.repo.monthlyClose(tenantId, req.sessionUser!.userId, year, month, notes);
  }

  async listLocks(req: FastifyRequest): Promise<Record<string, unknown>[]> {
    const filter = await this.buildTenantScopedFilter(req);
    return this.repo.listLocks(filter);
  }

  async createUnlockRequest(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireInstitutionWriter(req);
    const year = Number(body.year);
    const month = Number(body.month);
    const reason = String(body.reason ?? '');
    if (!year || !month || !reason) throw new ValidationError('year, month, reason required');
    const tenantId = assertTenantWriteAccess(req);
    return this.repo.createUnlockRequest({
      tenantId,
      year,
      month,
      reason,
      documentsUrls: String(body.documentsUrls ?? ''),
      requestedBy: req.sessionUser!.userId,
    });
  }

  async listUnlockRequests(req: FastifyRequest): Promise<Record<string, unknown>[]> {
    const filter = await this.buildTenantScopedFilter(req);
    return this.repo.listUnlockRequests(filter);
  }

  async decideUnlockRequest(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const decision = String(body.decision ?? '');
    if (!['approved', 'rejected', 'temporary-unlock'].includes(decision)) throw new ValidationError('decision must be approved|rejected|temporary-unlock');
    const doc = await this.repo.getUnlockRequestById(id);
    if (!doc) throw new NotFoundError('unlock request not found');
    const institution = await this.repo.findInstitutionById(req, doc.tenantId.toString());
    if (!institution) throw new ForbiddenError();
    const minutes = body.temporaryUnlockMinutes ? Number(body.temporaryUnlockMinutes) : undefined;
    return this.repo.decideUnlockRequest(id, decision, req.sessionUser!.userId, String(body.reviewNotes ?? ''), minutes);
  }

  async createApproval(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireInstitutionWriter(req);
    const requestType = String(body.requestType ?? '');
    const summary = String(body.summary ?? '');
    if (!requestType || !summary) throw new ValidationError('requestType and summary required');
    const tenantId = assertTenantWriteAccess(req);
    return this.repo.createApproval({
      tenantId,
      requestType,
      referenceId: String(body.referenceId ?? ''),
      summary,
      payload: (body.payload as Record<string, unknown>) ?? null,
      submittedBy: req.sessionUser!.userId,
    });
  }

  async listApprovals(req: FastifyRequest): Promise<Record<string, unknown>[]> {
    const filter = await this.buildTenantScopedFilter(req);
    return this.repo.listApprovals(filter);
  }

  async decideApproval(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const decision = String(body.decision ?? '');
    if (!['approved', 'rejected', 'changes-requested', 'escalated'].includes(decision)) throw new ValidationError('invalid decision');
    const doc = await this.repo.getApprovalById(id);
    if (!doc) throw new NotFoundError('approval not found');
    const institution = await this.repo.findInstitutionById(req, doc.tenantId.toString());
    if (!institution) throw new ForbiddenError();
    const escalateTo = decision === 'escalated' ? String(body.escalateTo ?? '') : undefined;
    if (decision === 'escalated' && !['regional', 'state'].includes(escalateTo ?? '')) {
      throw new ValidationError('escalateTo must be regional|state');
    }
    return this.repo.decideApproval(id, decision, req.sessionUser!.userId, String(body.decisionNotes ?? ''), escalateTo);
  }

  async listInspections(req: FastifyRequest): Promise<Record<string, unknown>[]> {
    const filter = await this.buildTenantScopedFilter(req);
    return this.repo.listInspections(filter);
  }

  async createInspection(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const tenantId = String(body.tenantId ?? '');
    const scheduledDate = String(body.scheduledDate ?? '');
    if (!tenantId || !scheduledDate) throw new ValidationError('tenantId and scheduledDate required');
    if (!Types.ObjectId.isValid(tenantId)) throw new ValidationError('tenantId invalid');
    const institution = await this.repo.findInstitutionById(req, tenantId);
    if (!institution) throw new NotFoundError('institution not found');
    return this.repo.createInspection({
      tenantId,
      scheduledDate,
      inspectorId: req.sessionUser!.userId,
      inspectorName: String(body.inspectorName ?? req.sessionUser!.displayName ?? ''),
    });
  }

  async getInspection(req: FastifyRequest, id: string): Promise<InspectionDoc> {
    const doc = await this.repo.getInspectionById(id);
    if (!doc) throw new NotFoundError('inspection not found');
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError();
    if (su.tier === 'institution') {
      const tenantId = resolvedTenantId(req);
      if (!tenantId || doc.tenantId.toString() !== tenantId) throw new ForbiddenError();
    } else if (su.tier === 'government') {
      const institution = await this.repo.findInstitutionById(req, doc.tenantId.toString());
      if (!institution) throw new ForbiddenError();
    }
    return doc;
  }

  async getInspectionNotice(_req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    const doc = await this.repo.getInspectionById(id);
    if (!doc) throw new NotFoundError('inspection not found');
    const institution = await this.repo.findInstitutionById(_req, doc.tenantId.toString());
    if (!institution) throw new ForbiddenError();
    return {
      noticeType: 'government-inspection',
      noticeDate: new Date().toISOString(),
      institutionId: doc.tenantId.toString(),
      inspectionId: id,
      scheduledDate: doc.scheduledDate,
      inspectorName: doc.inspectorName,
      score: doc.score ?? null,
      findings: doc.findings ?? '',
      noticeIssued: doc.noticeIssued ?? false,
      subject: `Inspection notice for institution ${doc.tenantId.toString()}`,
    };
  }

  async completeInspection(req: FastifyRequest, id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const doc = await this.repo.getInspectionById(id);
    if (!doc) throw new NotFoundError('inspection not found');
    const institution = await this.repo.findInstitutionById(req, doc.tenantId.toString());
    if (!institution) throw new ForbiddenError();
    return this.repo.completeInspection(id, body);
  }

  async listCompliance(req: FastifyRequest): Promise<ComplianceItemDoc[]> {
    requireGov(req);
    return this.repo.listComplianceItems(req);
  }

  async upsertCompliance(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const tenantId = String(body.tenantId ?? '');
    const title = String(body.title ?? '');
    const category = String(body.category ?? '');
    if (!tenantId || !title || !category) throw new ValidationError('tenantId, title and category required');
    if (!Types.ObjectId.isValid(tenantId)) throw new ValidationError('tenantId invalid');
    const institution = await this.repo.findInstitutionById(req, tenantId);
    if (!institution) throw new NotFoundError('institution not found');
    const input: UpsertComplianceInput = {
      tenantId,
      category,
      title,
      score: body.score === null || body.score === undefined ? null : Number(body.score),
      assignedTo: body.assignedTo ? String(body.assignedTo) : null,
    };
    if (body.id) input.id = String(body.id);
    if (body.description) input.description = String(body.description);
    if (body.dueDate) input.dueDate = String(body.dueDate);
    if (body.status) input.status = body.status as UpsertComplianceInput['status'];
    if (body.evidenceUrl) input.evidenceUrl = String(body.evidenceUrl);
    if (body.notes) input.notes = String(body.notes);
    const doc = await this.repo.upsertComplianceItem(input, req.sessionUser!.userId);
    return { id: doc._id.toString(), ...doc };
  }

  async listGovAudits(req: FastifyRequest): Promise<GovAuditFindingDoc[]> {
    requireGov(req);
    return this.repo.listGovAudits(req);
  }

  async createGovAudit(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const tenantId = String(body.tenantId ?? '');
    const title = String(body.title ?? '');
    if (!tenantId || !title) throw new ValidationError('tenantId and title required');
    if (!Types.ObjectId.isValid(tenantId)) throw new ValidationError('tenantId invalid');
    const institution = await this.repo.findInstitutionById(req, tenantId);
    if (!institution) throw new NotFoundError('institution not found');
    const input: CreateGovAuditInput = {
      tenantId,
      title,
    };
    if (body.auditId) input.auditId = String(body.auditId);
    if (body.source) input.source = String(body.source) as CreateGovAuditInput['source'];
    if (body.description) input.description = String(body.description);
    if (body.severity) input.severity = String(body.severity) as CreateGovAuditInput['severity'];
    if (body.dueDate) input.dueDate = String(body.dueDate);
    if (body.status) input.status = String(body.status) as CreateGovAuditInput['status'];
    if (body.correctiveAction) input.correctiveAction = String(body.correctiveAction);
    const doc = await this.repo.createGovAudit(input, req.sessionUser!.userId);
    return { id: doc._id.toString(), ...doc };
  }

  async listGovGrants(req: FastifyRequest): Promise<GovGrantDoc[]> {
    requireGov(req);
    return this.repo.listGovGrants(req);
  }

  async createGovGrant(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const tenantId = String(body.tenantId ?? '');
    const scheme = String(body.scheme ?? '');
    const sanctionedAmount = Number(body.sanctionedAmount ?? NaN);
    if (!tenantId || !scheme || Number.isNaN(sanctionedAmount)) throw new ValidationError('tenantId, scheme and sanctionedAmount required');
    if (!Types.ObjectId.isValid(tenantId)) throw new ValidationError('tenantId invalid');
    const institution = await this.repo.findInstitutionById(req, tenantId);
    if (!institution) throw new NotFoundError('institution not found');
    const input: CreateGovGrantInput = {
      tenantId,
      scheme,
      sanctionedAmount,
    };
    if (body.grantCode) input.grantCode = String(body.grantCode);
    if (body.financialYear) input.financialYear = Number(body.financialYear);
    if (body.releasedAmount !== undefined) input.releasedAmount = Number(body.releasedAmount);
    if (body.utilizedAmount !== undefined) input.utilizedAmount = Number(body.utilizedAmount);
    if (body.status) input.status = String(body.status) as CreateGovGrantInput['status'];
    if (body.releaseDate) input.releaseDate = String(body.releaseDate);
    if (body.utilizationCertificateUrl) input.utilizationCertificateUrl = String(body.utilizationCertificateUrl);
    if (body.notes) input.notes = String(body.notes);
    const doc = await this.repo.createGovGrant(input, req.sessionUser!.userId);
    return { id: doc._id.toString(), ...doc };
  }

  async listEmergencyControls(req: FastifyRequest, activeOnly: boolean): Promise<EmergencyControlDoc[]> {
    requireGov(req);
    return this.repo.listEmergencyControls(req, activeOnly);
  }

  async createEmergencyControl(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const tenantId = String(body.tenantId ?? '');
    const type = String(body.type ?? '');
    if (!tenantId || !type) throw new ValidationError('tenantId and type required');
    if (!Types.ObjectId.isValid(tenantId)) throw new ValidationError('tenantId invalid');
    const institution = await this.repo.findInstitutionById(req, tenantId);
    if (!institution) throw new NotFoundError('institution not found');
    const input: CreateEmergencyControlInput = {
      tenantId,
      type,
    };
    if (body.severity) input.severity = String(body.severity) as CreateEmergencyControlInput['severity'];
    if (body.location) input.location = String(body.location);
    if (body.description) input.description = String(body.description);
    if (body.status) input.status = String(body.status) as CreateEmergencyControlInput['status'];
    const doc = await this.repo.createEmergencyControl(input, req.sessionUser!.userId);
    return { id: doc._id.toString(), ...doc };
  }

  async createCircular(req: FastifyRequest, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    requireGov(req);
    const title = String(body.title ?? '');
    if (!title) throw new ValidationError('title required');
    const input: CreateCircularInput = {
      title,
      stateId: body.stateId ? String(body.stateId) : null,
      regionId: body.regionId ? String(body.regionId) : null,
      districtId: body.districtId ? String(body.districtId) : null,
      talukaId: body.talukaId ? String(body.talukaId) : null,
    };
    if (body.body) input.body = String(body.body);
    if (body.scope) input.scope = String(body.scope) as CreateCircularInput['scope'];
    if (body.priority) input.priority = String(body.priority) as CreateCircularInput['priority'];
    if (body.expiresAt) input.expiresAt = String(body.expiresAt);
    if (Array.isArray(body.attachments)) input.attachments = body.attachments as string[];
    const doc = await this.repo.createCircular(input, req.sessionUser!.userId);
    return { id: doc._id.toString(), ...doc };
  }

  async getMapData(req: FastifyRequest): Promise<Record<string, unknown>[]> {
    requireGov(req);
    return this.repo.getMapData(req);
  }

  async getAnalytics(req: FastifyRequest, type: string, months?: number): Promise<Record<string, unknown>> {
    requireGov(req);
    const m = months && !Number.isNaN(months) ? months : 6;
    return this.repo.getAnalytics(type, req, m);
  }
}

export default GovernanceService;
