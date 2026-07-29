import { model, Types, type Model, type Document, type FilterQuery } from 'mongoose';
import type { FastifyRequest } from 'fastify';
import { InstitutionModel, type InstitutionDoc } from '../../tenant/entity/institution.entity.js';
import { UserModel } from '../../user/entity/user.entity.js';
import { jurisdictionFilter } from '../../../plugins/tenant.plugin.js';
import {
  MonthlyLockModel,
  UnlockRequestModel,
  type UnlockRequestDoc,
  ApprovalModel,
  type ApprovalDoc,
  InspectionModel,
  type InspectionDoc,
  ComplianceItemModel,
  type ComplianceItemDoc,
  GovGrantModel,
  type GovGrantDoc,
  EmergencyControlModel,
  type EmergencyControlDoc,
  GovAuditFindingModel,
  type GovAuditFindingDoc,
  GovCircularModel,
  type GovCircularDoc,
} from '../entity/governance.entity.js';

export type ComplianceStatus = 'pending' | 'in-progress' | 'compliant' | 'non-compliant' | 'overdue' | 'waived';
export type GrantStatus = 'sanctioned' | 'released' | 'partially-utilized' | 'fully-utilized' | 'lapsed' | 'suspended';
export type EmergencyStatus = 'active' | 'resolved' | 'stand-down';
export type EmergencySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AuditSeverity = 'observation' | 'minor' | 'major' | 'critical';
export type AuditFindingStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type CircularScope = 'all' | 'state' | 'region' | 'district' | 'taluka';
export type CircularPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface UpsertComplianceInput {
  id?: string | undefined;
  tenantId: string;
  category: string;
  title: string;
  description?: string | undefined;
  dueDate?: string | undefined;
  status?: ComplianceStatus | undefined;
  score?: number | null | undefined;
  evidenceUrl?: string | undefined;
  assignedTo?: string | null | undefined;
  notes?: string | undefined;
}

export interface CreateGovAuditInput {
  tenantId: string;
  auditId?: string | undefined;
  source?: 'government' | 'inspection' | 'institution' | undefined;
  title: string;
  description?: string | undefined;
  severity?: AuditSeverity | undefined;
  dueDate?: string | undefined;
  status?: AuditFindingStatus | undefined;
  correctiveAction?: string | undefined;
}

export interface CreateGovGrantInput {
  tenantId: string;
  scheme: string;
  grantCode?: string | undefined;
  financialYear?: number | undefined;
  sanctionedAmount: number;
  releasedAmount?: number | undefined;
  utilizedAmount?: number | undefined;
  status?: GrantStatus | undefined;
  releaseDate?: string | undefined;
  utilizationCertificateUrl?: string | undefined;
  notes?: string | undefined;
}

export interface CreateEmergencyControlInput {
  tenantId: string;
  type: string;
  severity?: EmergencySeverity | undefined;
  location?: string | undefined;
  description?: string | undefined;
  status?: EmergencyStatus | undefined;
}

export interface CreateCircularInput {
  title: string;
  body?: string | undefined;
  scope?: CircularScope | undefined;
  stateId?: string | null | undefined;
  regionId?: string | null | undefined;
  districtId?: string | null | undefined;
  talukaId?: string | null | undefined;
  priority?: CircularPriority | undefined;
  expiresAt?: string | undefined;
  attachments?: string[] | undefined;
}

function getErpModel(name: string): Model<Document> {
  return model<Document>(name);
}

function toObjectId(id?: string): Types.ObjectId | null {
  if (!id || !Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class GovernanceRepository {
  private institutionScope(req: FastifyRequest): FilterQuery<InstitutionDoc> {
    return jurisdictionFilter<InstitutionDoc>(req, {});
  }

  async getScopedInstitutionIds(req: FastifyRequest): Promise<Types.ObjectId[]> {
    const filter = this.institutionScope(req);
    const docs = await InstitutionModel.find(filter as FilterQuery<InstitutionDoc>).select('_id').lean();
    return docs.map((d) => d._id as Types.ObjectId);
  }

  async listInstitutions(req: FastifyRequest): Promise<Array<InstitutionDoc & { _id: Types.ObjectId }>> {
    const filter = this.institutionScope(req);
    return InstitutionModel.find(filter as FilterQuery<InstitutionDoc>).sort({ name: 1 }).limit(500).lean() as Promise<
      Array<InstitutionDoc & { _id: Types.ObjectId }>
    >;
  }

  async findInstitutionById(req: FastifyRequest, id: string): Promise<(InstitutionDoc & { _id: Types.ObjectId }) | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const scope = this.institutionScope(req);
    return InstitutionModel.findOne({ _id: new Types.ObjectId(id), ...scope } as FilterQuery<InstitutionDoc>).lean() as Promise<
      (InstitutionDoc & { _id: Types.ObjectId }) | null
    >;
  }

  async countInstitutions(req: FastifyRequest): Promise<{ total: number; active: number; capacity: number }> {
    const filter = this.institutionScope(req);
    const [total, active, capacityAgg] = await Promise.all([
      InstitutionModel.countDocuments(filter as FilterQuery<InstitutionDoc>),
      InstitutionModel.countDocuments({ ...(filter as Record<string, unknown>), active: true } as FilterQuery<InstitutionDoc>),
      InstitutionModel.aggregate([
        { $match: filter as Record<string, unknown> },
        { $group: { _id: null, capacity: { $sum: '$capacity' } } },
      ]),
    ]);
    return { total, active, capacity: capacityAgg[0]?.capacity ?? 0 };
  }

  async getDashboardMetrics(req: FastifyRequest): Promise<Record<string, unknown>> {
    const ids = await this.getScopedInstitutionIds(req);
    const residents = getErpModel('Erp_residents');
    const beds = getErpModel('Erp_beds');
    const admissions = getErpModel('Erp_admissions');
    const complaints = getErpModel('Erp_complaints');
    const emergencies = getErpModel('Erp_emergencies');

    const [
      residentCount,
      activeResidents,
      bedsTotal,
      bedsOccupied,
      pendingAdmissions,
      openComplaints,
      activeEmergencies,
      staffCount,
      pendingApprovals,
      scheduledInspections,
    ] = await Promise.all([
      residents.countDocuments({ tenantId: { $in: ids }, deletedAt: null }),
      residents.countDocuments({ tenantId: { $in: ids }, status: 'active', deletedAt: null }),
      beds.countDocuments({ tenantId: { $in: ids }, deletedAt: null }),
      beds.countDocuments({ tenantId: { $in: ids }, status: 'occupied', deletedAt: null }),
      admissions.countDocuments({ tenantId: { $in: ids }, status: { $nin: ['admitted', 'rejected', 'cancelled'] }, deletedAt: null }),
      complaints.countDocuments({ tenantId: { $in: ids }, status: { $in: ['open', 'investigating'] }, deletedAt: null }),
      emergencies.countDocuments({ tenantId: { $in: ids }, status: 'active', deletedAt: null }),
      UserModel.countDocuments({ tenantId: { $in: ids }, isActive: true }),
      ApprovalModel.countDocuments({ tenantId: { $in: ids }, status: 'pending' }),
      InspectionModel.countDocuments({ tenantId: { $in: ids }, status: 'scheduled' }),
    ]);

    const [complianceScoreAgg, complianceStatusAgg, grantStatusAgg, grantTotalsAgg, recentAlerts] = await Promise.all([
      ComplianceItemModel.aggregate([
        { $match: { tenantId: { $in: ids }, score: { $ne: null } } },
        { $group: { _id: null, score: { $avg: '$score' } } },
      ]),
      ComplianceItemModel.aggregate([{ $match: { tenantId: { $in: ids } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      GovGrantModel.aggregate([{ $match: { tenantId: { $in: ids } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      GovGrantModel.aggregate([
        { $match: { tenantId: { $in: ids } } },
        { $group: { _id: null, sanctioned: { $sum: '$sanctionedAmount' }, released: { $sum: '$releasedAmount' }, utilized: { $sum: '$utilizedAmount' } } },
      ]),
      this.buildRecentAlerts(ids),
    ]);

    const complianceScore = complianceScoreAgg[0]?.score ?? null;
    const complianceStatus = Object.fromEntries(complianceStatusAgg.map((s) => [String(s._id), s.count]));
    const grantStatus = Object.fromEntries(grantStatusAgg.map((s) => [String(s._id), s.count]));
    const grantTotals = grantTotalsAgg[0] ?? { sanctioned: 0, released: 0, utilized: 0 };

    return {
      institutions: ids.length,
      residents: residentCount,
      activeResidents,
      bedsTotal,
      bedsOccupied,
      bedsAvailable: bedsTotal - bedsOccupied,
      occupancyRate: bedsTotal === 0 ? 0 : Math.round((bedsOccupied / bedsTotal) * 100),
      pendingAdmissions,
      openComplaints,
      activeEmergencies,
      staffCount,
      pendingApprovals,
      scheduledInspections,
      complianceScore: complianceScore === null ? null : Math.round(complianceScore),
      complianceStatus,
      grantStatus,
      grantTotals,
      recentAlerts,
    };
  }

  private async buildRecentAlerts(ids: Types.ObjectId[]): Promise<Record<string, unknown>[]> {
    const [activeEmergencies, openFindings, overdueCompliance, pendingApprovals] = await Promise.all([
      EmergencyControlModel.find({ tenantId: { $in: ids }, status: 'active' }).sort({ createdAt: -1 }).limit(10).lean(),
      GovAuditFindingModel.find({ tenantId: { $in: ids }, status: { $in: ['open', 'in-progress'] } }).sort({ createdAt: -1 }).limit(10).lean(),
      ComplianceItemModel.find({ tenantId: { $in: ids }, status: { $nin: ['compliant', 'waived'] }, dueDate: { $lt: new Date() } }).sort({ dueDate: 1 }).limit(10).lean(),
      ApprovalModel.find({ tenantId: { $in: ids }, status: 'pending' }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const alerts: Record<string, unknown>[] = [
      ...activeEmergencies.map((d) => ({ type: 'emergency', severity: d.severity, message: d.description || `${d.type} emergency`, tenantId: d.tenantId, id: d._id.toString() })),
      ...openFindings.map((d) => ({ type: 'audit-finding', severity: d.severity, message: d.title, tenantId: d.tenantId, id: d._id.toString() })),
      ...overdueCompliance.map((d) => ({ type: 'compliance-overdue', severity: 'high', message: d.title, tenantId: d.tenantId, id: d._id.toString() })),
      ...pendingApprovals.map((d) => ({ type: 'pending-approval', severity: 'normal', message: d.summary, tenantId: d.tenantId, id: d._id.toString() })),
    ];
    return alerts.slice(0, 20);
  }

  async getJurisdictionDashboard(
    req: FastifyRequest,
    groupByField?: 'districtId' | 'talukaId',
  ): Promise<Record<string, unknown>> {
    const institutions = await this.listInstitutions(req);
    const ids = institutions.map((i) => i._id);
    const idToInstitution = new Map(institutions.map((i) => [i._id.toString(), i]));

    const [activeResidentsAgg, bedsAgg, occupiedAgg] = await Promise.all([
      getErpModel('Erp_residents').aggregate([
        { $match: { tenantId: { $in: ids }, status: 'active', deletedAt: null } },
        { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      ]),
      getErpModel('Erp_beds').aggregate([
        { $match: { tenantId: { $in: ids }, deletedAt: null } },
        { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      ]),
      getErpModel('Erp_beds').aggregate([
        { $match: { tenantId: { $in: ids }, status: 'occupied', deletedAt: null } },
        { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      ]),
    ]);

    const metrics = new Map<string, { activeResidents: number; bedsTotal: number; bedsOccupied: number }>();
    for (const i of institutions) {
      metrics.set(i._id.toString(), { activeResidents: 0, bedsTotal: 0, bedsOccupied: 0 });
    }
    for (const r of activeResidentsAgg) metrics.get(String(r._id))!.activeResidents = r.count;
    for (const b of bedsAgg) metrics.get(String(b._id))!.bedsTotal = b.count;
    for (const o of occupiedAgg) metrics.get(String(o._id))!.bedsOccupied = o.count;

    const totalCapacity = institutions.reduce((sum, i) => sum + (i.capacity || 0), 0);
    const totalActiveResidents = Array.from(metrics.values()).reduce((s, m) => s + m.activeResidents, 0);
    const totalBeds = Array.from(metrics.values()).reduce((s, m) => s + m.bedsTotal, 0);
    const totalOccupied = Array.from(metrics.values()).reduce((s, m) => s + m.bedsOccupied, 0);

    if (!groupByField) {
      return {
        totalCapacity,
        totalActiveResidents,
        totalBeds,
        totalOccupied,
        occupancyRate: totalBeds === 0 ? 0 : Math.round((totalOccupied / totalBeds) * 100),
        institutions: institutions.map((i) => ({
          id: i._id.toString(),
          name: i.name,
          code: i.code,
          capacity: i.capacity,
          active: i.active,
          ...metrics.get(i._id.toString()),
        })),
      };
    }

    const groups = new Map<string, { name: string; institutionIds: string[]; capacity: number; activeResidents: number; bedsTotal: number; bedsOccupied: number }>();
    for (const i of institutions) {
      const key = String((i as Record<string, unknown>)[groupByField] ?? 'unknown');
      const g = groups.get(key) ?? { name: key === 'unknown' ? 'Unassigned' : key, institutionIds: [], capacity: 0, activeResidents: 0, bedsTotal: 0, bedsOccupied: 0 };
      g.institutionIds.push(i._id.toString());
      g.capacity += i.capacity || 0;
      const m = metrics.get(i._id.toString())!;
      g.activeResidents += m.activeResidents;
      g.bedsTotal += m.bedsTotal;
      g.bedsOccupied += m.bedsOccupied;
      groups.set(key, g);
    }

    return {
      totalCapacity,
      totalActiveResidents,
      totalBeds,
      totalOccupied,
      occupancyRate: totalBeds === 0 ? 0 : Math.round((totalOccupied / totalBeds) * 100),
      groups: Array.from(groups.entries()).map(([id, g]) => ({
        id,
        name: g.name,
        institutionCount: g.institutionIds.length,
        capacity: g.capacity,
        activeResidents: g.activeResidents,
        bedsTotal: g.bedsTotal,
        bedsOccupied: g.bedsOccupied,
        occupancyRate: g.bedsTotal === 0 ? 0 : Math.round((g.bedsOccupied / g.bedsTotal) * 100),
      })),
    };
  }

  async getLiveMonitoring(req: FastifyRequest, institutionId: string): Promise<Record<string, unknown> | null> {
    const institution = await this.findInstitutionById(req, institutionId);
    if (!institution) return null;
    const tenantId = institution._id;
    const [activeResidents, activeEmergencies, pendingApprovals, scheduledInspections, pendingCompliance, openFindings, recentInspections] = await Promise.all([
      getErpModel('Erp_residents').countDocuments({ tenantId, status: 'active', deletedAt: null }),
      EmergencyControlModel.countDocuments({ tenantId, status: 'active' }),
      ApprovalModel.countDocuments({ tenantId, status: 'pending' }),
      InspectionModel.countDocuments({ tenantId, status: 'scheduled' }),
      ComplianceItemModel.countDocuments({ tenantId, status: { $nin: ['compliant', 'waived'] } }),
      GovAuditFindingModel.countDocuments({ tenantId, status: { $in: ['open', 'in-progress'] } }),
      InspectionModel.find({ tenantId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return {
      institution: { id: tenantId.toString(), name: institution.name, code: institution.code, active: institution.active, capacity: institution.capacity },
      activeResidents,
      activeEmergencies,
      pendingApprovals,
      scheduledInspections,
      pendingCompliance,
      openFindings,
      recentInspections: recentInspections.map((d) => ({ ...d, id: d._id.toString() })),
    };
  }

  async getMapData(req: FastifyRequest): Promise<Record<string, unknown>[]> {
    const filter = this.institutionScope(req);
    const docs = await InstitutionModel.find(filter as FilterQuery<InstitutionDoc>)
      .select('name nameMr code capacity active addressLine gpsLat gpsLng')
      .limit(1000)
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      nameMr: d.nameMr,
      code: d.code,
      capacity: d.capacity,
      active: d.active,
      addressLine: d.addressLine,
      lat: d.gpsLat ?? null,
      lng: d.gpsLng ?? null,
    }));
  }

  async listComplianceItems(req: FastifyRequest): Promise<ComplianceItemDoc[]> {
    const ids = await this.getScopedInstitutionIds(req);
    return ComplianceItemModel.find({ tenantId: { $in: ids } }).sort({ createdAt: -1 }).limit(500).lean();
  }

  async upsertComplianceItem(input: UpsertComplianceInput, createdBy: string): Promise<ComplianceItemDoc> {
    const tenantOid = toObjectId(input.tenantId);
    const assignedOid = toObjectId(input.assignedTo ?? undefined);
    if (!tenantOid) throw new Error('invalid tenantId');
    const payload: Record<string, unknown> = {
      tenantId: tenantOid,
      category: input.category,
      title: input.title,
      description: input.description ?? '',
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      status: input.status ?? 'pending',
      score: input.score ?? null,
      evidenceUrl: input.evidenceUrl ?? '',
      assignedTo: assignedOid,
      notes: input.notes ?? '',
    };
    if (input.id && Types.ObjectId.isValid(input.id)) {
      const updated = await ComplianceItemModel.findByIdAndUpdate(input.id, { $set: payload }, { new: true, runValidators: true }).lean();
      if (!updated) throw new Error('compliance item not found');
      return updated as ComplianceItemDoc;
    }
    return ComplianceItemModel.create({ ...payload, createdBy: toObjectId(createdBy) }).then((d) => d.toObject() as ComplianceItemDoc);
  }

  async getInspectionById(id: string): Promise<InspectionDoc | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return InspectionModel.findById(id).lean() as Promise<InspectionDoc | null>;
  }

  async listGovAudits(req: FastifyRequest): Promise<GovAuditFindingDoc[]> {
    const ids = await this.getScopedInstitutionIds(req);
    return GovAuditFindingModel.find({ tenantId: { $in: ids } }).sort({ createdAt: -1 }).limit(500).lean();
  }

  async createGovAudit(input: CreateGovAuditInput, createdBy: string): Promise<GovAuditFindingDoc> {
    const tenantOid = toObjectId(input.tenantId);
    if (!tenantOid) throw new Error('invalid tenantId');
    const doc = await GovAuditFindingModel.create({
      tenantId: tenantOid,
      auditId: input.auditId ?? '',
      source: input.source ?? 'government',
      title: input.title,
      description: input.description ?? '',
      severity: input.severity ?? 'observation',
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      status: input.status ?? 'open',
      correctiveAction: input.correctiveAction ?? '',
      createdBy: toObjectId(createdBy),
    });
    return doc.toObject() as GovAuditFindingDoc;
  }

  async listGovGrants(req: FastifyRequest): Promise<GovGrantDoc[]> {
    const ids = await this.getScopedInstitutionIds(req);
    return GovGrantModel.find({ tenantId: { $in: ids } }).sort({ createdAt: -1 }).limit(500).lean();
  }

  async createGovGrant(input: CreateGovGrantInput, createdBy: string): Promise<GovGrantDoc> {
    const tenantOid = toObjectId(input.tenantId);
    if (!tenantOid) throw new Error('invalid tenantId');
    const doc = await GovGrantModel.create({
      tenantId: tenantOid,
      scheme: input.scheme,
      grantCode: input.grantCode ?? '',
      financialYear: input.financialYear ?? null,
      sanctionedAmount: input.sanctionedAmount,
      releasedAmount: input.releasedAmount ?? 0,
      utilizedAmount: input.utilizedAmount ?? 0,
      status: input.status ?? 'sanctioned',
      releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
      utilizationCertificateUrl: input.utilizationCertificateUrl ?? '',
      notes: input.notes ?? '',
      createdBy: toObjectId(createdBy),
    });
    return doc.toObject() as GovGrantDoc;
  }

  async listEmergencyControls(req: FastifyRequest, activeOnly = false): Promise<EmergencyControlDoc[]> {
    const ids = await this.getScopedInstitutionIds(req);
    const filter: Record<string, unknown> = { tenantId: { $in: ids } };
    if (activeOnly) filter.status = 'active';
    return EmergencyControlModel.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  }

  async createEmergencyControl(input: CreateEmergencyControlInput, reportedBy: string): Promise<EmergencyControlDoc> {
    const tenantOid = toObjectId(input.tenantId);
    if (!tenantOid) throw new Error('invalid tenantId');
    const doc = await EmergencyControlModel.create({
      tenantId: tenantOid,
      type: input.type,
      severity: input.severity ?? 'medium',
      location: input.location ?? '',
      description: input.description ?? '',
      status: input.status ?? 'active',
      reportedBy: toObjectId(reportedBy),
    });
    return doc.toObject() as EmergencyControlDoc;
  }

  async createCircular(input: CreateCircularInput, issuedBy: string): Promise<GovCircularDoc> {
    const doc = await GovCircularModel.create({
      title: input.title,
      body: input.body ?? '',
      scope: input.scope ?? 'all',
      stateId: toObjectId(input.stateId ?? undefined),
      regionId: toObjectId(input.regionId ?? undefined),
      districtId: toObjectId(input.districtId ?? undefined),
      talukaId: toObjectId(input.talukaId ?? undefined),
      priority: input.priority ?? 'normal',
      issuedBy: toObjectId(issuedBy),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      attachments: input.attachments ?? [],
    });
    return doc.toObject() as GovCircularDoc;
  }

  async getAnalytics(type: string, req: FastifyRequest, months = 6): Promise<Record<string, unknown>> {
    const ids = await this.getScopedInstitutionIds(req);
    const start = monthsAgo(months);
    switch (type) {
      case 'resident-trends':
        return this.trendCount(getErpModel('Erp_residents'), ids, 'admissionDate', start);
      case 'bed-occupancy': {
        const total = await getErpModel('Erp_beds').countDocuments({ tenantId: { $in: ids }, deletedAt: null });
        const occupied = await getErpModel('Erp_beds').countDocuments({ tenantId: { $in: ids }, status: 'occupied', deletedAt: null });
        return { total, occupied, available: total - occupied, occupancyRate: total === 0 ? 0 : Math.round((occupied / total) * 100) };
      }
      case 'health-trends':
        return this.trendCount(getErpModel('Erp_medical-records'), ids, 'recordDate', start);
      case 'death-trends':
        return this.trendCount(getErpModel('Erp_deaths'), ids, 'deathDate', start);
      case 'donation-trends':
        return this.trendSum(getErpModel('Erp_donations'), ids, 'donationDate', 'amount', start);
      case 'financial-trends':
        return this.financialTrends(ids, start);
      case 'complaint-trends':
        return this.complaintTrends(ids, start);
      case 'grant-utilization':
        return this.grantUtilization(ids);
      default:
        return { availableTypes: ['resident-trends', 'bed-occupancy', 'health-trends', 'death-trends', 'donation-trends', 'financial-trends', 'complaint-trends', 'grant-utilization'] };
    }
  }

  private async trendCount(modelRef: Model<Document>, ids: Types.ObjectId[], dateField: string, start: Date): Promise<Record<string, unknown>> {
    const rows = await modelRef.aggregate([
      { $match: { tenantId: { $in: ids }, [dateField]: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: `$${dateField}` } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return { months: rows.map((r) => r._id), counts: rows.map((r) => r.count) };
  }

  private async trendSum(modelRef: Model<Document>, ids: Types.ObjectId[], dateField: string, amountField: string, start: Date): Promise<Record<string, unknown>> {
    const rows = await modelRef.aggregate([
      { $match: { tenantId: { $in: ids }, [dateField]: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: `$${dateField}` } }, count: { $sum: 1 }, total: { $sum: `$${amountField}` } } },
      { $sort: { _id: 1 } },
    ]);
    return { months: rows.map((r) => r._id), counts: rows.map((r) => r.count), totals: rows.map((r) => r.total) };
  }

  private async financialTrends(ids: Types.ObjectId[], start: Date): Promise<Record<string, unknown>> {
    const [incomeRows, expenseRows] = await Promise.all([
      getErpModel('Erp_incomes').aggregate([
        { $match: { tenantId: { $in: ids }, date: { $gte: start } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, income: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      getErpModel('Erp_expenses').aggregate([
        { $match: { tenantId: { $in: ids }, date: { $gte: start } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, expense: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const allMonths = Array.from(new Set([...incomeRows.map((r) => r._id), ...expenseRows.map((r) => r._id)])).sort();
    const incomeMap = new Map(incomeRows.map((r) => [r._id, r.income]));
    const expenseMap = new Map(expenseRows.map((r) => [r._id, r.expense]));
    const data = allMonths.map((m) => ({
      month: m,
      income: incomeMap.get(m) ?? 0,
      expense: expenseMap.get(m) ?? 0,
      net: (incomeMap.get(m) ?? 0) - (expenseMap.get(m) ?? 0),
    }));
    return { months: data.map((d) => d.month), income: data.map((d) => d.income), expense: data.map((d) => d.expense), net: data.map((d) => d.net) };
  }

  private async complaintTrends(ids: Types.ObjectId[], start: Date): Promise<Record<string, unknown>> {
    const rows = await getErpModel('Erp_complaints').aggregate([
      { $match: { tenantId: { $in: ids }, complaintDate: { $gte: start } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { total, byStatus };
  }

  private async grantUtilization(ids: Types.ObjectId[]): Promise<Record<string, unknown>> {
    const rows = await GovGrantModel.aggregate([
      { $match: { tenantId: { $in: ids } } },
      { $group: { _id: '$scheme', sanctioned: { $sum: '$sanctionedAmount' }, released: { $sum: '$releasedAmount' }, utilized: { $sum: '$utilizedAmount' } } },
    ]);
    return {
      total: {
        sanctioned: rows.reduce((s, r) => s + r.sanctioned, 0),
        released: rows.reduce((s, r) => s + r.released, 0),
        utilized: rows.reduce((s, r) => s + r.utilized, 0),
      },
      byScheme: rows.map((r) => ({ scheme: r._id, sanctioned: r.sanctioned, released: r.released, utilized: r.utilized })),
    };
  }

  async monthlyClose(tenantId: string, userId: string, year: number, month: number, notes: string): Promise<Record<string, unknown>> {
    const lock = await MonthlyLockModel.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), year, month },
      { $set: { locked: true, lockedBy: new Types.ObjectId(userId), lockedAt: new Date(), notes } },
      { upsert: true, new: true },
    ).lean();
    return { id: String(lock._id), locked: true };
  }

  async listLocks(filter: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const docs = await MonthlyLockModel.find(filter).sort({ year: -1, month: -1 }).limit(100).lean();
    return docs.map((d) => ({ ...d, id: d._id.toString() }));
  }

  async createUnlockRequest(input: { tenantId: string; year: number; month: number; reason: string; documentsUrls: string; requestedBy: string }): Promise<Record<string, unknown>> {
    const doc = await UnlockRequestModel.create({
      tenantId: new Types.ObjectId(input.tenantId),
      year: input.year,
      month: input.month,
      reason: input.reason,
      documentsUrls: input.documentsUrls,
      requestedBy: new Types.ObjectId(input.requestedBy),
    });
    return { id: doc._id.toString() };
  }

  async listUnlockRequests(filter: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const docs = await UnlockRequestModel.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return docs.map((d) => ({ ...d, id: d._id.toString() }));
  }

  async getUnlockRequestById(id: string): Promise<UnlockRequestDoc | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return UnlockRequestModel.findById(id).lean() as Promise<UnlockRequestDoc | null>;
  }

  async getApprovalById(id: string): Promise<ApprovalDoc | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ApprovalModel.findById(id).lean() as Promise<ApprovalDoc | null>;
  }

  async decideUnlockRequest(id: string, decision: string, reviewedBy: string, reviewNotes: string, temporaryUnlockMinutes?: number): Promise<Record<string, unknown>> {
    const doc = await UnlockRequestModel.findByIdAndUpdate(id, {
      $set: {
        status: decision,
        reviewedBy: new Types.ObjectId(reviewedBy),
        reviewNotes,
        expiresAt: decision === 'temporary-unlock' ? new Date(Date.now() + (temporaryUnlockMinutes ?? 60) * 60000) : null,
      },
    }, { new: true }).lean();
    if (!doc) throw new Error('unlock request not found');
    if (decision === 'approved' || decision === 'temporary-unlock') {
      await MonthlyLockModel.findOneAndUpdate(
        { tenantId: doc.tenantId, year: doc.year, month: doc.month },
        { $set: { locked: false, governmentApprovedBy: new Types.ObjectId(reviewedBy) } },
      );
    }
    return { id, status: decision };
  }

  async createApproval(input: { tenantId: string; requestType: string; referenceId: string; summary: string; payload: Record<string, unknown> | null; submittedBy: string }): Promise<Record<string, unknown>> {
    const doc = await ApprovalModel.create({
      tenantId: new Types.ObjectId(input.tenantId),
      requestType: input.requestType,
      referenceId: input.referenceId,
      summary: input.summary,
      payload: input.payload,
      submittedBy: new Types.ObjectId(input.submittedBy),
    });
    return { id: doc._id.toString() };
  }

  async listApprovals(filter: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const docs = await ApprovalModel.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return docs.map((d) => ({ ...d, id: d._id.toString() }));
  }

  async decideApproval(id: string, decision: string, decidedBy: string, decisionNotes: string, escalateTo?: string): Promise<Record<string, unknown>> {
    const set: Record<string, unknown> = { status: decision, decidedBy: new Types.ObjectId(decidedBy), decisionNotes, decidedAt: new Date() };
    if (decision === 'escalated') {
      set.currentLevel = escalateTo;
      set.status = 'pending';
    }
    const doc = await ApprovalModel.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    if (!doc) throw new Error('approval not found');
    return { id, status: doc.status };
  }

  async createInspection(input: { tenantId: string; scheduledDate: string; inspectorId: string; inspectorName: string }): Promise<Record<string, unknown>> {
    const doc = await InspectionModel.create({
      tenantId: new Types.ObjectId(input.tenantId),
      scheduledDate: new Date(input.scheduledDate),
      inspectorId: new Types.ObjectId(input.inspectorId),
      inspectorName: input.inspectorName,
    });
    return { id: doc._id.toString() };
  }

  async listInspections(filter: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const docs = await InspectionModel.find(filter).sort({ scheduledDate: -1 }).limit(100).lean();
    return docs.map((d) => ({ ...d, id: d._id.toString() }));
  }

  async completeInspection(id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const doc = await InspectionModel.findByIdAndUpdate(id, {
      $set: {
        checklist: body.checklist ?? null,
        score: body.score ?? null,
        findings: body.findings ?? '',
        gpsLat: body.gpsLat ?? null,
        gpsLng: body.gpsLng ?? null,
        qrVerified: body.qrVerified ?? false,
        photoUrls: body.photoUrls ?? [],
        noticeIssued: body.noticeIssued ?? false,
        status: 'completed',
        completedAt: new Date(),
      },
    }, { new: true }).lean();
    if (!doc) throw new Error('inspection not found');
    return { id, status: 'completed' };
  }
}

export default GovernanceRepository;
