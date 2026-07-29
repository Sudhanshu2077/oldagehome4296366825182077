import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, TextInput, Modal } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii, Palette } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface GovDashboardData {
  scope: { level: string; stateId: string | null; regionId: string | null; districtId: string | null; talukaId: string | null };
  institutions: number;
  activeInstitutions: number;
  totalCapacity: number;
  residents: number;
  activeResidents: number;
  bedsTotal: number;
  bedsOccupied: number;
  bedsAvailable: number;
  occupancyRate: number;
  pendingAdmissions: number;
  openComplaints: number;
  activeEmergencies: number;
  staffCount: number;
  pendingApprovals: number;
  scheduledInspections: number;
  complianceScore?: number;
  recentAlerts?: { title: string; body: string; kind: string }[];
}

interface InstitutionRow {
  id: string;
  name: string;
  code: string;
  capacity: number;
  active: boolean;
}

type GovTab = 'overview' | 'institutions' | 'alerts' | 'approvals' | 'inspections' | 'compliance' | 'grants' | 'emergency';

const TAB_KEYS: GovTab[] = ['overview', 'institutions', 'alerts', 'approvals', 'inspections', 'compliance', 'grants', 'emergency'];

function makeGovStyles(palette: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    heading: { fontSize: 18, fontWeight: '700', color: palette.primaryDark },
    subheading: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.md },
    tabBar: { flexDirection: 'row', backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: spacing.md, gap: spacing.sm },
    tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: palette.primary },
    tabText: { fontSize: 12, color: palette.textMuted },
    tabTextActive: { color: palette.primary, fontWeight: '600' },
    kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    kpiCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, minWidth: 80, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: palette.border },
    kpiValue: { fontSize: 20, fontWeight: '700', color: palette.primaryDark },
    kpiLabel: { fontSize: 11, color: palette.textMuted, textAlign: 'center' },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: palette.border },
    cardTitle: { fontSize: 14, fontWeight: '600', color: palette.text },
    cardValue: { fontSize: 24, fontWeight: '700', color: palette.primary, marginTop: spacing.sm },
    instCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: palette.border },
    instName: { fontSize: 14, fontWeight: '600', color: palette.text },
    instMeta: { fontSize: 12, color: palette.textMuted, marginTop: spacing.xs },
    alertCard: { backgroundColor: palette.secondary, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: palette.warning },
    alertTitle: { fontSize: 13, fontWeight: '600', color: palette.text },
    alertBody: { fontSize: 12, color: palette.textMuted, marginTop: spacing.xs },
    actionCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: palette.border },
    actionTitle: { fontSize: 14, fontWeight: '600', color: palette.text },
    actionMeta: { fontSize: 12, color: palette.textMuted, marginTop: spacing.xs },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
    actionButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    actionButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 12 },
    rejectButton: { backgroundColor: palette.secondary, borderWidth: 1, borderColor: palette.error },
    rejectText: { color: palette.error },
    createButton: { backgroundColor: palette.primaryDark, borderRadius: radii.md, padding: spacing.md, margin: spacing.md, alignItems: 'center' },
    createButtonText: { color: palette.textInverse, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: 14, color: palette.text, marginBottom: spacing.md },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    select: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
    selectChip: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    selectChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    selectChipText: { fontSize: 12, color: palette.text },
    selectChipTextActive: { color: palette.textInverse, fontWeight: '600' },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: spacing.xl },
    error: { color: palette.error, marginHorizontal: spacing.md, marginBottom: spacing.sm },
    inlineError: { color: palette.error, marginTop: spacing.sm, fontSize: 12 },
  });
}

export default function GovDashboardScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [data, setData] = useState<GovDashboardData | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<GovTab>('overview');

  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  useEffect(() => {
    if (user?.tier !== 'government') {
      setLoading(false);
      return;
    }
    void loadOverview();
  }, [user]);

  async function loadOverview() {
    setLoading(true);
    try {
      const [dashRes, instRes] = await Promise.all([
        api.get('/gov/dashboard'),
        api.get('/gov/institutions'),
      ]);
      setData((dashRes.data as { data: GovDashboardData }).data);
      setInstitutions((instRes.data as { data: InstitutionRow[] }).data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (user?.tier !== 'government') {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{t('gov.govOnly')}</Text>
      </View>
    );
  }

  if (loading && !data) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (error && !data) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!data) return <View style={styles.center}><Text style={styles.empty}>{t('common.noData')}</Text></View>;

  const tabLabel = (key: GovTab) => t(`gov.${key}`);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {TAB_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{tabLabel(key)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'overview' ? <OverviewTab data={data} /> : null}
      {tab === 'institutions' ? <InstitutionsTab institutions={institutions} /> : null}
      {tab === 'alerts' ? <AlertsTab alerts={data.recentAlerts ?? []} /> : null}
      {tab === 'approvals' ? <ApprovalsTab /> : null}
      {tab === 'inspections' ? <InspectionsTab institutions={institutions} /> : null}
      {tab === 'compliance' ? <ComplianceTab institutions={institutions} /> : null}
      {tab === 'grants' ? <GrantsTab institutions={institutions} /> : null}
      {tab === 'emergency' ? <EmergencyTab institutions={institutions} /> : null}
    </View>
  );
}

function OverviewTab({ data }: { data: GovDashboardData }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }}>
      <Text style={styles.heading}>{t('gov.title')}</Text>
      <Text style={styles.subheading}>{t('gov.scope')}: {data.scope.level}</Text>

      <View style={styles.kpiRow}>
        <Kpi value={data.institutions} label={t('gov.institutions')} />
        <Kpi value={data.residents} label={t('gov.residents')} />
        <Kpi value={data.bedsTotal} label={t('gov.beds')} />
        <Kpi value={`${data.occupancyRate}%`} label={t('gov.occupancy')} />
      </View>

      <View style={styles.kpiRow}>
        <Kpi value={data.pendingAdmissions} label={t('gov.pendingAdmissions')} />
        <Kpi value={data.openComplaints} label={t('gov.openComplaints')} />
        <Kpi value={data.activeEmergencies} label={t('gov.emergencies')} />
        <Kpi value={data.scheduledInspections} label={t('gov.inspections')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('gov.complianceScore')}</Text>
        <Text style={styles.cardValue}>{data.complianceScore ?? '—'} / 100</Text>
      </View>
    </ScrollView>
  );
}

function InstitutionsTab({ institutions }: { institutions: InstitutionRow[] }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  return (
    <FlatList
      data={institutions}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: spacing.md }}
      ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
      renderItem={({ item }) => (
        <View style={styles.instCard}>
          <Text style={styles.instName}>{item.name}</Text>
          <Text style={styles.instMeta}>{item.code} · Capacity {item.capacity} · {item.active ? 'Active' : 'Inactive'}</Text>
        </View>
      )}
    />
  );
}

function AlertsTab({ alerts }: { alerts: GovDashboardData['recentAlerts'] }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  return (
    <FlatList
      data={alerts ?? []}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={{ padding: spacing.md }}
      ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
      renderItem={({ item }) => (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>{item.title}</Text>
          <Text style={styles.alertBody}>{item.body}</Text>
        </View>
      )}
    />
  );
}

function ApprovalsTab() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [items, setItems] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/gov/approvals');
      setItems((res.data as { data: Array<Record<string, unknown> & { id: string }> }).data ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, decision: 'approve' | 'reject' | 'escalate') {
    try {
      await api.post(`/gov/approvals/${id}/decide`, { decision });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: spacing.md }}
      refreshing={loading}
      onRefresh={() => void load()}
      ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
      renderItem={({ item }) => (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>{String(item.type ?? 'Approval')}</Text>
          <Text style={styles.actionMeta}>Status: {String(item.status ?? 'pending')} · Requested by {String(item.requestedBy ?? '—')}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => void decide(item.id, 'approve')}>
              <Text style={styles.actionButtonText}>{t('gov.approve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => void decide(item.id, 'reject')}>
              <Text style={[styles.actionButtonText, styles.rejectText]}>{t('gov.reject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => void decide(item.id, 'escalate')}>
              <Text style={styles.actionButtonText}>{t('gov.escalate')}</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </View>
      )}
    />
  );
}

function InspectionsTab({ institutions }: { institutions: InstitutionRow[] }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [items, setItems] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ institutionId: '', scheduledDate: new Date().toISOString().slice(0, 10), inspectorName: '', notes: '' });

  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/gov/inspections');
      setItems((res.data as { data: Array<Record<string, unknown> & { id: string }> }).data ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function schedule() {
    try {
      await api.post('/gov/inspections', form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function complete(id: string) {
    try {
      await api.post(`/gov/inspections/${id}/complete`, { findings: 'Completed via app', status: 'completed' });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.createButton} onPress={() => setModalOpen(true)}>
        <Text style={styles.createButtonText}>{t('gov.scheduleInspection')}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md }}
        refreshing={loading}
        onRefresh={() => void load()}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Inspection on {String(item.scheduledDate ?? '—')}</Text>
            <Text style={styles.actionMeta}>Institution: {String(item.institutionId ?? '—')} · Status: {String(item.status ?? 'scheduled')}</Text>
            {String(item.status ?? '') !== 'completed' ? (
              <TouchableOpacity style={styles.actionButton} onPress={() => void complete(item.id)}>
                <Text style={styles.actionButtonText}>{t('gov.complete')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
      <EntityModal
        title="Schedule Inspection"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void schedule()}
      >
        <InstitutionSelect institutions={institutions} value={form.institutionId} onChange={(v) => setForm((p) => ({ ...p, institutionId: v }))} />
        <TextInput style={styles.input} value={form.scheduledDate} onChangeText={(v) => setForm((p) => ({ ...p, scheduledDate: v }))} placeholder="YYYY-MM-DD" />
        <TextInput style={styles.input} value={form.inspectorName} onChangeText={(v) => setForm((p) => ({ ...p, inspectorName: v }))} placeholder="Inspector name" />
        <TextInput style={[styles.input, styles.textArea]} value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Notes" multiline />
      </EntityModal>
    </View>
  );
}

function ComplianceTab({ institutions }: { institutions: InstitutionRow[] }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [items, setItems] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ institutionId: '', requirement: '', status: 'pending', dueDate: '', remarks: '' });

  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/gov/compliance');
      setItems((res.data as { data: Array<Record<string, unknown> & { id: string }> }).data ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function upsert() {
    try {
      await api.post('/gov/compliance', form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.createButton} onPress={() => setModalOpen(true)}>
        <Text style={styles.createButtonText}>{t('gov.upsertCompliance')}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md }}
        refreshing={loading}
        onRefresh={() => void load()}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>{String(item.requirement ?? 'Compliance')}</Text>
            <Text style={styles.actionMeta}>Institution: {String(item.institutionId ?? '—')} · Status: {String(item.status ?? '—')} · Due: {String(item.dueDate ?? '—')}</Text>
          </View>
        )}
      />
      <EntityModal
        title="Upsert Compliance"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void upsert()}
      >
        <InstitutionSelect institutions={institutions} value={form.institutionId} onChange={(v) => setForm((p) => ({ ...p, institutionId: v }))} />
        <TextInput style={styles.input} value={form.requirement} onChangeText={(v) => setForm((p) => ({ ...p, requirement: v }))} placeholder="Requirement" />
        <TextInput style={styles.input} value={form.status} onChangeText={(v) => setForm((p) => ({ ...p, status: v }))} placeholder="Status (pending/compliant/non-compliant)" />
        <TextInput style={styles.input} value={form.dueDate} onChangeText={(v) => setForm((p) => ({ ...p, dueDate: v }))} placeholder="Due date YYYY-MM-DD" />
        <TextInput style={[styles.input, styles.textArea]} value={form.remarks} onChangeText={(v) => setForm((p) => ({ ...p, remarks: v }))} placeholder="Remarks" multiline />
      </EntityModal>
    </View>
  );
}

function GrantsTab({ institutions }: { institutions: InstitutionRow[] }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [items, setItems] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ institutionId: '', title: '', amount: '', status: 'approved', approvedDate: new Date().toISOString().slice(0, 10), remarks: '' });

  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/gov/grants');
      setItems((res.data as { data: Array<Record<string, unknown> & { id: string }> }).data ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    try {
      await api.post('/gov/grants', { ...form, amount: Number(form.amount) });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.createButton} onPress={() => setModalOpen(true)}>
        <Text style={styles.createButtonText}>{t('gov.createGrant')}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md }}
        refreshing={loading}
        onRefresh={() => void load()}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>{String(item.title ?? 'Grant')}</Text>
            <Text style={styles.actionMeta}>Amount: ₹{String(item.amount ?? '—')} · Status: {String(item.status ?? '—')} · Approved: {String(item.approvedDate ?? '—')}</Text>
          </View>
        )}
      />
      <EntityModal
        title="Create Grant"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void create()}
      >
        <InstitutionSelect institutions={institutions} value={form.institutionId} onChange={(v) => setForm((p) => ({ ...p, institutionId: v }))} />
        <TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="Grant title" />
        <TextInput style={styles.input} value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} placeholder="Amount" keyboardType="numeric" />
        <TextInput style={styles.input} value={form.status} onChangeText={(v) => setForm((p) => ({ ...p, status: v }))} placeholder="Status" />
        <TextInput style={styles.input} value={form.approvedDate} onChangeText={(v) => setForm((p) => ({ ...p, approvedDate: v }))} placeholder="Approved date YYYY-MM-DD" />
        <TextInput style={[styles.input, styles.textArea]} value={form.remarks} onChangeText={(v) => setForm((p) => ({ ...p, remarks: v }))} placeholder="Remarks" multiline />
      </EntityModal>
    </View>
  );
}

function EmergencyTab({ institutions }: { institutions: InstitutionRow[] }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [items, setItems] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ institutionId: '', type: 'medical', severity: 'medium', location: '', description: '' });

  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/gov/emergency-control', { params: { active: 'true' } });
      setItems((res.data as { data: Array<Record<string, unknown> & { id: string }> }).data ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    try {
      await api.post('/gov/emergency-control', form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.createButton} onPress={() => setModalOpen(true)}>
        <Text style={styles.createButtonText}>{t('gov.createEmergency')}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md }}
        refreshing={loading}
        onRefresh={() => void load()}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.actionCard, { borderLeftWidth: 4, borderLeftColor: palette.error }]}>
            <Text style={styles.actionTitle}>{String(item.type ?? 'Emergency')}</Text>
            <Text style={styles.actionMeta}>Severity: {String(item.severity ?? '—')} · Location: {String(item.location ?? '—')}</Text>
            <Text style={styles.actionMeta}>{String(item.description ?? '')}</Text>
          </View>
        )}
      />
      <EntityModal
        title="Create Emergency"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={() => void create()}
      >
        <InstitutionSelect institutions={institutions} value={form.institutionId} onChange={(v) => setForm((p) => ({ ...p, institutionId: v }))} />
        <TextInput style={styles.input} value={form.type} onChangeText={(v) => setForm((p) => ({ ...p, type: v }))} placeholder="Type (medical/fire/security/other)" />
        <TextInput style={styles.input} value={form.severity} onChangeText={(v) => setForm((p) => ({ ...p, severity: v }))} placeholder="Severity (low/medium/high/critical)" />
        <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm((p) => ({ ...p, location: v }))} placeholder="Location" />
        <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} placeholder="Description" multiline />
      </EntityModal>
    </View>
  );
}

function InstitutionSelect({ institutions, value, onChange }: { institutions: InstitutionRow[]; value: string; onChange: (v: string) => void }) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  return (
    <View style={styles.select}>
      {institutions.map((i) => (
        <TouchableOpacity
          key={i.id}
          style={[styles.selectChip, value === i.id && styles.selectChipActive]}
          onPress={() => onChange(i.id)}
        >
          <Text style={[styles.selectChipText, value === i.id && styles.selectChipTextActive]}>{i.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function EntityModal({ title, open, onClose, onSubmit, children }: { title: string; open: boolean; onClose: () => void; onSubmit: () => void; children: React.ReactNode }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {children}
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={onSubmit}>
              <Text style={styles.saveText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Kpi({ value, label }: { value: string | number; label: string }) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeGovStyles(palette), [palette]);

  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}