import type { FastifyInstance, FastifyRequest } from 'fastify';
import FinanceStatementsService from '../service/finance-statements.service.js';
import { ok } from '../../../kernel/response/api-response.js';

export class FinanceStatementsController {
  constructor(private readonly service: FinanceStatementsService = new FinanceStatementsService()) {}

  register(app: FastifyInstance): void {
    const readGuard = [app.authenticate, app.requireTenantRead];
    const writeGuard = [app.authenticate, app.requireTenantScope];

    app.get<{ Querystring: Record<string, unknown> }>('/finance-statements/trial-balance', { preHandler: readGuard }, async (req, reply) => {
      const result = await this.service.trialBalance(req, req.query);
      await app.auditHook(req, 'view', 'finance-statement:trial-balance', '');
      reply.send(ok(result));
    });

    app.get<{ Querystring: Record<string, unknown> }>('/finance-statements/balance-sheet', { preHandler: readGuard }, async (req, reply) => {
      const result = await this.service.balanceSheet(req, req.query);
      await app.auditHook(req, 'view', 'finance-statement:balance-sheet', '');
      reply.send(ok(result));
    });

    app.get<{ Querystring: Record<string, unknown> }>('/finance-statements/income-statement', { preHandler: readGuard }, async (req, reply) => {
      const result = await this.service.incomeStatement(req, req.query);
      await app.auditHook(req, 'view', 'finance-statement:income-statement', '');
      reply.send(ok(result));
    });

    app.get<{ Querystring: Record<string, unknown> }>('/finance-statements/cash-flow', { preHandler: readGuard }, async (req, reply) => {
      const result = await this.service.cashFlow(req, req.query);
      await app.auditHook(req, 'view', 'finance-statement:cash-flow', '');
      reply.send(ok(result));
    });

    app.get<{ Querystring: Record<string, unknown> }>('/finance-statements/bank-reconciliation', { preHandler: readGuard }, async (req, reply) => {
      const result = await this.service.bankReconciliation(req, req.query);
      await app.auditHook(req, 'view', 'finance-statement:bank-reconciliation', '');
      reply.send(ok(result));
    });

    app.post<{ Params: { id: string } }>('/finance-statements/bank-reconciliation/:id/reconcile', { preHandler: writeGuard }, async (req, reply) => {
      const result = await this.service.reconcile(req, req.params.id);
      await app.auditHook(req, 'reconcile', 'finance-statement:bank-reconciliation', req.params.id);
      reply.send(ok(result));
    });
  }
}

export default FinanceStatementsController;
