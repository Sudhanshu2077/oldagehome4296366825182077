import { getLogger } from '../config/logger.js';

interface Attempt {
  failures: number;
  lockedUntil: number | null;
}

const store = new Map<string, Attempt>();

export interface LockoutCheck {
  locked: boolean;
  remainingMs: number;
}

export function checkLockout(key: string): LockoutCheck {
  const now = Date.now();
  const record = store.get(key);
  if (!record || !record.lockedUntil || record.lockedUntil <= now) {
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: record.lockedUntil - now };
}

export function recordFailure(key: string, opts?: { maxAttempts?: number; lockMs?: number }): LockoutCheck {
  const maxAttempts = opts?.maxAttempts ?? 5;
  const lockMs = opts?.lockMs ?? 15 * 60 * 1000;
  const now = Date.now();
  const record = store.get(key) ?? { failures: 0, lockedUntil: null };
  record.failures += 1;
  if (record.failures >= maxAttempts) {
    record.lockedUntil = now + lockMs;
    getLogger().warn({ key, failures: record.failures, lockMs }, 'brute-force lockout engaged');
  }
  store.set(key, record);
  if (record.lockedUntil && record.lockedUntil > now) {
    return { locked: true, remainingMs: record.lockedUntil - now };
  }
  return { locked: false, remainingMs: 0 };
}

export function clearLockout(key: string): void {
  store.delete(key);
}

export function resetLockoutForTests(): void {
  store.clear();
}

export function lockoutStatsForTests(key: string): Attempt | undefined {
  return store.get(key);
}
