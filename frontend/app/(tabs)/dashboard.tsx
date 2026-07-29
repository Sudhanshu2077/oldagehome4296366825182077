import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { spacing, radii } from '../../src/config/theme';

interface DashboardData {
  kpis: { key: string; label: string; labelMr: string; value: number }[];
  cards: { key: string; title: string; titleMr: string; body: string }[];
  recentActivity: { id: string; event: string; timestamp: string }[];
  pendingTasks: { id: string; title: string }[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/dashboard');
        setData((res.data as { data: DashboardData }).data);
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, []);

  if (error) return <View style={[styles.center, { backgroundColor: palette.background }]}><Text style={styles.error}>{error}</Text></View>;
  if (!data) return <View style={[styles.center, { backgroundColor: palette.background }]}><ActivityIndicator size="large" color={palette.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.greeting, { color: palette.primaryDark }]}>{t('dashboard.greeting')}, {user?.displayName || user?.email}</Text>
        <Text style={[styles.roleText, { color: palette.textMuted }]}>{user?.role}</Text>
      </View>

      <View style={styles.kpiRow}>
        {data.kpis.map((kpi) => (
          <View key={kpi.key} style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.kpiValue, { color: palette.primary }]}>{kpi.value}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textMuted }]}>{lang === 'en' ? kpi.label : (kpi.labelMr || kpi.label)}</Text>
          </View>
        ))}
      </View>

      {data.pendingTasks.length > 0 ? (
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('dashboard.pendingTasks')}</Text>
          {data.pendingTasks.map((task) => (
            <View key={task.id} style={[styles.pendingItem, { borderColor: palette.borderSoft }]}>
              <Text style={styles.bullet}>•</Text>
              <Text style={[styles.pendingText, { color: palette.warning }]}>{task.title}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('dashboard.registersThisMonth')}</Text>
        {data.cards.map((c) => (
          <View key={c.key} style={[styles.card, { borderColor: palette.borderSoft }]}>
            <Text style={[styles.cardTitle, { color: palette.primaryDark }]}>{lang === 'en' ? c.title : (c.titleMr || c.title)}</Text>
            <Text style={[styles.cardBody, { color: palette.textMuted }]}>{c.body}</Text>
          </View>
        ))}
      </View>

      {data.recentActivity.length > 0 ? (
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('dashboard.recentActivity')}</Text>
          {data.recentActivity.map((a) => (
            <View key={a.id} style={[styles.activityItem, { borderColor: palette.borderSoft }]}>
              <Text style={styles.bullet}>•</Text>
              <Text style={[styles.activityText, { color: palette.text }]}>{a.event}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626' },
  hero: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl, marginBottom: spacing.lg, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  greeting: { fontSize: 20, fontWeight: '800' },
  roleText: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, minWidth: 100, flexGrow: 1, alignItems: 'center' },
  kpiValue: { fontSize: 26, fontWeight: '800' },
  kpiLabel: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  section: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.md },
  pendingItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  pendingText: { fontSize: 13, fontWeight: '500' },
  card: { paddingVertical: spacing.sm, borderBottomWidth: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardBody: { fontSize: 12, marginTop: 2 },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  activityText: { fontSize: 13 },
  bullet: { fontSize: 16, color: '#999' },
});