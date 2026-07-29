import ActivityLogRepository, { type ActivityLogRow, type WriteActivityInput } from '../repository/activity-log.repository.js';
import type { FastifyRequest } from 'fastify';

export class ActivityLogService {
  constructor(private readonly repo: ActivityLogRepository = new ActivityLogRepository()) {}

  async write(req: FastifyRequest, input: WriteActivityInput): Promise<ActivityLogRow> {
    return this.repo.write(req, input);
  }

  async list(req: FastifyRequest, filter: { event?: string | undefined; userId?: string | undefined }): Promise<ActivityLogRow[]> {
    return this.repo.list(req, filter);
  }
}

export default ActivityLogService;
