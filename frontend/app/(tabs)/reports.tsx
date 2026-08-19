import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { useSamples } from '../../src/sample/SampleContext';
import { ScreenHeader, EmptyState, SampleBadge, SampleBanner, KeyValueRow } from '../../src/components/ui';

interface ReportMeta {
  key: string;
  endpoint: string;
}

const REPORTS: ReportMeta[] = [
  { key: 'admissions', endpoint: '/reports/admissions' },
  { key: 'discharges', endpoint: '/reports/discharges' },
  { key: 'deaths', endpoint: '/reports/deaths' },
  { key: 'medical', endpoint: '/reports/medical' },
  { key: 'medicine', endpoint: '/reports/medicine' },
  { key: 'attendance', endpoint: '/reports/attendance' },
  { key: 'kitchen', endpoint: '/reports/kitchen' },
  { key: 'diet', endpoint: '/reports/diet' },
  { key: 'laundry', endpoint: '/reports/laundry' },
  { key: 'housekeeping', endpoint: '/reports/housekeeping' },
  { key: 'incidents', endpoint: '/reports/incidents' },
  { key: 'visitors', endpoint: '/reports/visitors' },
  { key: 'emergencies', endpoint: '/reports/emergencies' },
  { key: 'monthly', endpoint: '/reports/monthly' },
  { key: 'finance', endpoint: '/reports/finance' },
  { key: 'ledger', endpoint: '/reports/ledger' },
  { key: 'donations', endpoint: '/reports/donations' },
  { key: 'inventory', endpoint: '/reports/inventory' },
  { key: 'assets', endpoint: '/reports/assets' },
  { key: 'payroll', endpoint: '/reports/payroll' },
  { key: 'complaints', endpoint: '/reports/complaints' },
  { key: 'audits', endpoint: '/reports/audits' },
];

type Row = Record<string, unknown> & { __sample?: true };

export default function ReportsScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const { withSamples } = useSamples();
  const [selected, setSelected] = useState<ReportMeta | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: spacing.sm },
    reportCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: palette.surface, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, marginBottom: spacing.xs },
    reportCardActive: { borderColor: palette.primary, backgroundColor: palette.secondary },
    monogram: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    monogramText: { fontSize: 16, fontWeight: '800', color: palette.textInverse },
    reportLabel: { fontSize: 14, fontWeight: '700', color: palette.text },
    reportHint: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: palette.surface },
    backText: { color: palette.primary, fontWeight: '600', fontSize: 12 },
    detailTitle: { fontSize: 17, fontWeight: '700', color: palette.primaryDark, flex: 1 },
    recordCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: palette.border },
    error: { color: palette.error, textAlign: 'center', marginTop: spacing.xl },
    empty: { color: palette.textMuted, textAlign: 'center', marginTop: spacing.xl },
    countPill: { fontSize: 11, color: palette.primary, fontWeight: '700' },
  }), [palette]);

  async function loadReport(meta: ReportMeta) {
    setSelected(meta);
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.get(meta.endpoint);
      setData((res.data as { data: unknown }).data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function renderValue(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return v;
    if (typeof v === 'boolean') return v ? t('common.yes') : t('common.no');
    if (Array.isArray(v)) return `${v.length} ${t('reports.items')}`;
    return JSON.stringify(v).slice(0, 80);
  }

  function formatKey(k: string): string {
    return k
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  function renderRecords(records: Row[]) {
    return (
      <>
        {records.length === 0 ? (
          <EmptyState message={t('reports.noRecords')} />
        ) : (
          records.map((item) => (
            <View key={item.id as string} style={styles.recordCard}>
              {item.__sample ? <SampleBadge /> : null}
              {Object.entries(item).filter(([k]) => k !== '__sample' && k !== 'id').map(([k, v], idx, arr) => (
                <KeyValueRow key={k} label={formatKey(k)} value={renderValue(v)} last={idx === arr.length - 1} />
              ))}
            </View>
          ))
        )}
      </>
    );
  }

  function renderData() {
    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
    if (error) return <Text style={styles.error}>{error}</Text>;

    const shown: Row[] = withSamples((Array.isArray(data) ? data : []) as Row[], `reports.${selected?.key ?? ''}`, 3);
    if (Array.isArray(data)) {
      return renderRecords(shown);
    }
    if (data && typeof data === 'object') {
      return (
        <View style={styles.recordCard}>
          {Object.entries(data as Record<string, unknown>).map(([k, v]) => (
            <KeyValueRow key={k} label={formatKey(k)} value={renderValue(v)} />
          ))}
        </View>
      );
    }
    return <EmptyState message={t('reports.selectReport')} />;
  }

  if (!selected) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('reports.title')} subtitle={t('reports.selectReport')} />
        <FlatList
          data={REPORTS}
          keyExtractor={(r) => r.key}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => {
            const label = t(`reports.${item.key}`);
            return (
              <TouchableOpacity
                style={[styles.reportCard, { flexBasis: '47%', flexGrow: 1 }]}
                onPress={() => void loadReport(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.monogram, { backgroundColor: palette.primary }]}>
                  <Text style={styles.monogramText}>{label.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.reportLabel}>{label}</Text>
                <Text style={styles.reportHint}>{item.endpoint.replace('/reports/', '')}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  }

  const recordCount = Array.isArray(data) ? (data as Row[]).length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelected(null)} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ {t('reports.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle} numberOfLines={1}>{t(`reports.${selected.key}`)}</Text>
      </View>
      {!loading && !error && recordCount === 0 && Array.isArray(data) ? <SampleBanner /> : null}
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {!loading && !error && Array.isArray(data) && recordCount > 0 ? (
          <Text style={styles.countPill}>{recordCount} {t('reports.items')}</Text>
        ) : null}
        {renderData()}
      </ScrollView>
    </View>
  );
}