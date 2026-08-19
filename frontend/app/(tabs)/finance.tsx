import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { useSamples } from '../../src/sample/SampleContext';
import { SampleBadge, SampleBanner } from '../../src/components/ui';

type Section = 'overview' | 'books' | 'vouchers' | 'donations' | 'budgets' | 'statements';

type Row = Record<string, unknown> & { id: string };

const STATEMENT_ENDPOINTS: Record<string, string> = {
  'trial-balance': '/finance-statements/trial-balance',
  'balance-sheet': '/finance-statements/balance-sheet',
  'income-statement': '/finance-statements/income-statement',
  'cash-flow': '/finance-statements/cash-flow',
  'bank-reconciliation': '/finance-statements/bank-reconciliation',
};

function asNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') {
    return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return String(value);
}

function money(value: unknown): string {
  return '₹ ' + fmt(asNum(value));
}

function shortDate(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sameMonth(v: unknown, ref: Date): boolean {
  if (!v) return false;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function pickDateField(row: Row, candidates: string[]): string | undefined {
  for (const k of candidates) {
    const v = row[k];
    if (typeof v === 'string' || typeof v === 'number') return String(v);
  }
  return undefined;
}

export default function FinanceScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [section, setSection] = useState<Section>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const sections: { key: Section; label: string }[] = useMemo(() => [
    { key: 'overview', label: t('finance.overview') },
    { key: 'books', label: t('finance.books') },
    { key: 'vouchers', label: t('finance.vouchers') },
    { key: 'donations', label: t('finance.donations') },
    { key: 'budgets', label: t('finance.budgets') },
    { key: 'statements', label: t('finance.statements') },
  ], [t]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
    heading: { fontSize: 18, fontWeight: '700', color: palette.primaryDark },
    subheading: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
    tabBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.sm },
    tab: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
    tabActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    tabText: { fontSize: 9, color: palette.text, fontWeight: '600', textAlign: 'center' },
    tabTextActive: { color: palette.textInverse, fontWeight: '700' },
    content: { flex: 1 },
    error: { color: palette.error, paddingHorizontal: spacing.md, paddingTop: spacing.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  }), [palette]);

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('finance.titleNew')}</Text>
        <Text style={styles.subheading}>{t('finance.subheading')}</Text>
      </View>

      <View style={styles.tabBar}>
        {sections.map((s) => (
          <TouchableOpacity key={s.key} style={[styles.tab, section === s.key && styles.tabActive]} onPress={() => setSection(s.key)}>
            <Text style={[styles.tabText, section === s.key && styles.tabTextActive]} numberOfLines={2}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {section === 'overview' ? <OverviewSection refreshing={refreshing} /> : null}
        {section === 'books' ? <BooksSection refreshing={refreshing} /> : null}
        {section === 'vouchers' ? <VouchersSection refreshing={refreshing} /> : null}
        {section === 'donations' ? <DonationsSection refreshing={refreshing} /> : null}
        {section === 'budgets' ? <BudgetsSection refreshing={refreshing} /> : null}
        {section === 'statements' ? <StatementsSection refreshing={refreshing} /> : null}
      </View>
    </View>
  );
}

async function loadList(code: string, params: Record<string, string | number> = {}): Promise<Row[]> {
  const res = await api.get(`/m/${code}`, { params: { pageSize: params.pageSize ?? 200, ...params } });
  const body = res.data as { data?: Row[] };
  return body.data ?? [];
}

function useRefreshKey(refreshing: boolean): number {
  const [k, setK] = useState(0);
  useEffect(() => { if (refreshing) setK((x) => x + 1); }, [refreshing]);
  return k;
}

function SectionWrap({ children, refreshing, onRefresh }: { children: React.ReactNode; refreshing: boolean; onRefresh: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: 0, paddingBottom: 40 }} refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      {children}
    </ScrollView>
  );
}

function OverviewSection({ refreshing }: { refreshing: boolean }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const { samplesFor } = useSamples();
  const [incomes, setIncomes] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [vouchers, setVouchers] = useState<Row[]>([]);
  const [donations, setDonations] = useState<Row[]>([]);
  const [budgets, setBudgets] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rkey = useRefreshKey(refreshing);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [inc, exp, vch, don, bud] = await Promise.all([
        loadList('incomes').catch(() => [] as Row[]),
        loadList('expenses').catch(() => [] as Row[]),
        loadList('vouchers', { f_status: 'approved' }).catch(() => [] as Row[]),
        loadList('donations').catch(() => [] as Row[]),
        loadList('budgets', { f_status: 'approved' }).catch(() => [] as Row[]),
      ]);
      setIncomes(inc.length ? inc : (samplesFor('finance.income', 3) as Row[]));
      setExpenses(exp.length ? exp : (samplesFor('finance.expense', 3) as Row[]));
      setVouchers(vch.length ? vch : (samplesFor('finance.voucher', 3) as Row[]));
      setDonations(don.length ? don : (samplesFor('finance.donation', 3) as Row[]));
      setBudgets(bud.length ? bud : (samplesFor('finance.budget', 3) as Row[]));
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [samplesFor]);

  useEffect(() => { void load(); }, [load, rkey]);

  const now = useMemo(() => new Date(), [rkey]);
  const monthIncome = useMemo(() => incomes.filter((r) => sameMonth(pickDateField(r, ['date', 'createdAt']), now)).reduce((s, r) => s + asNum(r.amount), 0), [incomes, now]);
  const monthExpense = useMemo(() => expenses.filter((r) => sameMonth(pickDateField(r, ['date', 'createdAt']), now)).reduce((s, r) => s + asNum(r.amount), 0), [expenses, now]);
  const monthDonations = useMemo(() => donations.filter((r) => sameMonth(pickDateField(r, ['donationDate', 'createdAt']), now)).reduce((s, r) => s + asNum(r.amount), 0), [donations, now]);
  const pendingVouchers = useMemo(() => vouchers.filter((r) => ['draft', 'submitted', 'verified'].includes(String(r.status ?? ''))).length, [vouchers]);
  const net = monthIncome - monthExpense;
  const recentIncomes = useMemo(() => [...incomes].sort((a, b) => String(pickDateField(b, ['date', 'createdAt']) ?? '').localeCompare(String(pickDateField(a, ['date', 'createdAt']) ?? ''))).slice(0, 5), [incomes]);
  const recentExpenses = useMemo(() => [...expenses].sort((a, b) => String(pickDateField(b, ['date', 'createdAt']) ?? '').localeCompare(String(pickDateField(a, ['date', 'createdAt']) ?? ''))).slice(0, 5), [expenses]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={palette.primary} /></View>;

  const styles = StyleSheet.create({
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    kpi: { flexBasis: '47%', flexGrow: 1, backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm },
    kpiLabel: { fontSize: 11, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    kpiValue: { fontSize: 18, fontWeight: '700', color: palette.primaryDark, marginTop: 4 },
    kpiSub: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: palette.text, marginTop: spacing.md, marginBottom: spacing.xs, marginLeft: spacing.xs },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm, overflow: 'hidden' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { fontSize: 12, color: palette.text, flex: 1 },
    rowAmt: { fontSize: 12, fontWeight: '700', color: palette.text },
    empty: { fontSize: 12, color: palette.textMuted, padding: spacing.md, textAlign: 'center' },
    openLink: { color: palette.primary, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.sm },
  });

  return (
    <SectionWrap refreshing={refreshing} onRefresh={load}>
      {incomes.some((r) => (r as Row & { __sample?: boolean }).__sample === true) ? <SampleBanner /> : null}
      <View style={styles.kpiGrid}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>{t('finance.monthIncome')}</Text>
          <Text style={[styles.kpiValue, { color: palette.primary }]}>{money(monthIncome)}</Text>
          <Text style={styles.kpiSub}>{now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>{t('finance.monthExpense')}</Text>
          <Text style={[styles.kpiValue, { color: palette.error }]}>{money(monthExpense)}</Text>
          <Text style={styles.kpiSub}>{now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>{t('finance.net')}</Text>
          <Text style={[styles.kpiValue, { color: net >= 0 ? palette.primary : palette.error }]}>{money(net)}</Text>
          <Text style={styles.kpiSub}>{net >= 0 ? t('finance.surplus') : t('finance.deficit')}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>{t('finance.monthDonations')}</Text>
          <Text style={styles.kpiValue}>{money(monthDonations)}</Text>
          <Text style={styles.kpiSub}>{donations.length} {t('finance.totalEntries')}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1, backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm }}>
          <Text style={styles.kpiLabel}>{t('finance.pendingVouchers')}</Text>
          <Text style={[styles.kpiValue, { marginTop: 4 }]}>{pendingVouchers}</Text>
          <Text style={styles.kpiSub}>{vouchers.length} {t('finance.approvedTotal')}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm }}>
          <Text style={styles.kpiLabel}>{t('finance.activeBudgets')}</Text>
          <Text style={[styles.kpiValue, { marginTop: 4 }]}>{budgets.length}</Text>
          <Text style={styles.kpiSub}>{money(budgets.reduce((s, b) => s + asNum(b.allocated), 0))} {t('finance.allocated')}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{t('finance.recentIncome')}</Text>
      <View style={styles.card}>
        {recentIncomes.length === 0 ? <Text style={styles.empty}>{t('finance.noEntries')}</Text> :
          recentIncomes.map((r, i) => (
            <View key={r.id} style={[styles.row, i === recentIncomes.length - 1 && styles.rowLast]}>
              <Text style={styles.rowLabel}>{shortDate(pickDateField(r, ['date']))} · {String(r.source ?? '—')}</Text>
              <Text style={[styles.rowAmt, { color: palette.primary }]}>{money(r.amount)}</Text>
            </View>
          ))}
      </View>
      <TouchableOpacity onPress={() => router.push('/module/incomes')}><Text style={styles.openLink}>{t('finance.openIncome')} ›</Text></TouchableOpacity>

      <Text style={styles.cardTitle}>{t('finance.recentExpense')}</Text>
      <View style={styles.card}>
        {recentExpenses.length === 0 ? <Text style={styles.empty}>{t('finance.noEntries')}</Text> :
          recentExpenses.map((r, i) => (
            <View key={r.id} style={[styles.row, i === recentExpenses.length - 1 && styles.rowLast]}>
              <Text style={styles.rowLabel}>{shortDate(pickDateField(r, ['date']))} · {String(r.category ?? '—')}</Text>
              <Text style={[styles.rowAmt, { color: palette.error }]}>{money(r.amount)}</Text>
            </View>
          ))}
      </View>
      <TouchableOpacity onPress={() => router.push('/module/expenses')}><Text style={styles.openLink}>{t('finance.openExpense')} ›</Text></TouchableOpacity>
    </SectionWrap>
  );
}

function BooksSection({ refreshing }: { refreshing: boolean }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const { samplesFor } = useSamples();
  const [cash, setCash] = useState<Row[]>([]);
  const [bank, setBank] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rkey = useRefreshKey(refreshing);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [c, b] = await Promise.all([
        loadList('cash-book', { pageSize: 50 }).catch(() => [] as Row[]),
        loadList('bank-transactions', { pageSize: 50 }).catch(() => [] as Row[]),
      ]);
      setCash(c.length ? c : (samplesFor('finance.cash', 8) as Row[]));
      setBank(b.length ? b : (samplesFor('finance.bank', 8) as Row[]));
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [samplesFor]);

  useEffect(() => { void load(); }, [load, rkey]);

  const cashIn = useMemo(() => cash.filter((r) => ['receipt', 'opening'].includes(String(r.type ?? ''))).reduce((s, r) => s + asNum(r.amount), 0), [cash]);
  const cashOut = useMemo(() => cash.filter((r) => ['payment', 'closing'].includes(String(r.type ?? ''))).reduce((s, r) => s + asNum(r.amount), 0), [cash]);
  const lastBalance = useMemo(() => asNum(cash[0]?.runningBalance), [cash]);
  const bankIn = useMemo(() => bank.filter((r) => ['deposit', 'transfer', 'upi', 'neft', 'rtgs', 'cheque'].includes(String(r.type ?? ''))).reduce((s, r) => s + asNum(r.amount), 0), [bank]);
  const bankOut = useMemo(() => bank.filter((r) => ['withdrawal'].includes(String(r.type ?? ''))).reduce((s, r) => s + asNum(r.amount), 0), [bank]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (error) return <Text style={{ color: palette.error, padding: spacing.md }}>{error}</Text>;

  const styles = StyleSheet.create({
    rowCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm },
    pair: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
    lbl: { fontSize: 11, color: palette.textMuted, textTransform: 'uppercase' },
    val: { fontSize: 16, fontWeight: '700', color: palette.primaryDark },
    entry: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    entryLast: { borderBottomWidth: 0 },
    eLabel: { fontSize: 12, color: palette.text, flex: 1 },
    eAmt: { fontSize: 12, fontWeight: '700' },
    title: { fontSize: 14, fontWeight: '700', color: palette.text, marginTop: spacing.md, marginBottom: spacing.xs, marginLeft: spacing.xs },
    open: { color: palette.primary, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  });

  return (
    <SectionWrap refreshing={refreshing} onRefresh={load}>
      {cash.some((r) => (r as Row & { __sample?: boolean }).__sample === true) ? <SampleBanner /> : null}
      <View style={styles.rowCard}>
        <View style={styles.pair}><Text style={styles.lbl}>{t('finance.cashBook')}</Text><Text style={styles.val}>{money(lastBalance)}</Text></View>
        <View style={styles.pair}><Text style={{ fontSize: 11, color: palette.textMuted }}>{t('finance.inflow')}: {money(cashIn)}</Text><Text style={{ fontSize: 11, color: palette.textMuted }}>{t('finance.outflow')}: {money(cashOut)}</Text></View>
      </View>
      {cash.slice(0, 8).map((r, i) => (
        <View key={r.id} style={[styles.entry, i === cash.slice(0, 8).length - 1 && styles.entryLast]}>
          <Text style={styles.eLabel}>{shortDate(r.date)} · {String(r.particulars ?? r.type ?? '—')}</Text>
          <Text style={[styles.eAmt, { color: ['receipt', 'opening'].includes(String(r.type ?? '')) ? palette.primary : palette.error }]}>{money(r.amount)}</Text>
        </View>
      ))}
      <TouchableOpacity onPress={() => router.push('/module/cash-book')}><Text style={styles.open}>{t('finance.openCashBook')} ›</Text></TouchableOpacity>

      <Text style={styles.title}>{t('finance.bankBook')}</Text>
      <View style={styles.rowCard}>
        <View style={styles.pair}><Text style={styles.lbl}>{t('finance.bankTally')}</Text><Text style={styles.val}>{money(bankIn - bankOut)}</Text></View>
        <View style={styles.pair}><Text style={{ fontSize: 11, color: palette.textMuted }}>{t('finance.deposits')}: {money(bankIn)}</Text><Text style={{ fontSize: 11, color: palette.textMuted }}>{t('finance.withdrawals')}: {money(bankOut)}</Text></View>
      </View>
      {bank.slice(0, 8).map((r, i) => (
        <View key={r.id} style={[styles.entry, i === bank.slice(0, 8).length - 1 && styles.entryLast]}>
          <Text style={styles.eLabel}>{shortDate(r.date)} · {String(r.bankName ?? r.type ?? '—')}</Text>
          <Text style={[styles.eAmt, { color: ['withdrawal'].includes(String(r.type ?? '')) ? palette.error : palette.primary }]}>{money(r.amount)}</Text>
        </View>
      ))}
      <TouchableOpacity onPress={() => router.push('/module/bank-transactions')}><Text style={styles.open}>{t('finance.openBankBook')} ›</Text></TouchableOpacity>
    </SectionWrap>
  );
}

function VouchersSection({ refreshing }: { refreshing: boolean }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const { samplesFor } = useSamples();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rkey = useRefreshKey(refreshing);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const rows = await loadList('vouchers', { pageSize: 100 }); setRows(rows.length ? rows : (samplesFor('finance.voucher', 3) as Row[])); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [samplesFor]);
  useEffect(() => { void load(); }, [load, rkey]);

  const statusColor = (s: string) => s === 'approved' ? palette.primary : s === 'draft' ? palette.textMuted : palette.border;

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (error) return <Text style={{ color: palette.error, padding: spacing.md }}>{error}</Text>;

  const styles = StyleSheet.create({
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm },
    top: { flexDirection: 'row', justifyContent: 'space-between' },
    num: { fontSize: 13, fontWeight: '700', color: palette.primaryDark },
    status: { fontSize: 10, fontWeight: '700', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, overflow: 'hidden' },
    meta: { fontSize: 11, color: palette.textMuted, marginTop: 4 },
    amt: { fontSize: 15, fontWeight: '700', color: palette.text, marginTop: spacing.xs },
    empty: { fontSize: 12, color: palette.textMuted, padding: spacing.md, textAlign: 'center' },
    open: { color: palette.primary, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.sm },
  });

  return (
    <SectionWrap refreshing={refreshing} onRefresh={load}>
      {rows.some((r) => (r as Row & { __sample?: boolean }).__sample === true) ? <SampleBanner /> : null}
      {rows.length === 0 ? <Text style={styles.empty}>{t('finance.noEntries')}</Text> :
        rows.map((r) => (
          <View key={r.id} style={styles.card}>
            {r.__sample === true ? <SampleBadge /> : null}
            <View style={styles.top}>
              <Text style={styles.num}>{String(r.voucherNumber ?? '—')}</Text>
              <Text style={[styles.status, { backgroundColor: statusColor(String(r.status ?? 'draft')), color: palette.textInverse }]}>{String(r.status ?? 'draft').toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>{shortDate(r.voucherDate)} · {String(r.voucherType ?? '—')}</Text>
            <Text style={styles.amt}>{money(r.amount)}</Text>
            {r.narration ? <Text style={{ fontSize: 11, color: palette.textMuted, marginTop: 4 }}>{String(r.narration)}</Text> : null}
          </View>
        ))}
      <TouchableOpacity onPress={() => router.push('/module/vouchers')}><Text style={styles.open}>{t('finance.openVouchers')} ›</Text></TouchableOpacity>
    </SectionWrap>
  );
}

function DonationsSection({ refreshing }: { refreshing: boolean }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const { samplesFor } = useSamples();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rkey = useRefreshKey(refreshing);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const rows = await loadList('donations', { pageSize: 100 }); setRows(rows.length ? rows : (samplesFor('finance.donation', 3) as Row[])); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [samplesFor]);
  useEffect(() => { void load(); }, [load, rkey]);

  const total = useMemo(() => rows.reduce((s, r) => s + asNum(r.amount), 0), [rows]);
  const issued80G = useMemo(() => rows.filter((r) => r.receipt80GIssued === true || r.receipt80GIssued === 'true').length, [rows]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (error) return <Text style={{ color: palette.error, padding: spacing.md }}>{error}</Text>;

  const styles = StyleSheet.create({
    summary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    sumCard: { flex: 1, backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border },
    sumL: { fontSize: 10, color: palette.textMuted, textTransform: 'uppercase' },
    sumV: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginTop: 2 },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm },
    name: { fontSize: 13, fontWeight: '700', color: palette.text },
    meta: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
    amt: { fontSize: 15, fontWeight: '700', color: palette.primary, marginTop: spacing.xs },
    pillRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
    pill: { fontSize: 10, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: palette.backgroundSoft, color: palette.textMuted, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
    empty: { fontSize: 12, color: palette.textMuted, padding: spacing.md, textAlign: 'center' },
    open: { color: palette.primary, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.sm },
  });

  return (
    <SectionWrap refreshing={refreshing} onRefresh={load}>
      {rows.some((r) => (r as Row & { __sample?: boolean }).__sample === true) ? <SampleBanner /> : null}
      <View style={styles.summary}>
        <View style={styles.sumCard}><Text style={styles.sumL}>{t('finance.totalDonations')}</Text><Text style={styles.sumV}>{money(total)}</Text></View>
        <View style={styles.sumCard}><Text style={styles.sumL}>{t('finance.donationsCount')}</Text><Text style={styles.sumV}>{rows.length}</Text></View>
        <View style={styles.sumCard}><Text style={styles.sumL}>80G</Text><Text style={styles.sumV}>{issued80G}</Text></View>
      </View>
      {rows.length === 0 ? <Text style={styles.empty}>{t('finance.noEntries')}</Text> :
        rows.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.name}>{String(r.donorName ?? '—')}</Text>
            <Text style={styles.meta}>{shortDate(r.donationDate)} · {String(r.mode ?? 'cash')}</Text>
            <Text style={styles.amt}>{money(r.amount)}</Text>
            <View style={styles.pillRow}>
              {r.donationType ? <Text style={styles.pill}>{String(r.donationType)}</Text> : null}
              {r.receipt80GIssued === true || r.receipt80GIssued === 'true' ? <Text style={[styles.pill, { borderColor: palette.primary }]}>80G ✓</Text> : null}
              {r.receiptNumber ? <Text style={styles.pill}>{String(r.receiptNumber)}</Text> : null}
            </View>
          </View>
        ))}
      <TouchableOpacity onPress={() => router.push('/module/donations')}><Text style={styles.open}>{t('finance.openDonations')} ›</Text></TouchableOpacity>
    </SectionWrap>
  );
}

function BudgetsSection({ refreshing }: { refreshing: boolean }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const { samplesFor } = useSamples();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rkey = useRefreshKey(refreshing);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const rows = await loadList('budgets', { pageSize: 100 }); setRows(rows.length ? rows : (samplesFor('finance.budget', 3) as Row[])); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [samplesFor]);
  useEffect(() => { void load(); }, [load, rkey]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (error) return <Text style={{ color: palette.error, padding: spacing.md }}>{error}</Text>;

  const styles = StyleSheet.create({
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm },
    top: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontSize: 13, fontWeight: '700', color: palette.text },
    fy: { fontSize: 11, color: palette.textMuted },
    barWrap: { height: 8, backgroundColor: palette.backgroundSoft, borderRadius: radii.pill, marginTop: spacing.sm, overflow: 'hidden' },
    bar: { height: 8, borderRadius: radii.pill },
    legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    legendTxt: { fontSize: 11, color: palette.textMuted },
    legendVal: { fontSize: 11, fontWeight: '700', color: palette.text },
    statusPill: { fontSize: 10, fontWeight: '700', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, overflow: 'hidden' },
    empty: { fontSize: 12, color: palette.textMuted, padding: spacing.md, textAlign: 'center' },
    open: { color: palette.primary, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.sm },
  });

  return (
    <SectionWrap refreshing={refreshing} onRefresh={load}>
      {rows.some((r) => (r as Row & { __sample?: boolean }).__sample === true) ? <SampleBanner /> : null}
      {rows.length === 0 ? <Text style={styles.empty}>{t('finance.noEntries')}</Text> :
        rows.map((r) => {
          const allocated = asNum(r.allocated);
          const spent = asNum(r.spent);
          const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
          const over = spent > allocated;
          const status = String(r.status ?? 'draft');
          const statusColor = status === 'approved' ? palette.primary : status === 'revised' ? palette.border : palette.textMuted;
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.label}>{String(r.category ?? r.department ?? 'Budget')}</Text>
                <Text style={[styles.statusPill, { backgroundColor: statusColor, color: palette.textInverse }]}>{status.toUpperCase()}</Text>
              </View>
              <Text style={styles.fy}>{t('finance.fy')}: {String(r.financialYear ?? '—')}{r.department ? ` · ${r.department}` : ''}</Text>
              <View style={styles.barWrap}>
                <View style={[styles.bar, { width: `${pct}%`, backgroundColor: over ? palette.error : palette.primary }]} />
              </View>
              <View style={styles.legend}>
                <Text style={styles.legendTxt}>{t('finance.spent')}: <Text style={styles.legendVal}>{money(spent)}</Text> ({pct}%)</Text>
                <Text style={styles.legendTxt}>{t('finance.allocated')}: <Text style={styles.legendVal}>{money(allocated)}</Text></Text>
              </View>
            </View>
          );
        })}
      <TouchableOpacity onPress={() => router.push('/module/budgets')}><Text style={styles.open}>{t('finance.openBudgets')} ›</Text></TouchableOpacity>
    </SectionWrap>
  );
}

interface StatementData {
  asOf?: string;
  periodStart?: string;
  periodEnd?: string;
  sections?: { title: string; rows?: { label: string; value: number; credit?: number; debit?: number }[] }[];
  summary?: Record<string, number | string>;
}

function StatementsSection({ refreshing }: { refreshing: boolean }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<string>('trial-balance');
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rkey = useRefreshKey(refreshing);

  const labels = useMemo<Record<string, string>>(() => ({
    'trial-balance': t('finance.trialBalance'),
    'balance-sheet': t('finance.balanceSheet'),
    'income-statement': t('finance.incomeStatement'),
    'cash-flow': t('finance.cashFlow'),
    'bank-reconciliation': t('finance.bankReconciliation'),
  }), [t]);

  const load = useCallback(async (next: string) => {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await api.get(STATEMENT_ENDPOINTS[next] ?? '');
      setData((res.data as { data: StatementData }).data ?? {});
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(tab); }, [tab, load, rkey]);

  const styles = useMemo(() => StyleSheet.create({
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
    pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
    pillActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    pillTxt: { fontSize: 11, color: palette.text, fontWeight: '600' },
    pillTxtActive: { color: palette.textInverse, fontWeight: '700' },
    period: { fontSize: 11, color: palette.textMuted, marginBottom: spacing.xs },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm },
    title: { fontSize: 13, fontWeight: '700', color: palette.text, marginBottom: spacing.xs },
    head: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.border },
    body: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    bodyLast: { borderBottomWidth: 0 },
    cell: { fontSize: 11, color: palette.text, paddingHorizontal: spacing.xs },
    flex: { flex: 1 },
    num: { width: 90, textAlign: 'right' },
    empty: { fontSize: 12, color: palette.textMuted, padding: spacing.md, textAlign: 'center' },
  }), [palette]);

  const period = data?.periodStart && data?.periodEnd ? `${data.periodStart} → ${data.periodEnd}` : data?.asOf ?? '';

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(tab)} tintColor="#2563eb" />}>
      <View style={styles.pillRow}>
        {Object.keys(labels).map((k) => (
          <TouchableOpacity key={k} style={[styles.pill, tab === k && styles.pillActive]} onPress={() => setTab(k)}>
            <Text style={[styles.pillTxt, tab === k && styles.pillTxtActive]}>{labels[k]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator size="large" color={palette.primary} /> : null}
      {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
      {!loading && !error && data ? (
        <>
          {period ? <Text style={styles.period}>{period}</Text> : null}
          {data.sections?.map((section, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.title}>{section.title}</Text>
              <View style={styles.head}>
                <Text style={[styles.cell, styles.flex]}>{t('finance.particular')}</Text>
                {tab === 'trial-balance' ? (
                  <>
                    <Text style={[styles.cell, styles.num]}>{t('finance.debit')}</Text>
                    <Text style={[styles.cell, styles.num]}>{t('finance.credit')}</Text>
                  </>
                ) : <Text style={[styles.cell, styles.num]}>{t('finance.amount')}</Text>}
              </View>
              {(section.rows ?? []).map((row, ri) => (
                <View key={ri} style={[styles.body, ri === (section.rows ?? []).length - 1 && styles.bodyLast]}>
                  <Text style={[styles.cell, styles.flex]}>{row.label}</Text>
                  {tab === 'trial-balance' ? (
                    <>
                      <Text style={[styles.cell, styles.num]}>{fmt(row.debit)}</Text>
                      <Text style={[styles.cell, styles.num]}>{fmt(row.credit)}</Text>
                    </>
                  ) : <Text style={[styles.cell, styles.num]}>{fmt(row.value)}</Text>}
                </View>
              ))}
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}