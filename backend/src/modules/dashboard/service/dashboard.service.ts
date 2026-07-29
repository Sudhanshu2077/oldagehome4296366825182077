import type { FastifyRequest } from 'fastify';
import { ActivityLogModel } from '../../activity-log/entity/activity-log.entity.js';
import { InquiryModel } from '../../inquiries/entity/inquiry.entity.js';
import { UserModel } from '../../user/entity/user.entity.js';
import { resolvedTenantId } from '../../../plugins/tenant.plugin.js';
import { REGISTER_SCOPE_IDS } from '../../../kernel/types/rbac.js';
import RegisterRepository from '../../registers/repository/register.repository.js';
import { REGISTER_TITLES } from '../../registers/service/register.service.js';
import type { DashboardPayload, DashboardProvider, DashboardQuickAction } from './dashboard-types.js';

const registerRepo = new RegisterRepository();

class MongoDashboardProvider implements DashboardProvider {
  async build(req: FastifyRequest): Promise<DashboardPayload> {
    const su = req.sessionUser;
    if (!su) return { kpis: [], cards: [], recentActivity: [], pendingTasks: [], quickActions: [] };

    const tenantId = resolvedTenantId(req);

    if (su.tier === 'government') {
      const institutions = await UserModel.db.collection('institutions').countDocuments({ active: true });
      return {
        kpis: [
          { key: 'institutions', label: 'Active Institutions', labelMr: 'सक्रिय संस्था', value: institutions },
        ],
        cards: [],
        recentActivity: [],
        pendingTasks: [],
        quickActions: [{ key: 'open-institutions', label: 'View Institutions', labelMr: 'संस्था पाहा', route: '/tenants' }],
      };
    }

    if (!tenantId) return { kpis: [], cards: [], recentActivity: [], pendingTasks: [], quickActions: defaultQuickActions(req) };

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [entriesThisMonth, staffCount, openInquiries, recent] = await Promise.all([
      Promise.all(REGISTER_SCOPE_IDS.map((r) => registerRepo.countByRegister(tenantId, r, monthStart))),
      UserModel.countDocuments({ tenantId, isActive: true }),
      InquiryModel.countDocuments({ tenantId, status: 'open' }),
      ActivityLogModel.find({ tenantId }).sort({ timestamp: -1 }).limit(10).lean(),
    ]);

    const totalEntries = entriesThisMonth.reduce((a, b) => a + b, 0);

    return {
      kpis: [
        { key: 'entries-month', label: 'Register Entries (this month)', labelMr: 'या महिन्यातील नोंदी', value: totalEntries },
        { key: 'staff', label: 'Active Users', labelMr: 'सक्रिय वापरकर्ते', value: staffCount },
        { key: 'inquiries-open', label: 'Open Inquiries', labelMr: 'खुल्या चौकश्या', value: openInquiries },
      ],
      cards: REGISTER_SCOPE_IDS.slice(0, 4).map((r, i) => ({
        key: `register-${r}`,
        title: REGISTER_TITLES[r].en,
        titleMr: REGISTER_TITLES[r].mr,
        body: `${entriesThisMonth[i] ?? 0} entries this month`,
        severity: 'info' as const,
      })),
      recentActivity: recent.map((d) => ({
        id: d._id.toString(),
        event: d.event,
        timestamp: d.timestamp,
        ...(d.meta ? { meta: d.meta as Record<string, unknown> } : {}),
      })),
      pendingTasks: openInquiries > 0 ? [{ id: 'inquiries', title: `${openInquiries} open inquiries to resolve`, titleMr: `${openInquiries} खुल्या चौकश्या` }] : [],
      quickActions: defaultQuickActions(req),
    };
  }
}

function defaultQuickActions(req: FastifyRequest): DashboardQuickAction[] {
  const su = req.sessionUser;
  if (!su) return [];
  if (su.tier === 'external') return [{ key: 'submit-inquiry', label: 'Submit Inquiry', labelMr: 'चौकशी सबमिट करा', route: '/inquiries/new' }];
  return [
    { key: 'open-registers', label: 'Registers', labelMr: 'रजिस्टर', route: '/registers' },
    { key: 'open-announcements', label: 'Announcements', labelMr: 'घोषणा', route: '/announcements' },
    { key: 'open-settings', label: 'Settings', labelMr: 'सेटिंग्ज', route: '/settings' },
  ];
}

class MongoBacked implements DashboardProvider {
  build(req: FastifyRequest): Promise<DashboardPayload> {
    return new MongoDashboardProvider().build(req);
  }
}

let provider: DashboardProvider = new MongoBacked();

export function setDashboardProvider(next: DashboardProvider): void {
  provider = next;
}

export function getDashboardProvider(): DashboardProvider {
  return provider;
}

export default provider;
