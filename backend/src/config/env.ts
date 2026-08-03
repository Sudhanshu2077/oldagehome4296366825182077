import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer, got: ${raw}`);
  }
  return parsed;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  clientOrigin: string;
  mongoUri: string;
  firebaseServiceAccountPath: string;
  recaptchaSecretKey: string;
  otpProvider: 'firebase' | 'smtp';
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  otpTtlMinutes: number;
  sessionSigningKey: string;
  sessionTtlMinutes: number;
  rateLimitWindowMinutes: number;
  rateLimitMax: number;
  authRateLimitWindowMinutes: number;
  authRateLimitMax: number;
  refreshTokenTtlDays: number;
  bruteForceMaxAttempts: number;
  bruteForceLockMs: number;
  openRouterApiKey: string;
}

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  const otpProviderRaw = optional('OTP_PROVIDER', 'firebase');
  if (otpProviderRaw !== 'firebase' && otpProviderRaw !== 'smtp') {
    throw new Error(`OTP_PROVIDER must be 'firebase' or 'smtp', got: ${otpProviderRaw}`);
  }

  cached = {
    port: intEnv('PORT', 4000),
    nodeEnv: optional('NODE_ENV', 'development'),
    clientOrigin: optional('CLIENT_ORIGIN', 'http://localhost:8081'),
    mongoUri: required('MONGODB_URI'),
    firebaseServiceAccountPath: optional('FIREBASE_SERVICE_ACCOUNT_PATH', './serviceAccountKey.json'),
    recaptchaSecretKey: optional('RECAPTCHA_SECRET_KEY', ''),
    otpProvider: otpProviderRaw,
    smtpHost: optional('SMTP_HOST', ''),
    smtpPort: optional('SMTP_PORT', ''),
    smtpUser: optional('SMTP_USER', ''),
    smtpPass: optional('SMTP_PASS', ''),
    otpTtlMinutes: intEnv('OTP_TTL_MINUTES', 10),
    sessionSigningKey: optional('SESSION_SIGNING_KEY', ''),
    sessionTtlMinutes: intEnv('SESSION_TTL_MINUTES', 60),
    rateLimitWindowMinutes: intEnv('RATE_LIMIT_WINDOW_MINUTES', 15),
    rateLimitMax: intEnv('RATE_LIMIT_MAX', 50),
    authRateLimitWindowMinutes: intEnv('AUTH_RATE_LIMIT_WINDOW_MINUTES', 15),
    authRateLimitMax: intEnv('AUTH_RATE_LIMIT_MAX', 10),
    refreshTokenTtlDays: intEnv('REFRESH_TOKEN_TTL_DAYS', 30),
    bruteForceMaxAttempts: intEnv('BRUTE_FORCE_MAX_ATTEMPTS', 5),
    bruteForceLockMs: intEnv('BRUTE_FORCE_LOCK_MS', 15 * 60 * 1000),
    openRouterApiKey: optional('OPENROUTER_API_KEY', ''),
  };

  return cached;
}

export function resetConfigForTests(): void {
  cached = null;
}
