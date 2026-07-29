import type { FastifyRequest } from 'fastify';
import ReportRepository, { type DateRange } from '../repository/report.repository.js';
import { ForbiddenError, ValidationError } from '../../../kernel/errors/app-error.js';

export type ReportFormat = 'json' | 'csv' | 'xlsx';

function parseDate(v: unknown): Date | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new ValidationError(`invalid date: ${String(v)}`);
  return d;
}

function escapeCsvCell(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function flattenObject(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object') {
    out[prefix || 'value'] = String(obj);
    return out;
  }
  if (Array.isArray(obj)) {
    out[prefix || 'value'] = JSON.stringify(obj);
    return out;
  }
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenObject(value, newKey));
    } else {
      out[newKey] = Array.isArray(value) ? JSON.stringify(value) : String(value ?? '');
    }
  }
  return out;
}

function toCsv(data: unknown): string {
  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return '';
  const rows = items.map((item) => flattenObject(item));
  const firstRow = rows[0] ?? {};
  const keys = Object.keys(firstRow);
  const lines = [keys.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => escapeCsvCell(row[k] ?? '')).join(','));
  }
  return lines.join('\n');
}

export class ReportService {
  constructor(private readonly repo: ReportRepository = new ReportRepository()) {}

  private assertAccess(req: FastifyRequest): void {
    const su = req.sessionUser;
    if (!su) throw new ForbiddenError();
    if (su.tier === 'external') throw new ForbiddenError('report access denied');
  }

  private parseRange(query: Record<string, unknown>): DateRange {
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (from && to && from.getTime() > to.getTime()) {
      throw new ValidationError('from must be before or equal to to');
    }
    return { from, to };
  }

  private normalizeFormat(format: unknown): ReportFormat {
    const f = String(format || 'json').toLowerCase();
    if (f === 'csv' || f === 'xlsx') return f;
    return 'json';
  }

  async generate(
    req: FastifyRequest,
    type: string,
    query: Record<string, unknown>,
  ): Promise<{ format: ReportFormat; data: unknown }> {
    this.assertAccess(req);
    const range = this.parseRange(query);
    const format = this.normalizeFormat(query.format);
    const result = await this.repo.aggregate(req, type, range);
    if (format === 'json') {
      return { format, data: result };
    }
    return { format, data: toCsv(result) };
  }
}

export default ReportService;
