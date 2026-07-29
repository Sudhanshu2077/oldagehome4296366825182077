import { loadConfig, resetConfigForTests } from '../src/config/env';

describe('config/env', () => {
  beforeEach(() => resetConfigForTests());

  it('loads required MONGODB_URI from env', () => {
    const cfg = loadConfig();
    expect(cfg.mongoUri).toBe('mongodb://localhost:27017/old_age_home_test');
    expect(cfg.port).toBe(4000);
    expect(cfg.clientOrigin).toBe('http://localhost:8081');
  });

  it('coerces integer env vars to positive numbers', () => {
    process.env.PORT = '5005';
    process.env.OTP_TTL_MINUTES = '20';
    resetConfigForTests();
    const cfg = loadConfig();
    expect(cfg.port).toBe(5005);
    expect(cfg.otpTtlMinutes).toBe(20);
    delete process.env.PORT;
    delete process.env.OTP_TTL_MINUTES;
  });

  it('throws on non-positive integer env var', () => {
    process.env.PORT = 'not-an-int';
    resetConfigForTests();
    expect(() => loadConfig()).toThrow(/positive integer/);
    delete process.env.PORT;
  });

  it('throws on missing required MONGODB_URI', () => {
    const original = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    resetConfigForTests();
    expect(() => loadConfig()).toThrow(/MONGODB_URI/);
    process.env.MONGODB_URI = original;
  });

  it('rejects invalid OTP_PROVIDER value', () => {
    process.env.OTP_PROVIDER = 'pigeon';
    resetConfigForTests();
    expect(() => loadConfig()).toThrow(/OTP_PROVIDER/);
    delete process.env.OTP_PROVIDER;
  });

  it('returns cached config on subsequent calls', () => {
    const first = loadConfig();
    const second = loadConfig();
    expect(second).toBe(first);
  });
});
