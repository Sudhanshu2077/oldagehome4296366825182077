const fakeConn = {
  readyState: 1,
  host: 'cluster0.example.net',
  name: 'old_age_home',
  on: jest.fn(),
  db: {
    admin: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue({ ok: 1 }),
    }),
  },
};

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('mongoose', () => {
  const actual = jest.requireActual<typeof import('mongoose')>('mongoose');
  return {
    ...actual,
    connect: mockConnect,
    disconnect: mockDisconnect,
    connection: fakeConn,
  } as unknown as typeof actual;
});

import { connectMongo, disconnectMongo, checkMongoHealth, getActiveConnection } from '../src/services/mongo.service';

describe('mongo.service', () => {
  beforeEach(() => {
    mockConnect.mockClear();
    mockDisconnect.mockClear();
    fakeConn.on.mockClear();
    fakeConn.db.admin().ping.mockReset();
    fakeConn.db.admin().ping.mockResolvedValue({ ok: 1 });
  });

  it('connects and exposes active connection', async () => {
    const conn = await connectMongo();
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(conn).toBe(fakeConn);
    expect(fakeConn.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(fakeConn.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(fakeConn.on).toHaveBeenCalledWith('reconnected', expect.any(Function));
  });

  it('returns same connection without reconnect when already connected', async () => {
    await connectMongo();
    await connectMongo();
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(getActiveConnection()).toBe(fakeConn);
  });

  it('reports healthy state when readyState is 1', async () => {
    const health = await checkMongoHealth();
    expect(health.ok).toBe(true);
    expect(health.readyState).toBe(1);
    expect(health.host).toBe('cluster0.example.net');
    expect(health.name).toBe('old_age_home');
  });

  it('reports degraded when connect fails and readyState is not 1', async () => {
    fakeConn.readyState = 0;
    mockConnect.mockRejectedValueOnce(new Error('boom'));
    const health = await checkMongoHealth();
    expect(health.ok).toBe(false);
    expect(health.readyState).toBe(0);
    fakeConn.readyState = 1;
    mockConnect.mockResolvedValueOnce(undefined);
  });

  it('disconnects cleanly and resets active connection', async () => {
    await connectMongo();
    await disconnectMongo();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(getActiveConnection()).toBeNull();
  });
});
