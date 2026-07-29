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

describe('governance', () => {
  let app: FastifyInstance;
  let server: MongoMemoryServer;
  let govToken: string;
  let mgrToken: string;
  let sameTenantMgrToken: string;
  let tenantId: string;

  beforeAll(async () => {
    server = await startMemoryServer();
    app = await buildTestApp();

    const institution = await createInstitution('Governance Test Home', 'GOV-TEST-001');
    tenantId = institution._id.toString();

    const govUser = await createUser({
      email: 'gov@test.local',
      roleId: 'gov-super-admin',
      tenantId: null,
      jurisdiction: { level: 'all' },
    });
    govToken = signAccessToken(app, govUser._id.toString());

    const mgrSession = await loginAs(app, 'assistant-manager');
    mgrToken = mgrSession.token;

    const sameTenantMgr = await createUser({
      email: 'mgr-same-tenant@test.local',
      roleId: 'assistant-manager',
      tenantId,
      grantedPermissions: ['register:read:*', 'register:write:*', 'inquiry:read:*', 'inquiry:write:*'],
    });
    sameTenantMgrToken = signAccessToken(app, sameTenantMgr._id.toString());
  });

  afterAll(async () => {
    await closeTestApp(app, server);
  });

  it('GET /gov/dashboard returns government-tier metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/gov/dashboard',
      headers: { authorization: `Bearer ${govToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('institutions');
    expect(body.data).toHaveProperty('residents');
    expect(body.data).toHaveProperty('scope');
  });

  it('institution-tier user cannot access /gov/dashboard', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/gov/dashboard',
      headers: { authorization: `Bearer ${mgrToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('/gov/approvals: institution submits, government lists and decides', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/gov/approvals',
      headers: { authorization: `Bearer ${mgrToken}` },
      payload: { requestType: 'budget', summary: 'Approve annual budget' },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload) as { success: boolean; data: { id: string } };
    expect(created.success).toBe(true);
    expect(created.data.id).toBeDefined();

    const listRes = await app.inject({
      method: 'GET',
      url: '/gov/approvals',
      headers: { authorization: `Bearer ${govToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload) as { success: boolean; data: Array<{ id: string }> };
    expect(listBody.data.some((a) => a.id === created.data.id)).toBe(true);

    const decideRes = await app.inject({
      method: 'POST',
      url: `/gov/approvals/${created.data.id}/decide`,
      headers: { authorization: `Bearer ${govToken}` },
      payload: { decision: 'approved', decisionNotes: 'Approved from tests' },
    });
    expect(decideRes.statusCode).toBe(200);
    const decided = JSON.parse(decideRes.payload) as { success: boolean; data: { status: string } };
    expect(decided.data.status).toBe('approved');
  });

  it('/gov/inspections: government creates and institution can read', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/gov/inspections',
      headers: { authorization: `Bearer ${govToken}` },
      payload: { tenantId, scheduledDate: new Date().toISOString(), inspectorName: 'Test Inspector' },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload) as { success: boolean; data: { id: string } };
    expect(created.data.id).toBeDefined();

    const listRes = await app.inject({
      method: 'GET',
      url: '/gov/inspections',
      headers: { authorization: `Bearer ${govToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload) as { success: boolean; data: Array<{ id: string }> };
    expect(listBody.data.some((i) => i.id === created.data.id)).toBe(true);

    const getRes = await app.inject({
      method: 'GET',
      url: `/gov/inspections/${created.data.id}`,
      headers: { authorization: `Bearer ${sameTenantMgrToken}` },
    });
    expect(getRes.statusCode).toBe(200);

    const crossTenantRes = await app.inject({
      method: 'GET',
      url: `/gov/inspections/${created.data.id}`,
      headers: { authorization: `Bearer ${mgrToken}` },
    });
    expect(crossTenantRes.statusCode).toBe(403);
  });
});
