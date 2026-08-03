import type { FastifyInstance } from 'fastify';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { buildApp } from '../src/config/app.js';
import { resetConfigForTests } from '../src/config/env.js';
import { resetLoggerForTests } from '../src/config/logger.js';
import { resetFirebaseForTests } from '../src/services/firebase.service.js';
import { connectMongo, disconnectMongo } from '../src/services/mongo.service.js';
import { runRbacSeed } from '../scripts/run-rbac-seed.js';
import { UserModel } from '../src/modules/user/entity/user.entity.js';
import { InstitutionModel } from '../src/modules/tenant/entity/institution.entity.js';

export async function startMemoryServer(): Promise<MongoMemoryServer> {
  const server = await MongoMemoryServer.create({ instance: { dbName: 'igohms_test' } });
  process.env.MONGODB_URI = server.getUri();
  return server;
}

export async function buildTestApp(): Promise<FastifyInstance> {
  resetConfigForTests();
  resetLoggerForTests();
  resetFirebaseForTests();
  const app = await buildApp();
  await connectMongo();
  await runRbacSeed();
  return app;
}

export async function closeTestApp(app: FastifyInstance, server: MongoMemoryServer): Promise<void> {
  await app.close();
  await mongoose.connection.dropDatabase().catch(() => undefined);
  await disconnectMongo();
  await server.stop();
}

export function signAccessToken(app: FastifyInstance, userId: string): string {
  return app.jwt.sign({ sub: userId, type: 'access' }, { expiresIn: '1h' });
}

export async function createInstitution(name: string, code: string) {
  return InstitutionModel.create({ name, code, active: true, capacity: 50 });
}

export async function createUser(input: {
  email: string;
  roleId: string;
  tenantId?: string | null;
  departmentCode?: string | null;
  grantedPermissions?: string[];
  registerWriteScopes?: string[];
  jurisdiction?: {
    level: string;
    stateId?: string | null;
    districtId?: string | null;
    talukaId?: string | null;
    regionId?: string | null;
  };
}) {
  const uid = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return UserModel.create({
    firebaseUid: uid,
    email: input.email,
    emailVerified: true,
    displayName: input.email,
    roleId: input.roleId,
    tenantId: input.tenantId ?? null,
    departmentCode: input.departmentCode ?? null,
    jurisdiction: input.jurisdiction ?? undefined,
    grantedPermissions: input.grantedPermissions ?? [],
    registerWriteScopes: input.registerWriteScopes ?? [],
  });
}

export async function loginAs(
  app: FastifyInstance,
  role: 'assistant-manager' | 'institution-head' | 'department-user',
): Promise<{ token: string; user: Record<string, unknown> }> {
  const institution = await InstitutionModel.findOne({ code: 'DEV-HOME-001' }) ?? await createInstitution('Dev Demo Old Age Home', 'DEV-HOME-001');
  const user = await createUser({
    email: `dev-${role}@test.local`,
    roleId: role,
    tenantId: institution._id.toString(),
    departmentCode: role === 'department-user' ? 'reception' : null,
    grantedPermissions: role === 'institution-head' ? ['register:read:*'] : role === 'department-user' ? ['register:read:*'] : [],
    registerWriteScopes: role === 'department-user' ? ['R1', 'R6', 'R7'] : [],
  });
  const token = signAccessToken(app, user._id.toString());
  return { token, user: { tenantId: institution._id.toString(), role, tier: 'institution' } };
}
