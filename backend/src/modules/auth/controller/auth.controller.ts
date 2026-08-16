import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import AuthService from '../service/auth.service.js';
import UserRepository from '../../user/repository/user.repository.js';
import TenantService from '../../tenant/service/tenant.service.js';
import { ok } from '../../../kernel/response/api-response.js';
import { ValidationError, ConflictError, UnauthorizedError } from '../../../kernel/errors/app-error.js';
import { verifyIdTokenSafe } from '../../../services/firebase.service.js';

export class AuthController {
  constructor(
    private readonly service: AuthService = new AuthService(),
    private readonly userRepo: UserRepository = new UserRepository(),
    private readonly tenantService: TenantService = new TenantService(),
  ) {}

  register(app: FastifyInstance): void {
    if (process.env.ENABLE_DEV_LOGIN === 'true') {
      app.post<{ Body: { role?: string } }>('/auth/dev-login', async (req, reply) => {
        const role = (req.body?.role ?? 'assistant-manager') as string;
        const allowed = ['assistant-manager', 'institution-head', 'department-user'];
        const roleId = allowed.includes(role) ? role : 'assistant-manager';

        let institution = await this.tenantService.getByCodeOrNull('DEV-HOME-001');
        if (!institution) {
          institution = await this.tenantService.create({
            name: 'Dev Demo Old Age Home',
            nameMr: 'डेमो वृद्धाश्रम',
            code: 'DEV-HOME-001',
          });
        }

        const devEmail = `dev.${roleId}@localhost.dev`;
        let user = await this.userRepo.findByEmail(devEmail);
        if (!user) {
          user = await this.userRepo.create({
            firebaseUid: `dev-${roleId}`,
            email: devEmail,
            emailVerified: true,
            displayName: `Dev ${roleId}`,
            roleId: roleId as 'assistant-manager',
            tenantId: institution.id,
            departmentCode: roleId === 'department-user' ? 'reception' : null,
            jurisdiction: null,
            grantedPermissions: ['register:read:*', 'announcement:read:*', 'announcement:write:*', 'event:read:*', 'event:write:*', 'inquiry:read:*', 'inquiry:write:*', 'finance:read:*', 'finance:write:*', 'user:read:*', 'user:write:*', 'settings:read:*', 'settings:write:*', 'audit-log:read:*', 'document:read:*', 'document:write:*'],
            registerWriteScopes: roleId === 'department-user' ? ['R1', 'R6', 'R7'] : [],
          });
        }

        const result = await this.service.issueSessionForUser(app, req, user.id, 'dev-local', false);
        reply.send(ok(result));
      });
    }

    app.post<{ Body: { idToken: string; deviceId?: string; rememberDevice?: boolean } }>(
      '/auth/login',
      { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
      async (req, reply) => {
        if (!req.body?.idToken) throw new ValidationError('idToken required');
        const result = await this.service.login(app, req, req.body.idToken, req.body.deviceId ?? 'unknown', req.body.rememberDevice ?? false);
        await app.recordActivity(req, 'login', { userId: result.user.userId });
        reply.send(ok(result));
      },
    );

    app.post<{ Body: { refreshToken: string; deviceId?: string } }>('/auth/refresh', async (req, reply) => {
      if (!req.body?.refreshToken) throw new ValidationError('refreshToken required');
      const result = await this.service.refresh(app, req, req.body.refreshToken, req.body.deviceId ?? '');
      reply.send(ok(result));
    });

    app.post<{ Body: { refreshToken?: string } }>('/auth/logout', async (req, reply) => {
      await this.service.logout(req.body?.refreshToken ?? null, req.sessionUser?.userId ?? null);
      reply.send(ok({ loggedOut: true }));
    });

    app.get('/auth/me', { preHandler: [app.authenticate] }, async (req, reply) => {
      if (!req.sessionUser) throw new UnauthorizedError();
      const profile = await this.service.profileOf(req.sessionUser.userId);
      reply.send(ok(profile));
    });

    app.post<{ Body: OnboardBody }>(
      '/auth/onboard',
      { config: { rateLimit: { max: 5, timeWindow: '15 minute' } } },
      async (req, reply) => {
        const body = req.body;
        if (!body?.idToken || !body?.institutionName || !body?.institutionCode) {
          throw new ValidationError('idToken, institutionName, institutionCode required');
        }
        const verification = await verifyIdTokenSafe(body.idToken);
        if (!verification.ok) throw new UnauthorizedError('invalid Firebase token');
        const token = verification.token;
        if (!token.email) throw new ValidationError('firebase account has no email');

        const existing = await this.userRepo.findByFirebaseUid(token.uid);
        if (existing) throw new ConflictError('user already registered');

        const institution = await this.tenantService.create({
          name: body.institutionName,
          ...(body.institutionNameMr !== undefined ? { nameMr: body.institutionNameMr } : {}),
          code: body.institutionCode,
          contactEmail: token.email,
        });

        const user = await this.userRepo.create({
          firebaseUid: token.uid,
          email: token.email,
          emailVerified: token.emailVerified,
          displayName: token.name ?? '',
          photoUrl: token.picture ?? '',
          roleId: 'institution-head',
          tenantId: institution.id,
          departmentCode: null,
          jurisdiction: null,
          grantedPermissions: ['register:read:*', 'announcement:write:*', 'event:write:*', 'user:read:*', 'user:write:*', 'settings:read:*', 'settings:write:*', 'audit-log:read:*', 'document:read:*', 'document:write:*'],
        });

        reply.code(201).send(ok({ institutionId: institution.id, userId: user.id }));
      },
    );

    app.post<{ Body: JoinBody }>(
      '/auth/join',
      { config: { rateLimit: { max: 5, timeWindow: '15 minute' } } },
      async (req, reply) => {
        const body = req.body;
        if (!body?.idToken || !body?.role || !['family', 'donor', 'citizen', 'volunteer'].includes(body.role)) {
          throw new ValidationError('idToken and role (family|donor|citizen|volunteer) required');
        }
        const verification = await verifyIdTokenSafe(body.idToken);
        if (!verification.ok) throw new UnauthorizedError('invalid Firebase token');
        const token = verification.token;
        if (!token.email) throw new ValidationError('firebase account has no email');

        const existing = await this.userRepo.findByFirebaseUid(token.uid);
        if (existing) throw new ConflictError('user already registered');

        const user = await this.userRepo.create({
          firebaseUid: token.uid,
          email: token.email,
          emailVerified: token.emailVerified,
          displayName: token.name ?? '',
          photoUrl: token.picture ?? '',
          roleId: body.role as 'family' | 'donor' | 'citizen' | 'volunteer',
          tenantId: body.tenantId ?? null,
          departmentCode: null,
          jurisdiction: null,
          grantedPermissions: ['inquiry:write:own'],
        });

        reply.code(201).send(ok({ userId: user.id }));
      },
    );
  }
}

export interface OnboardBody {
  idToken: string;
  institutionName: string;
  institutionNameMr?: string;
  institutionCode: string;
}

export interface JoinBody {
  idToken: string;
  role: 'family' | 'donor' | 'citizen' | 'volunteer';
  tenantId?: string | null;
}

export default AuthController;
