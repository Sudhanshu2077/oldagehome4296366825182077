import type { FastifyRequest } from 'fastify';

export interface DashboardKpi {
  key: string;
  label: string;
  labelMr: string;
  value: number;
  unit?: string;
}

export interface DashboardCard {
  key: string;
  title: string;
  titleMr: string;
  body: string;
  bodyMr?: string;
  severity?: 'info' | 'warn' | 'critical';
}

export interface DashboardRecentActivity {
  id: string;
  event: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

export interface DashboardPendingTask {
  id: string;
  title: string;
  titleMr?: string;
  dueAt?: Date;
  assignedTo?: string;
}

export interface DashboardQuickAction {
  key: string;
  label: string;
  labelMr: string;
  route: string;
}

export interface DashboardPayload {
  kpis: DashboardKpi[];
  cards: DashboardCard[];
  recentActivity: DashboardRecentActivity[];
  pendingTasks: DashboardPendingTask[];
  quickActions: DashboardQuickAction[];
}

export interface DashboardProvider {
  build(req: FastifyRequest): Promise<DashboardPayload>;
}
