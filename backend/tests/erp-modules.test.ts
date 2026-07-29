import type { FastifyInstance } from 'fastify';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { startMemoryServer, buildTestApp, closeTestApp, loginAs } from './test-utils.js';

describe('erp modules', () => {
  let app: FastifyInstance;
  let server: MongoMemoryServer;
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    server = await startMemoryServer();
    app = await buildTestApp();
    const session = await loginAs(app, 'assistant-manager');
    token = session.token;
    tenantId = session.user.tenantId as string;
  });

  afterAll(async () => {
    await closeTestApp(app, server);
  });

  it('/m/residents supports create, list, get, patch and delete', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/m/residents',
      headers: { authorization: `Bearer ${token}` },
      payload: { fullName: 'Test Resident', gender: 'male', status: 'active' },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload) as { success: boolean; data: { id: string } };
    expect(created.success).toBe(true);
    expect(created.data.id).toBeDefined();

    const listRes = await app.inject({
      method: 'GET',
      url: '/m/residents',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload) as {
      success: boolean;
      data: Array<{ id: string; fullName: string }>;
      pagination: { total: number };
    };
    expect(listBody.pagination.total).toBeGreaterThanOrEqual(1);
    expect(listBody.data.some((r) => r.id === created.data.id)).toBe(true);

    const getRes = await app.inject({
      method: 'GET',
      url: `/m/residents/${created.data.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.payload) as { success: boolean; data: { id: string; fullName: string } };
    expect(getBody.data.id).toBe(created.data.id);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/m/residents/${created.data.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { fullName: 'Updated Resident' },
    });
    expect(patchRes.statusCode).toBe(200);
    const patchBody = JSON.parse(patchRes.payload) as { success: boolean; data: { fullName: string } };
    expect(patchBody.data.fullName).toBe('Updated Resident');

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/m/residents/${created.data.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(204);
  });

  it('/m/vouchers supports create and workflow transition', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/m/vouchers',
      headers: { authorization: `Bearer ${token}` },
      payload: { voucherType: 'payment', voucherDate: new Date().toISOString(), amount: 1000 },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload) as { success: boolean; data: { id: string } };
    expect(created.data.id).toBeDefined();

    const transitionRes = await app.inject({
      method: 'POST',
      url: `/m/vouchers/${created.data.id}/transition`,
      headers: { authorization: `Bearer ${token}` },
      payload: { to: 'submitted' },
    });
    expect(transitionRes.statusCode).toBe(200);
    const transitionBody = JSON.parse(transitionRes.payload) as { success: boolean; data: { status: string } };
    expect(transitionBody.data.status).toBe('submitted');
  });

  it('rejects writes from unauthenticated callers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/m/residents',
      payload: { fullName: 'Unauthenticated Resident', gender: 'male' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('tenant filter scopes lists to the current institution', async () => {
    await app.inject({
      method: 'POST',
      url: '/m/residents',
      headers: { authorization: `Bearer ${token}` },
      payload: { fullName: 'Tenant Resident', gender: 'male' },
    });

    const listRes = await app.inject({
      method: 'GET',
      url: '/m/residents',
      headers: { authorization: `Bearer ${token}` },
    });
    const listBody = JSON.parse(listRes.payload) as {
      success: boolean;
      data: Array<{ tenantId: string }>;
    };
    expect(listBody.data.every((r) => r.tenantId === tenantId)).toBe(true);
  });
});
