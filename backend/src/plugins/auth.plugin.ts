import type { FastifyInstance, FastifyReply, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { verifyIdTokenSafe } from '../services/firebase.service.js';
import {
  AuthUnavailableError,
  ForbiddenError,
  UnauthorizedError,
  InternalError,
} from '../kernel/errors/app-error.js';
import type { SessionUser, SessionUserStore, ResolvedStoredUser } from '../kernel/types/session.js';
import { tierOfRole } from '../kernel/types/rbac.js';
import { permissionKeyToString, type PermissionKey } from '../kernel/types/permission.js';
import { getLogger } from '../config/logger.js';
import UserRepository from '../modules/user/repository/user.repository.js';

const noopStore: SessionUserStore = {
  async findByFirebaseUid(): Promise<ResolvedStoredUser | null> {
    return null;
  },
};

const userRepo = new UserRepository();

function sendError(req: FastifyRequest, reply: FastifyReply, err: { statusCode: number; code: string; message: string }): void {
  void reply.code(err.statusCode).send({ error: err.code, message: err.message, requestId: req.id });
}

function resolveDeviceId(req: FastifyRequest): string {
  const header = req.headers['x-device-id'];
  if (Array.isArray(header) && header.length > 0) return header[0] ?? 'unknown';
  if (typeof header === 'string' && header.length > 0) return header;
  return 'unknown';
}

function buildSessionUser(
  stored: ResolvedStoredUser,
  decoded: {
    uid: string;
    email?: string | undefined;
    emailVerified?: boolean | undefined;
    name?: string | undefined;
    picture?: string | undefined;
    signInProvider?: string | undefined;
  },
  deviceId: string,
): SessionUser {
  return {
    userId: stored.userId,
    firebaseUid: stored.firebaseUid,
    email: decoded.email,
    emailVerified: decoded.emailVerified ?? false,
    displayName: decoded.name,
    photoUrl: decoded.picture,
    signInProvider: decoded.signInProvider,
    role: stored.role,
    tier: tierOfRole(stored.role),
    tenantId: stored.tenantId,
    department: stored.department,
    jurisdiction: stored.jurisdiction,
    grantedPermissions: stored.grantedPermissions,
    registerWriteScopes: stored.registerWriteScopes,
    decodedToken: decoded as unknown as SessionUser['decodedToken'],
    sessionDeviceId: deviceId,
  };
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const logger = getLogger();
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    sendError(req, reply, new UnauthorizedError('missing or malformed Authorization header'));
    return;
  }
  const token = header.slice(7).trim();
  if (token.length === 0) {
    sendError(req, reply, new UnauthorizedError('empty bearer token'));
    return;
  }

  const sessionClaims = tryVerifySessionJwt(req, token);
  if (sessionClaims) {
    const stored = await userRepo.findById(sessionClaims.sub);
    if (!stored || !stored.isActive) {
      sendError(req, reply, new UnauthorizedError('session user not found or inactive'));
      return;
    }
    req.sessionUser = buildSessionUser(
      {
        userId: stored.id,
        firebaseUid: stored.firebaseUid,
        role: stored.roleId,
        tenantId: stored.tenantId,
        department: stored.departmentCode,
        jurisdiction: stored.jurisdiction,
        grantedPermissions: stored.grantedPermissions,
        registerWriteScopes: stored.registerWriteScopes,
      },
      { uid: stored.firebaseUid, email: stored.email, emailVerified: stored.emailVerified, name: stored.displayName, picture: stored.photoUrl },
      resolveDeviceId(req),
    );
    return;
  }

  const result = await verifyIdTokenSafe(token);
  if (!result.ok) {
    if (result.reason === 'disabled') {
      sendError(req, reply, new AuthUnavailableError('identity provider not configured'));
      return;
    }
    sendError(req, reply, new UnauthorizedError('invalid or expired token'));
    return;
  }

  const decoded = result.token;
  const store: SessionUserStore = req.server.sessionUserStoreRef?.current ?? noopStore;
  let stored: ResolvedStoredUser | null = null;
  try {
    stored = await store.findByFirebaseUid(decoded.uid);
  } catch (err) {
    logger.error({ err, uid: decoded.uid }, 'sessionUserStore lookup failed');
    sendError(req, reply, new InternalError('user lookup failed'));
    return;
  }

  if (!stored) {
    sendError(req, reply, new ForbiddenError('firebase user not registered — complete onboarding first'));
    return;
  }

  req.sessionUser = buildSessionUser(
    stored,
    {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.emailVerified,
      name: decoded.name,
      picture: decoded.picture,
      signInProvider: decoded.signInProvider,
    },
    resolveDeviceId(req),
  );
}

function tryVerifySessionJwt(req: FastifyRequest, token: string): { sub: string } | null {
  try {
    const claims = req.server.jwt.verify<{ sub: string; type?: string }>(token);
    if (claims.type && claims.type !== 'access') return null;
    return { sub: claims.sub };
  } catch {
    return null;
  }
}

function makeRequirePermission(scope: string, action: string, resource = '*'):
(req: FastifyRequest, reply: FastifyReply) => Promise<void> {
  const key: PermissionKey = {
    scope: scope as PermissionKey['scope'],
    action: action as PermissionKey['action'],
    resource,
  };
  const keyStr = permissionKeyToString(key);
  const wildcardKeyStr = permissionKeyToString({ ...key, resource: '*' });

  return async (req, reply): Promise<void> => {
    if (!req.sessionUser) {
      sendError(req, reply, new UnauthorizedError('authentication required'));
      return;
    }
    const granted = req.sessionUser.grantedPermissions;
    if (granted.includes(keyStr) || granted.includes(wildcardKeyStr)) return;
    sendError(req, reply, new ForbiddenError(`missing permission ${keyStr}`));
  };
}

async function authPluginImpl(app: FastifyInstance): Promise<void> {
  const storeRef: { current: SessionUserStore } = { current: noopStore };
  app.decorate('sessionUserStoreRef', storeRef);
  app.decorate('setSessionUserStore', (store: SessionUserStore): void => {
    storeRef.current = store;
  });
  app.decorateRequest('sessionUser', null);

  app.addHook('onRequest', async (req): Promise<void> => {
    req.sessionUser = null;
    req.snapshot = undefined;
  });

  app.decorate('authenticate', authenticate);
  app.decorate('requirePermission', makeRequirePermission);
}

const authPlugin: FastifyPluginAsync = authPluginImpl;

export default fp(authPlugin, { name: 'auth', fastify: '4.x' });
