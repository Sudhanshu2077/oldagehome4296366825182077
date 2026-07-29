import type { FastifyInstance } from 'fastify';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { startMemoryServer, buildTestApp, closeTestApp, loginAs } from './test-utils.js';

describe('reports', () => {
  let app: FastifyInstance;
  let server: MongoMemoryServer;
  let token: string;

  beforeAll(async () => {
    server = await startMemoryServer();
    app = await buildTestApp();
    const session = await loginAs(app, 'assistant-manager');
    token = session.token;
  });

  afterAll(async () => {
    await closeTestApp(app, server);
  });

  it('GET /reports/admissions returns an aggregation', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/reports/admissions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('total');
    expect(body.data).toHaveProperty('byStatus');
    expect(body.data).toHaveProperty('byPriority');
  });

  it('GET /reports/finance returns cash, bank, income and expense totals', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/reports/finance',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('cashReceipts');
    expect(body.data).toHaveProperty('cashPayments');
    expect(body.data).toHaveProperty('bankDeposits');
    expect(body.data).toHaveProperty('bankWithdrawals');
    expect(body.data).toHaveProperty('totalIncome');
    expect(body.data).toHaveProperty('totalExpense');
  });

  it('GET /reports/inventory returns item and movement aggregates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/reports/inventory',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('totalMoves');
    expect(body.data).toHaveProperty('stockIn');
    expect(body.data).toHaveProperty('stockOut');
    expect(body.data).toHaveProperty('lowStock');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await app.inject({ method: 'GET', url: '/reports/admissions' });
    expect(res.statusCode).toBe(401);
  });

  it('returns CSV when format=csv is requested', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/reports/admissions?format=csv',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['content-type'] ?? '')).toContain('text/csv');
    expect(res.payload).toContain('total');
  });
});
