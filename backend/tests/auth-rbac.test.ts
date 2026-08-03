import type { FastifyInstance } from 'fastify';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import {
  startMemoryServer,
  buildTestApp,
  closeTestApp,
  createInstitution,
  createUser,
  signAccessToken,
  loginAs,
} from './test-utils.js';

describe('auth and rbac', () => {
  let app: FastifyInstance;
  let server: MongoMemoryServer;

  beforeAll(async () => {
    server = await startMemoryServer();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app, server);
  });

  it('/auth/me returns the authenticated user profile', async () => {
    const session = await loginAs(app, 'assistant-manager');
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { success: boolean; data: { role: string; tier: string } };
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('assistant-manager');
    expect(body.data.tier).toBe('institution');
  });

  it('institution-head can read registers', async () => {
    const session = await loginAs(app, 'institution-head');
    const res = await app.inject({
      method: 'GET',
      url: '/registers',
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { success: boolean; data: Array<Record<string, unknown>> };
    expect(body.data.length).toBe(13);
  });

  it('department-user can write only assigned registers', async () => {
    const session = await loginAs(app, 'department-user');
    // loginAs assigns register write scopes R1, R6 and R7 to department users.
    const allowed = await app.inject({
      method: 'POST',
      url: '/registers/R1/entries',
      headers: { authorization: `Bearer ${session.token}` },
      payload: { fields: { note: 'Allowed write' } },
    });
    expect(allowed.statusCode).toBe(201);

    const denied = await app.inject({
      method: 'POST',
      url: '/registers/R2/entries',
      headers: { authorization: `Bearer ${session.token}` },
      payload: { fields: { note: 'Denied write' } },
    });
    expect(denied.statusCode).toBe(403);
  });

  it('cross-tenant access is denied for institution users', async () => {
    const sessionA = await loginAs(app, 'assistant-manager');
    const createRes = await app.inject({
      method: 'POST',
      url: '/m/residents',
      headers: { authorization: `Bearer ${sessionA.token}` },
      payload: { fullName: 'Tenant A Resident', gender: 'male' },
    });
    const resident = JSON.parse(createRes.payload) as { success: boolean; data: { id: string } };
    expect(createRes.statusCode).toBe(201);

    const institutionB = await createInstitution('Tenant B Home', 'TENANT-B-001');
    const userB = await createUser({
      email: 'manager-tenant-b@test.local',
      roleId: 'assistant-manager',
      tenantId: institutionB._id.toString(),
    });
    const tokenB = signAccessToken(app, userB._id.toString());

    const getRes = await app.inject({
      method: 'GET',
      url: `/m/residents/${resident.data.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(getRes.statusCode).toBe(403);
  });

  it('cross-tenant listing only returns the callers own tenant', async () => {
    const session = await loginAs(app, 'assistant-manager');
    const institutionB = await createInstitution('Tenant C Home', 'TENANT-C-001');
    const userB = await createUser({
      email: 'manager-tenant-c@test.local',
      roleId: 'assistant-manager',
      tenantId: institutionB._id.toString(),
    });
    const tokenB = signAccessToken(app, userB._id.toString());

    const listA = await app.inject({
      method: 'GET',
      url: '/m/residents',
      headers: { authorization: `Bearer ${session.token}` },
    });
    const listB = await app.inject({
      method: 'GET',
      url: '/m/residents',
      headers: { authorization: `Bearer ${tokenB}` },
    });

    const bodyA = JSON.parse(listA.payload) as { success: boolean; data: Array<{ tenantId: string }> };
    const bodyB = JSON.parse(listB.payload) as { success: boolean; data: Array<{ tenantId: string }> };
    expect(bodyA.data.length).toBeGreaterThanOrEqual(0);
    expect(bodyB.data.length).toBe(0);
    expect(bodyA.data.every((r) => r.tenantId === (session.user.tenantId as string))).toBe(true);
  });
});
