import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { useSamples } from '../../src/sample/SampleContext';
import { SampleBadge, SampleBanner } from '../../src/components/ui';

interface AdmissionRow {
  id: string;
  applicationNumber: string;
  status: string;
  name: string;
  currentAge: number | null;
  createdAt: string;
  __sample?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#2563eb',
  PENDING_REVIEW: '#9333ea',
  RECOMMENDED: '#16a34a',
  NOT_RECOMMENDED: '#ea580c',
  APPROVED: '#047857',
  REJECTED: '#dc2626',
  QUERY_RAISED: '#d97706',
};

export default function AdmissionListScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const { withSamples, samplesFor } = useSamples();
  const [rows, setRows] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const canWrite = user?.tier === 'institution' && (user?.role === 'assistant-manager' || user?.role === 'institution-head' || user?.role === 'department-user');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    title: { fontSize: 17, fontWeight: '700', color: palette.primaryDark },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap' },
    chip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 11, color: palette.text },
    chipTextActive: { color: palette.textInverse },
    error: { color: palette.error, paddingHorizontal: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: palette.border },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    appNo: { fontSize: 13, fontWeight: '700', color: palette.primaryDark },
    statusBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
    name: { fontSize: 15, fontWeight: '600', color: palette.text, marginTop: spacing.sm },
    meta: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    action: { color: palette.primary, fontWeight: '600', fontSize: 13 },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admissions', { params: { pageSize: 100, ...(status ? { status } : {}) } });
      setRows((res.data as { data: AdmissionRow[] }).data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  const statuses = ['DRAFT', 'SUBMITTED', 'PENDING_REVIEW', 'RECOMMENDED', 'NOT_RECOMMENDED', 'APPROVED', 'REJECTED', 'QUERY_RAISED'];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('admission.title')}</Text>
        {canWrite ? (
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/admission/new')}>
            <Text style={styles.addButtonText}>{t('admission.newApplication')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.chip, !status && styles.chipActive]} onPress={() => setStatus('')}>
          <Text style={[styles.chipText, !status && styles.chipTextActive]}>{t('common.all') ?? 'All'}</Text>
        </TouchableOpacity>
        {statuses.map((s) => (
          <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
            <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{t(`admission.status.${s}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {rows.length === 0 && samplesFor('reg.admission', 1).length > 0 ? <SampleBanner /> : null}

      <FlatList
        data={withSamples(rows, 'reg.admission', 3)}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={<Text style={styles.empty}>{t('admission.listEmpty')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/admission/[id]', params: { id: item.id } })}>
            {item.__sample ? <SampleBadge /> : null}
            <View style={styles.cardTop}>
              <Text style={styles.appNo}>{item.applicationNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6b7280' }]}>
                <Text style={styles.statusText}>{t(`admission.status.${item.status}`)}</Text>
              </View>
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{t('admission.age')}: {item.currentAge ?? '—'}</Text>
            <View style={styles.actions}>
              <Text style={styles.action}>{t('admission.open')}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}