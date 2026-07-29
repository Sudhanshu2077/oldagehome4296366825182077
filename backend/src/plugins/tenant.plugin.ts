import type { FastifyInstance, FastifyReply, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { FilterQuery } from 'mongoose';
import { ForbiddenError, TenantScopeMissingError, isAppError } from '../kernel/errors/app-error.js';

function ensureTenantWriteOrThrow(req: FastifyRequest): string {
  const su = req.sessionUser;
  if (!su) {
    throw new TenantScopeMissingError();
  }
  if (su.tier === 'government') {
    throw new ForbiddenError('government-tier users cannot write tenant-scoped entities');
  }
  if (su.tenantId === null) {
    throw new TenantScopeMissingError();
  }
  return su.tenantId;
}

function sendAppError(req: FastifyRequest, reply: FastifyReply, err: unknown): void {
  if (!isAppError(err)) throw err;
  void reply.code(err.statusCode).send({
    error: err.code,
    message: err.message,
    requestId: req.id,
  });
}

async function tenantScopePlugin(app: FastifyInstance): Promise<void> {
  app.decorate('requireTenantScope', async (req, reply): Promise<void> => {
    try {
      void ensureTenantWriteOrThrow(req);
    } catch (err) {
      sendAppError(req, reply, err);
    }
  });

  app.decorate('requireCrossTenantRead', async (req, reply): Promise<void> => {
    const su = req.sessionUser;
    if (!su) {
      sendAppError(req, reply, new TenantScopeMissingError());
      return;
    }
    if (su.tier !== 'government') {
      sendAppError(req, reply, new ForbiddenError('cross-tenant read restricted to government tier'));
      return;
    }
  });

  app.decorate('requireTenantRead', async (req, reply): Promise<void> => {
    const su = req.sessionUser;
    if (!su) {
      sendAppError(req, reply, new TenantScopeMissingError());
      return;
    }
    if (su.tier === 'government') return;
    if (su.tenantId === null) {
      sendAppError(req, reply, new TenantScopeMissingError());
    }
  });
}

export function tenantFilter<T>(req: FastifyRequest, extra?: FilterQuery<T>): FilterQuery<T> {
  const su = req.sessionUser;
  if (!su) throw new TenantScopeMissingError();
  if (su.tier === 'government') {
    if (su.jurisdiction && su.jurisdiction.level !== 'all') {
      throw new ForbiddenError(
        'government jurisdiction-scoped reads must use jurisdictionFilter(), not generic tenantFilter()',
      );
    }
    return extra ?? ({} as FilterQuery<T>);
  }
  if (su.tenantId === null) throw new TenantScopeMissingError();
  const tenantClause = { tenantId: su.tenantId } as FilterQuery<T>;
  return extra ? ({ ...extra, ...tenantClause } as FilterQuery<T>) : tenantClause;
}

export function resolvedTenantId(req: FastifyRequest): string | null {
  return req.sessionUser?.tenantId ?? null;
}

export function assertTenantWriteAccess(req: FastifyRequest): string {
  return ensureTenantWriteOrThrow(req);
}

export function jurisdictionFilter<T>(req: FastifyRequest, extra?: FilterQuery<T>): FilterQuery<T> {
  const su = req.sessionUser;
  if (!su || su.tier !== 'government' || !su.jurisdiction) {
    throw new ForbiddenError('jurisdictionFilter requires a government-tier user with jurisdiction');
  }
  const j = su.jurisdiction;
  if (j.level === 'all') return extra ?? ({} as FilterQuery<T>);
  const clause: Record<string, unknown> = {};
  if (j.stateId) clause.stateId = j.stateId;
  if (j.regionId && ['region', 'district', 'taluka'].includes(j.level)) clause.regionId = j.regionId;
  if (j.districtId && ['district', 'taluka'].includes(j.level)) clause.districtId = j.districtId;
  if (j.talukaId && j.level === 'taluka') clause.talukaId = j.talukaId;
  return extra ? ({ ...extra, ...clause } as FilterQuery<T>) : (clause as FilterQuery<T>);
}

const plugin: FastifyPluginAsync = tenantScopePlugin;

export default fp(plugin, { name: 'tenant-scope', fastify: '4.x' });
