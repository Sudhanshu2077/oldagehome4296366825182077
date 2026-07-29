import SettingsRepository, { type SettingRow, type UpsertSettingInput } from '../repository/settings.repository.js';
import { ForbiddenError } from '../../../kernel/errors/app-error.js';
import type { FastifyRequest } from 'fastify';

export class SettingsService {
  constructor(private readonly repo: SettingsRepository = new SettingsRepository()) {}

  async list(req: FastifyRequest, filter: { scope?: string | undefined; group?: string | undefined }): Promise<SettingRow[]> {
    return this.repo.list(req, filter);
  }

  async upsert(req: FastifyRequest, input: UpsertSettingInput): Promise<SettingRow> {
    if (input.scope === 'government' && (!req.sessionUser || req.sessionUser.tier !== 'government')) {
      throw new ForbiddenError('government-scope settings writable only by gov tier');
    }
    if (input.scope === 'institution' && !req.sessionUser?.tenantId) {
      throw new ForbiddenError('institution setting requires tenant scope');
    }
    return this.repo.upsert(req, input);
  }

  async delete(req: FastifyRequest, scope: string, group: string, key: string): Promise<void> {
    if (scope === 'government' && (!req.sessionUser || req.sessionUser.tier !== 'government')) {
      throw new ForbiddenError('government-scope settings deletable only by gov tier');
    }
    return this.repo.delete(req, scope, group, key);
  }
}

export default SettingsService;
