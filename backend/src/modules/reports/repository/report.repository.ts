import { model, type Model, type Document, type FilterQuery, Types } from 'mongoose';
import type { FastifyRequest } from 'fastify';
import { tenantFilter, jurisdictionFilter, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError } from '../../../kernel/errors/app-error.js';
import { AuditLogModel } from '../../audit-log/entity/audit-log.entity.js';

export interface DateRange {
  from?: Date | undefined;
  to?: Date | undefined;
}

function buildDateFilter(dateField: string, range: DateRange): Record<string, unknown> {
  const clause: Record<string, unknown> = {};
  if (range.from || range.to) {
    const bounds: Record<string, Date> = {};
    if (range.from) bounds.$gte = range.from;
    if (range.to) bounds.$lte = range.to;
    clause[dateField] = bounds;
  }
  return clause;
}

function getErpModel(name: string): Model<Document> {
  return model<Document>(name.startsWith('Erp_') ? name : `Erp_${name}`);
}

function baseTenantFilter<T>(req: FastifyRequest): FilterQuery<T> {
  const su = req.sessionUser;
  if (!su) throw new ForbiddenError();
  if (su.tier === 'government') {
    if (su.jurisdiction && su.jurisdiction.level !== 'all') {
      return jurisdictionFilter<T>(req, {});
    }
    return {};
  }
  const tenantId = resolvedTenantId(req);
  if (!tenantId) throw new ForbiddenError('tenant scope required');
  return tenantFilter<T>(req, {});
}

function toStatusCounts(rows: { _id: unknown; count: number }[]): { status: string; count: number }[] {
  return rows.map((r) => ({ status: String(r._id ?? 'unspecified'), count: r.count }));
}

export class ReportRepository {
  async admissions(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('applicationDate', range) };
    const m = getErpModel('admissions');
    const [total, byStatus, byPriority] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$priority', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byStatus: toStatusCounts(byStatus), byPriority: toStatusCounts(byPriority) };
  }

  async discharges(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('dischargeDate', range) };
    const m = getErpModel('discharges');
    const [total, byType] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byType: toStatusCounts(byType) };
  }

  async deaths(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('deathDate', range) };
    const m = getErpModel('deaths');
    const [total, reported] = await Promise.all([
      m.countDocuments(filter),
      m.countDocuments({ ...filter, governmentReported: true }),
    ]);
    return { total, governmentReported: reported };
  }

  async medical(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('recordDate', range) };
    const m = getErpModel('medical-records');
    const [total, byDiagnosis, residentsCovered] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$diagnosis', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      m.distinct('residentId', filter),
    ]);
    return { total, residentsCovered: residentsCovered.length, byDiagnosis: toStatusCounts(byDiagnosis) };
  }

  async medicine(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const t = baseTenantFilter<Document>(req);
    const stock = getErpModel('pharmacy-stock');
    const issues = getErpModel('medicine-issues');
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [stockBatches, expired, expiringSoon, totalIssues, lowStock] = await Promise.all([
      stock.countDocuments({ ...t, deletedAt: null, ...buildDateFilter('receivedDate', range) }),
      stock.countDocuments({ ...t, deletedAt: null, expiryDate: { $lt: now } }),
      stock.countDocuments({ ...t, deletedAt: null, expiryDate: { $gte: now, $lte: thirtyDays } }),
      issues.countDocuments({ ...t, deletedAt: null, ...buildDateFilter('issueDate', range) }),
      stock.aggregate([
        { $match: { ...t, deletedAt: null } },
        { $group: { _id: '$medicineId', total: { $sum: '$quantity' } } },
        { $lookup: { from: 'medicines', localField: '_id', foreignField: '_id', as: 'medicine' } },
        { $unwind: { path: '$medicine', preserveNullAndEmptyArrays: true } },
        { $match: { $expr: { $and: [{ $ne: ['$medicine.reorderLevel', null] }, { $lt: ['$total', '$medicine.reorderLevel'] }] } } },
        { $project: { medicineName: { $ifNull: ['$medicine.name', 'unknown'] }, total: 1, reorderLevel: '$medicine.reorderLevel' } },
      ]),
    ]);
    return { stockBatches, expired, expiringSoon, totalIssues, lowStockCount: lowStock.length, lowStock };
  }

  async attendance(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const t = baseTenantFilter<Document>(req);
    const resident = getErpModel('resident-attendance');
    const employee = getErpModel('employee-attendance');
    const [residentRecords, residentByStatus, employeeRecords, employeeByStatus] = await Promise.all([
      resident.countDocuments({ ...t, deletedAt: null, ...buildDateFilter('date', range) }),
      resident.aggregate([{ $match: { ...t, deletedAt: null, ...buildDateFilter('date', range) } }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      employee.countDocuments({ ...t, deletedAt: null, ...buildDateFilter('date', range) }),
      employee.aggregate([{ $match: { ...t, deletedAt: null, ...buildDateFilter('date', range) } }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return {
      resident: { total: residentRecords, byStatus: toStatusCounts(residentByStatus) },
      employee: { total: employeeRecords, byStatus: toStatusCounts(employeeByStatus) },
    };
  }

  async kitchen(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('date', range) };
    const m = getErpModel('meal-attendance');
    const [total, byMeal, byStatus] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$meal', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byMeal: toStatusCounts(byMeal), byStatus: toStatusCounts(byStatus) };
  }

  async diet(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('startDate', range) };
    const m = getErpModel('diet-plans');
    const [total, byType, byStatus] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$dietType', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byType: toStatusCounts(byType), byStatus: toStatusCounts(byStatus) };
  }

  async laundry(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('date', range) };
    const m = getErpModel('laundry');
    const [total, byType, byStatus] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byType: toStatusCounts(byType), byStatus: toStatusCounts(byStatus) };
  }

  async housekeeping(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('date', range) };
    const m = getErpModel('housekeeping');
    const [total, byTask, byStatus] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$task', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byTask: toStatusCounts(byTask), byStatus: toStatusCounts(byStatus) };
  }

  async incidents(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('incidentDate', range) };
    const m = getErpModel('incidents');
    const [total, byType, bySeverity] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$severity', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byType: toStatusCounts(byType), bySeverity: toStatusCounts(bySeverity) };
  }

  async visitors(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('entryTime', range) };
    const m = getErpModel('visitors');
    const [total, byStatus] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byStatus: toStatusCounts(byStatus) };
  }

  async emergencies(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('alertTime', range) };
    const m = getErpModel('emergencies');
    const [total, byType, active] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.countDocuments({ ...filter, status: 'active' }),
    ]);
    return { total, active, byType: toStatusCounts(byType) };
  }

  async monthly(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const t = baseTenantFilter<Document>(req);
    const counts = await Promise.all([
      getErpModel('admissions').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('applicationDate', range) }),
      getErpModel('discharges').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('dischargeDate', range) }),
      getErpModel('deaths').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('deathDate', range) }),
      getErpModel('medical-records').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('recordDate', range) }),
      getErpModel('resident-attendance').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('date', range) }),
      getErpModel('visitors').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('entryTime', range) }),
      getErpModel('incidents').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('incidentDate', range) }),
      getErpModel('emergencies').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('alertTime', range) }),
      getErpModel('incomes').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('date', range) }),
      getErpModel('expenses').countDocuments({ ...t, deletedAt: null, ...buildDateFilter('date', range) }),
    ]);
    return {
      admissions: counts[0],
      discharges: counts[1],
      deaths: counts[2],
      medicalRecords: counts[3],
      residentAttendance: counts[4],
      visitors: counts[5],
      incidents: counts[6],
      emergencies: counts[7],
      incomes: counts[8],
      expenses: counts[9],
    };
  }

  async finance(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const t = baseTenantFilter<Document>(req);
    const cash = getErpModel('cash-book');
    const bank = getErpModel('bank-transactions');
    const incomes = getErpModel('incomes');
    const expenses = getErpModel('expenses');
    const [cashReceipts, cashPayments, bankDeposits, bankWithdrawals, totalIncome, totalExpense] = await Promise.all([
      cash.aggregate([{ $match: { ...t, deletedAt: null, type: 'receipt', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      cash.aggregate([{ $match: { ...t, deletedAt: null, type: 'payment', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      bank.aggregate([{ $match: { ...t, deletedAt: null, type: 'deposit', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      bank.aggregate([{ $match: { ...t, deletedAt: null, type: 'withdrawal', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      incomes.aggregate([{ $match: { ...t, deletedAt: null, ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      expenses.aggregate([{ $match: { ...t, deletedAt: null, ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    return {
      cashReceipts: cashReceipts[0]?.total ?? 0,
      cashPayments: cashPayments[0]?.total ?? 0,
      bankDeposits: bankDeposits[0]?.total ?? 0,
      bankWithdrawals: bankWithdrawals[0]?.total ?? 0,
      totalIncome: totalIncome[0]?.total ?? 0,
      totalExpense: totalExpense[0]?.total ?? 0,
    };
  }

  async ledger(req: FastifyRequest, _range: DateRange): Promise<Record<string, unknown>> {
    const t = baseTenantFilter<Document>(req);
    const accounts = getErpModel('accounts');
    const vouchers = getErpModel('vouchers');
    const [accountList, debitTotals, creditTotals] = await Promise.all([
      accounts.find({ ...t, deletedAt: null }).select('code name type openingBalance').lean(),
      vouchers.aggregate([{ $match: { ...t, deletedAt: null } }, { $group: { _id: '$debitAccountCode', total: { $sum: '$amount' } } }]),
      vouchers.aggregate([{ $match: { ...t, deletedAt: null } }, { $group: { _id: '$creditAccountCode', total: { $sum: '$amount' } } }]),
    ]);
    const debitMap = new Map(debitTotals.map((r) => [String(r._id), r.total as number]));
    const creditMap = new Map(creditTotals.map((r) => [String(r._id), r.total as number]));
    const balances = accountList.map((acc) => {
      const code = String((acc as Record<string, unknown>).code);
      const opening = Number((acc as Record<string, unknown>).openingBalance ?? 0);
      const debit = debitMap.get(code) ?? 0;
      const credit = creditMap.get(code) ?? 0;
      return { code, name: (acc as Record<string, unknown>).name, type: (acc as Record<string, unknown>).type, opening, debit, credit, balance: opening + debit - credit };
    });
    return { accounts: balances };
  }

  async donations(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('donationDate', range) };
    const m = getErpModel('donations');
    const [total, totalAmount, byType, byMode] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$donationType', count: { $sum: 1 }, amount: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$mode', count: { $sum: 1 }, amount: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, totalAmount: totalAmount[0]?.total ?? 0, byType, byMode };
  }

  async inventory(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const t = baseTenantFilter<Document>(req);
    const items = getErpModel('inventory-items');
    const moves = getErpModel('inventory-moves');
    const [itemList, totalMoves, stockIn, stockOut, lowStock] = await Promise.all([
      items.find({ ...t, deletedAt: null }).select('name category currentStock reorderLevel').lean(),
      moves.countDocuments({ ...t, deletedAt: null, ...buildDateFilter('date', range) }),
      moves.aggregate([{ $match: { ...t, deletedAt: null, type: 'stock-in', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$quantity' } } }]),
      moves.aggregate([{ $match: { ...t, deletedAt: null, type: 'stock-out', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$quantity' } } }]),
      items.find({ ...t, deletedAt: null, $expr: { $lte: ['$currentStock', '$reorderLevel'] } }).select('name currentStock reorderLevel').lean(),
    ]);
    return {
      items: itemList,
      totalMoves,
      stockIn: stockIn[0]?.total ?? 0,
      stockOut: stockOut[0]?.total ?? 0,
      lowStock,
    };
  }

  async assets(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const t = baseTenantFilter<Document>(req);
    const assets = getErpModel('assets');
    const deadStock = getErpModel('dead-stock');
    const [total, byCategory, byStatus, disposed, purchased] = await Promise.all([
      assets.countDocuments({ ...t, deletedAt: null }),
      assets.aggregate([{ $match: { ...t, deletedAt: null } }, { $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: '$cost' } } }, { $sort: { _id: 1 } }]),
      assets.aggregate([{ $match: { ...t, deletedAt: null } }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      deadStock.countDocuments({ ...t, deletedAt: null, ...buildDateFilter('disposalDate', range) }),
      assets.countDocuments({ ...t, deletedAt: null, ...buildDateFilter('purchaseDate', range) }),
    ]);
    return { total, byCategory, byStatus, disposed, purchased };
  }

  async payroll(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('generatedDate', range) };
    const payrolls = getErpModel('payrolls');
    const employees = getErpModel('employees');
    const [totalPayrolls, netPay, byStatus, activeEmployees] = await Promise.all([
      payrolls.countDocuments(filter),
      payrolls.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$netPay' } } }]),
      payrolls.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 }, netPay: { $sum: '$netPay' } } }, { $sort: { _id: 1 } }]),
      employees.countDocuments({ ...baseTenantFilter<Document>(req), deletedAt: null, status: 'active' }),
    ]);
    return { totalPayrolls, netPay: netPay[0]?.total ?? 0, byStatus, activeEmployees };
  }

  async complaints(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const filter = { ...baseTenantFilter<Document>(req), deletedAt: null, ...buildDateFilter('complaintDate', range) };
    const m = getErpModel('complaints');
    const [total, byStatus, byComplainantType] = await Promise.all([
      m.countDocuments(filter),
      m.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      m.aggregate([{ $match: filter }, { $group: { _id: '$complainantType', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { total, byStatus: toStatusCounts(byStatus), byComplainantType: toStatusCounts(byComplainantType) };
  }

  async audits(req: FastifyRequest, range: DateRange): Promise<Record<string, unknown>> {
    const t = baseTenantFilter<Document>(req);
    const su = req.sessionUser;
    let auditFilter: Record<string, unknown>;
    if (su?.tier === 'government') {
      auditFilter = {};
    } else {
      const tenantId = resolvedTenantId(req);
      auditFilter = tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {};
    }
    if (range.from || range.to) {
      const bounds: Record<string, Date> = {};
      if (range.from) bounds.$gte = range.from;
      if (range.to) bounds.$lte = range.to;
      auditFilter.timestamp = bounds;
    }
    const [auditEntries, byType, byStatus] = await Promise.all([
      AuditLogModel.countDocuments(auditFilter),
      AuditLogModel.aggregate([{ $match: auditFilter }, { $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      getErpModel('audits').aggregate([{ $match: { ...t, deletedAt: null, ...buildDateFilter('auditDate', range) } }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    return { auditLogEntries: auditEntries, auditLogByAction: toStatusCounts(byType), auditsByStatus: toStatusCounts(byStatus) };
  }

  async aggregate(req: FastifyRequest, type: string, range: DateRange): Promise<Record<string, unknown> | unknown[]> {
    switch (type) {
      case 'admissions':
        return this.admissions(req, range);
      case 'discharges':
        return this.discharges(req, range);
      case 'deaths':
        return this.deaths(req, range);
      case 'medical':
        return this.medical(req, range);
      case 'medicine':
        return this.medicine(req, range);
      case 'attendance':
        return this.attendance(req, range);
      case 'kitchen':
        return this.kitchen(req, range);
      case 'diet':
        return this.diet(req, range);
      case 'laundry':
        return this.laundry(req, range);
      case 'housekeeping':
        return this.housekeeping(req, range);
      case 'incidents':
        return this.incidents(req, range);
      case 'visitors':
        return this.visitors(req, range);
      case 'emergencies':
        return this.emergencies(req, range);
      case 'monthly':
        return this.monthly(req, range);
      case 'finance':
        return this.finance(req, range);
      case 'ledger':
        return this.ledger(req, range);
      case 'donations':
        return this.donations(req, range);
      case 'inventory':
        return this.inventory(req, range);
      case 'assets':
        return this.assets(req, range);
      case 'payroll':
        return this.payroll(req, range);
      case 'complaints':
        return this.complaints(req, range);
      case 'audits':
        return this.audits(req, range);
      default:
        throw new ForbiddenError(`unknown report: ${type}`);
    }
  }
}

export default ReportRepository;
