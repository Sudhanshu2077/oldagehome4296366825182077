import { model, Types, type Model, type Document } from 'mongoose';
import type { FastifyRequest } from 'fastify';
import { tenantFilter, resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../kernel/errors/app-error.js';

export interface DateRange {
  from?: Date | undefined;
  to?: Date | undefined;
}

function getErpModel(name: string): Model<Document> {
  return model<Document>(name.startsWith('Erp_') ? name : `Erp_${name}`);
}

function parseDate(v: unknown): Date | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${String(v)}`);
  return d;
}

function parseRange(query: Record<string, unknown>): DateRange {
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (from && to && from.getTime() > to.getTime()) {
    throw new ValidationError('from must be before or equal to to');
  }
  return { from, to };
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

function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

function asRecord(doc: unknown): Record<string, unknown> {
  return doc as Record<string, unknown>;
}

function num(value: unknown): number {
  return Number(value ?? 0);
}

function str(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

export class FinanceStatementsService {
  private assertTenant(req: FastifyRequest): string {
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError();
    if (su.tier === 'government') throw new ForbiddenError('finance statements are institution-scoped');
    const tenantId = resolvedTenantId(req);
    if (!tenantId) throw new ForbiddenError('tenant scope required');
    return tenantId;
  }

  private baseFilter(req: FastifyRequest): Record<string, unknown> {
    return tenantFilter<Document>(req, { deletedAt: null });
  }

  async trialBalance(req: FastifyRequest, query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tenantId = this.assertTenant(req);
    const range = parseRange(query);
    const accounts = getErpModel('accounts');
    const vouchers = getErpModel('vouchers');
    const filter = this.baseFilter(req);

    const [accountList, debitTotals, creditTotals] = await Promise.all([
      accounts.find(filter).select('code name type openingBalance').lean(),
      vouchers.aggregate([
        { $match: { ...filter, ...buildDateFilter('voucherDate', range), debitAccountCode: { $ne: null } } },
        { $group: { _id: '$debitAccountCode', total: { $sum: '$amount' } } },
      ]),
      vouchers.aggregate([
        { $match: { ...filter, ...buildDateFilter('voucherDate', range), creditAccountCode: { $ne: null } } },
        { $group: { _id: '$creditAccountCode', total: { $sum: '$amount' } } },
      ]),
    ]);

    const debitMap = new Map(debitTotals.map((r) => [String(asRecord(r)._id), num(asRecord(r).total)]));
    const creditMap = new Map(creditTotals.map((r) => [String(asRecord(r)._id), num(asRecord(r).total)]));

    const rows = accountList.map((acc) => {
      const record = asRecord(acc);
      const code = str(record.code);
      const type = str(record.type);
      const opening = num(record.openingBalance);
      const debit = debitMap.get(code) ?? 0;
      const credit = creditMap.get(code) ?? 0;
      const isCreditNormal = ['liability', 'income', 'equity'].includes(type);
      const closing = isCreditNormal ? opening - debit + credit : opening + debit - credit;
      return { code, name: str(record.name), type, opening, debit, credit, closing };
    });

    const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);

    return { tenantId, range, rows, totalDebit, totalCredit, difference: totalDebit - totalCredit };
  }

  async balanceSheet(req: FastifyRequest, query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tenantId = this.assertTenant(req);
    const range = parseRange(query);
    const trial = await this.trialBalance(req, query);
    const rows = (trial.rows ?? []) as Array<{ code: string; name: string; type: string; opening: number; debit: number; credit: number; closing: number }>;

    const assets = rows.filter((r) => r.type === 'asset');
    const liabilities = rows.filter((r) => r.type === 'liability');
    const equity = rows.filter((r) => r.type === 'equity');

    const incomeStatement = await this.incomeStatement(req, query);
    const netIncome = num(incomeStatement.netIncome);

    const totalAssets = assets.reduce((sum, r) => sum + r.closing, 0);
    const totalLiabilities = liabilities.reduce((sum, r) => sum + r.closing, 0);
    const totalEquity = equity.reduce((sum, r) => sum + r.closing, 0) + netIncome;

    return {
      tenantId,
      range,
      assets,
      liabilities,
      equity,
      netIncome,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    };
  }

  async incomeStatement(req: FastifyRequest, query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tenantId = this.assertTenant(req);
    const range = parseRange(query);
    const incomes = getErpModel('incomes');
    const expenses = getErpModel('expenses');
    const filter = this.baseFilter(req);

    const [incomeRows, expenseRows, incomeBySource, expenseByCategory] = await Promise.all([
      incomes.find({ ...filter, ...buildDateFilter('date', range) }).select('date source amount').lean(),
      expenses.find({ ...filter, ...buildDateFilter('date', range) }).select('date category amount').lean(),
      incomes.aggregate([
        { $match: { ...filter, ...buildDateFilter('date', range) } },
        { $group: { _id: '$source', total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      expenses.aggregate([
        { $match: { ...filter, ...buildDateFilter('date', range) } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totalIncome = incomeRows.reduce((sum, r) => sum + num(asRecord(r).amount), 0);
    const totalExpense = expenseRows.reduce((sum, r) => sum + num(asRecord(r).amount), 0);

    return {
      tenantId,
      range,
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      incomeCount: incomeRows.length,
      expenseCount: expenseRows.length,
      incomeBySource: incomeBySource.map((r) => ({ source: str(asRecord(r)._id), total: num(asRecord(r).total) })),
      expenseByCategory: expenseByCategory.map((r) => ({ category: str(asRecord(r)._id), total: num(asRecord(r).total) })),
    };
  }

  async cashFlow(req: FastifyRequest, query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tenantId = this.assertTenant(req);
    const range = parseRange(query);
    const cash = getErpModel('cash-book');
    const bank = getErpModel('bank-transactions');
    const vouchers = getErpModel('vouchers');
    const accounts = getErpModel('accounts');
    const filter = this.baseFilter(req);

    const [cashReceipts, cashPayments, bankDeposits, bankWithdrawals, accountList] = await Promise.all([
      cash.aggregate([{ $match: { ...filter, type: 'receipt', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      cash.aggregate([{ $match: { ...filter, type: 'payment', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      bank.aggregate([{ $match: { ...filter, type: 'deposit', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      bank.aggregate([{ $match: { ...filter, type: 'withdrawal', ...buildDateFilter('date', range) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      accounts.find({ ...filter, type: { $in: ['asset', 'liability', 'equity'] } }).select('code type').lean(),
    ]);

    const assetCodes = new Set(accountList.filter((a) => asRecord(a).type === 'asset').map((a) => str(asRecord(a).code)));
    const liabilityCodes = new Set(accountList.filter((a) => asRecord(a).type === 'liability').map((a) => str(asRecord(a).code)));
    const equityCodes = new Set(accountList.filter((a) => asRecord(a).type === 'equity').map((a) => str(asRecord(a).code)));

    const codeMatch = (codes: Set<string>) => ({ $or: [{ debitAccountCode: { $in: [...codes] } }, { creditAccountCode: { $in: [...codes] } }] });

    const [investing, financing] = await Promise.all([
      vouchers.aggregate([{ $match: { ...filter, ...buildDateFilter('voucherDate', range), ...codeMatch(assetCodes) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      vouchers.aggregate([{ $match: { ...filter, ...buildDateFilter('voucherDate', range), ...codeMatch(new Set([...liabilityCodes, ...equityCodes])) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const operatingInflows = num(cashReceipts[0]?.total) + num(bankDeposits[0]?.total);
    const operatingOutflows = num(cashPayments[0]?.total) + num(bankWithdrawals[0]?.total);
    const operating = operatingInflows - operatingOutflows;
    const investingFlow = num(investing[0]?.total);
    const financingFlow = num(financing[0]?.total);

    return {
      tenantId,
      range,
      operating: { inflows: operatingInflows, outflows: operatingOutflows, net: operating },
      investing: { net: investingFlow },
      financing: { net: financingFlow },
      netCashFlow: operating + investingFlow + financingFlow,
    };
  }

  async bankReconciliation(req: FastifyRequest, query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const tenantId = this.assertTenant(req);
    const bank = getErpModel('bank-transactions');
    const filter = { ...this.baseFilter(req), reconciled: { $ne: true } };
    const bankName = query.bankName ? String(query.bankName) : undefined;
    if (bankName) Object.assign(filter, { bankName });

    const rows = await bank.find(filter).sort({ date: -1 }).lean();
    return {
      tenantId,
      unreconciledCount: rows.length,
      unreconciledAmount: rows.reduce((sum, r) => sum + num(asRecord(r).amount), 0),
      rows: rows.map((r) => ({ ...asRecord(r), id: String(asRecord(r)._id) })),
    };
  }

  async reconcile(req: FastifyRequest, id: string): Promise<Record<string, unknown>> {
    const tenantId = this.assertTenant(req);
    const bank = getErpModel('bank-transactions');
    const doc = await bank.findOneAndUpdate(
      { _id: toObjectId(id), tenantId: toObjectId(tenantId), deletedAt: null },
      { $set: { reconciled: true, updatedBy: req.sessionUser!.userId } },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) throw new NotFoundError('bank transaction not found');
    return { id, reconciled: true };
  }
}

export default FinanceStatementsService;
