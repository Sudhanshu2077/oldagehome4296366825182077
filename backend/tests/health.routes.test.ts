import type { FastifyInstance } from 'fastify';

const mockCheckHealth = jest.fn();

jest.mock('../src/services/mongo.service', () => ({
  checkMongoHealth: mockCheckHealth,
}));

import { buildApp } from '../src/config/app';

describe('health route', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    mockCheckHealth.mockReset();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 ok shape when mongo is healthy', async () => {
    mockCheckHealth.mockResolvedValue({
      ok: true,
      readyState: 1,
      host: 'cluster0.example.net',
      name: 'old_age_home',
    });

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string; version: string; uptimeSeconds: number; mongo: { ok: boolean } };
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.mongo.ok).toBe(true);
  });

  it('returns 503 degraded when mongo is not ready', async () => {
    mockCheckHealth.mockResolvedValue({
      ok: false,
      readyState: 0,
      host: null,
      name: null,
    });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    const body = res.json() as { status: string; mongo: { ok: boolean } };
    expect(body.status).toBe('degraded');
    expect(body.mongo.ok).toBe(false);
  });

  it('sends helmet security headers', async () => {
    mockCheckHealth.mockResolvedValue({ ok: true, readyState: 1, host: 'h', name: 'n' });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects unknown route with 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
  });
});
