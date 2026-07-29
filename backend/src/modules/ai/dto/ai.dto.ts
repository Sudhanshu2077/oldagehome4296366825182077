export const AI_REPORT_KINDS = ['admission', 'medical', 'finance', 'inventory', 'monthly', 'custom'] as const;
export type AIReportKind = (typeof AI_REPORT_KINDS)[number];

export const AI_PREDICT_KINDS = [
  'medicine-shortage',
  'low-stock',
  'health-risk',
  'budget-variance',
  'donation-trends',
  'grant-utilization',
  'inspection-priority',
  'emergency-risk',
] as const;
export type AIPredictKind = (typeof AI_PREDICT_KINDS)[number];

export interface GenerateReportBody {
  prompt?: string;
  params?: Record<string, unknown>;
}

export function isAIReportKind(value: unknown): value is AIReportKind {
  return typeof value === 'string' && (AI_REPORT_KINDS as readonly string[]).includes(value);
}

export function isAIPredictKind(value: unknown): value is AIPredictKind {
  return typeof value === 'string' && (AI_PREDICT_KINDS as readonly string[]).includes(value);
}
