import type { FastifyInstance } from 'fastify';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { startMemoryServer, buildTestApp, closeTestApp, createInstitution } from './test-utils.js';

describe('portal', () => {
  let app: FastifyInstance;
  let server: MongoMemoryServer;
  let tenantId: string;

  beforeAll(async () => {
    server = await startMemoryServer();
    app = await buildTestApp();
    const institution = await createInstitution('Portal Test Home', 'PORTAL-TEST-001');
    tenantId = institution._id.toString();
  });

  afterAll(async () => {
    await closeTestApp(app, server);
  });

  it('GET /portal/institutions lists public institutions with pagination', async () => {
    const res = await app.inject({ method: 'GET', url: '/portal/institutions' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      success: boolean;
      data: Array<Record<string, unknown>>;
      pagination: { total: number; totalPages: number };
    };
    expect(body.success).toBe(true);
    expect(body.data).toEqual(expect.any(Array));
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
    expect(body.data.some((i) => (i.id as string) === tenantId)).toBe(true);
  });

  it('GET /portal/search requires at least two characters', async () => {
    const res = await app.inject({ method: 'GET', url: '/portal/search?q=a' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /portal/search returns matching institutions', async () => {
    const res = await app.inject({ method: 'GET', url: '/portal/search?q=Portal+Test' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { success: boolean; data: Array<Record<string, unknown>> };
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((i) => (i.id as string) === tenantId)).toBe(true);
  });

  it('POST /portal/complaints creates an anonymous complaint', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/portal/complaints',
      payload: {
        name: 'Test Citizen',
        tenantId,
        subject: 'Test complaint',
        message: 'This is a test complaint submitted through the public portal.',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload) as { success: boolean; data: { kind: string; name: string; tenantId: string | null } };
    expect(body.success).toBe(true);
    expect(body.data.kind).toBe('complaint');
    expect(body.data.name).toBe('Test Citizen');
    expect(body.data.tenantId).toBe(tenantId);
  });
});
