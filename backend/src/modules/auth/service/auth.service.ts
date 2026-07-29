import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { loadConfig } from '../../../config/env.js';
import { verifyIdTokenSafe } from '../../../services/firebase.service.js';
import {
  ForbiddenError,
  LockoutError,
  UnauthorizedError,
  InternalError,
} from '../../../kernel/errors/app-error.js';
import { recordFailure, checkLockout, clearLockout } from '../../../services/lockout.service.js';
import { SessionModel } from '../entity/session.entity.js';
import UserRepository from '../../user/repository/user.repository.js';
import { tierOfRole } from '../../../kernel/types/rbac.js';
import type { SessionUser } from '../../../kernel/types/session.js';

export interface SessionUserProfile {
  userId: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  role: string;
  tier: string;
  tenantId: string | null;
  department: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  user: SessionUserProfile;
}

export class AuthService {
  constructor(private readonly userRepo: UserRepository = new UserRepository()) {}

  async login(app: FastifyInstance, req: FastifyRequest, idToken: string, deviceId: string, rememberDevice: boolean): Promise<LoginResult> {
    const cfg = loadConfig();
    if (!cfg.sessionSigningKey) throw new InternalError('server misconfigured: SESSION_SIGNING_KEY missing');

    const lockoutKey = `login:${req.ip}`;
    const lock = checkLockout(lockoutKey);
    if (lock.locked) throw new LockoutError(`locked; retry in ${Math.ceil(lock.remainingMs / 1000)}s`);

    const verification = await verifyIdTokenSafe(idToken);
    if (!verification.ok) {
      if (verification.reason === 'disabled') throw new InternalError('identity provider not configured');
      const fail = recordFailure(lockoutKey, { maxAttempts: cfg.bruteForceMaxAttempts, lockMs: cfg.bruteForceLockMs });
      if (fail.locked) throw new LockoutError('too many failed attempts; locked');
      throw new UnauthorizedError('invalid or expired Firebase token');
    }

    const stored = await this.userRepo.findByFirebaseUid(verification.token.uid);
    if (!stored) {
      clearLockout(lockoutKey);
      throw new UnauthorizedError('user not registered — complete onboarding first');
    }

    clearLockout(lockoutKey);
    return this.issueSessionForUser(app, req, stored.userId, deviceId, rememberDevice);
  }

  async issueSessionForUser(app: FastifyInstance, req: FastifyRequest, userId: string, deviceId: string, rememberDevice: boolean): Promise<LoginResult> {
    const cfg = loadConfig();
    if (!cfg.sessionSigningKey) throw new InternalError('server misconfigured: SESSION_SIGNING_KEY missing');

    const stored = await this.userRepo.findById(userId);
    if (!stored || !stored.isActive) throw new UnauthorizedError('user not found or inactive');

    await this.userRepo.recordLogin(userId, req.ip, deviceId);

    const accessExp = `${cfg.sessionTtlMinutes}m`;
    const refreshExp = `${cfg.refreshTokenTtlDays}d`;
    const payload = { sub: stored.id, fuid: stored.firebaseUid, role: stored.roleId, tenantId: stored.tenantId };
    const accessToken = app.jwt.sign({ ...payload, type: 'access' }, { expiresIn: accessExp });
    const refreshToken = app.jwt.sign({ ...payload, type: 'refresh', did: deviceId }, { expiresIn: refreshExp });

    await SessionModel.create({
      userId: stored.id,
      firebaseUid: stored.firebaseUid,
      tenantId: stored.tenantId,
      deviceId,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? '',
      ip: req.ip,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + cfg.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
      rememberDevice,
    });

    return {
      accessToken,
      refreshToken,
      expiresInSec: cfg.sessionTtlMinutes * 60,
      user: await this.profileOf(stored.id),
    };
  }

  async refresh(app: FastifyInstance, req: FastifyRequest, refreshToken: string, deviceId: string): Promise<LoginResult> {
    const cfg = loadConfig();
    let claims: { sub: string; type: string; did?: string };
    try {
      claims = app.jwt.verify<{ sub: string; type: string; did?: string }>(refreshToken);
    } catch {
      throw new UnauthorizedError('refresh token invalid');
    }
    if (claims.type !== 'refresh') throw new UnauthorizedError('not a refresh token');

    const sessions = await SessionModel.find({ userId: claims.sub, revokedAt: null }).sort({ createdAt: -1 }).limit(5);
    const match = sessions.find((s) => safeEqual(s.refreshTokenHash, hashToken(refreshToken)));
    if (!match) throw new UnauthorizedError('session not found or revoked');
    if (match.expiresAt.getTime() < Date.now()) throw new UnauthorizedError('session expired');
    if (match.deviceId && deviceId && match.deviceId !== deviceId) throw new ForbiddenError('device mismatch');

    const stored = await this.userRepo.findById(claims.sub);
    if (!stored || !stored.isActive) throw new UnauthorizedError('user inactive');

    const accessToken = app.jwt.sign(
      { sub: stored.id, fuid: stored.firebaseUid, role: stored.roleId, tenantId: stored.tenantId, type: 'access' },
      { expiresIn: `${cfg.sessionTtlMinutes}m` },
    );

    return {
      accessToken,
      refreshToken,
      expiresInSec: cfg.sessionTtlMinutes * 60,
      user: await this.profileOf(stored.id),
    };
  }

  async logout(refreshToken: string | null, userId: string | null): Promise<void> {
    if (!refreshToken || !userId) return;
    const sessions = await SessionModel.find({ userId, revokedAt: null });
    for (const s of sessions) {
      if (safeEqual(s.refreshTokenHash, hashToken(refreshToken))) {
        await SessionModel.findByIdAndUpdate(s._id, { $set: { revokedAt: new Date(), revokedReason: 'logout' } });
      }
    }
  }

  async profileOf(userId: string): Promise<SessionUserProfile> {
    const row = await this.userRepo.findById(userId);
    if (!row) throw new UnauthorizedError('user not found');
    return {
      userId: row.id,
      firebaseUid: row.firebaseUid,
      email: row.email,
      displayName: row.displayName,
      photoUrl: row.photoUrl,
      role: row.roleId,
      tier: tierOfRole(row.roleId),
      tenantId: row.tenantId,
      department: row.departmentCode,
    };
  }

  profileFromSession(user: SessionUser): SessionUserProfile {
    return {
      userId: user.userId,
      firebaseUid: user.firebaseUid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoUrl: user.photoUrl ?? '',
      role: user.role,
      tier: user.tier,
      tenantId: user.tenantId,
      department: user.department,
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export default AuthService;
