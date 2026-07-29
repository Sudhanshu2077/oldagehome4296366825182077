import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

type StatementTab = 'trial-balance' | 'balance-sheet' | 'income-statement' | 'cash-flow' | 'bank-reconciliation';

const ENDPOINTS: Record<StatementTab, string> = {
  'trial-balance': '/finance-statements/trial-balance',
  'balance-sheet': '/finance-statements/balance-sheet',
  'income-statement': '/finance-statements/income-statement',
  'cash-flow': '/finance-statements/cash-flow',
  'bank-reconciliation': '/finance-statements/bank-reconciliation',
};

interface StatementSection {
  title: string;
  rows?: { label: string; value: number; credit?: number; debit?: number }[];
}

interface StatementData {
  asOf?: string;
  periodStart?: string;
  periodEnd?: string;
  sections?: StatementSection[];
  summary?: Record<string, number | string>;
}

export default function FinanceStatementsScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<StatementTab>('trial-balance');
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabLabels = useMemo<Record<StatementTab, string>>(() => ({
    'trial-balance': t('finance.trialBalance'),
    'balance-sheet': t('finance.balanceSheet'),
    'income-statement': t('finance.incomeStatement'),
    'cash-flow': t('finance.cashFlow'),
    'bank-reconciliation': t('finance.bankReconciliation'),
  }), [t]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    heading: { fontSize: 18, fontWeight: '700', color: palette.primaryDark, padding: spacing.md, paddingBottom: 0 },
    tabBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
    tab: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: palette.surface },
    tabActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    tabText: { fontSize: 12, color: palette.text, fontWeight: '500' },
    tabTextActive: { color: palette.textInverse, fontWeight: '600' },
    content: { flex: 1, padding: spacing.md },
    error: { color: palette.error, textAlign: 'center' },
  }), [palette]);

  useEffect(() => {
    void loadTab(tab);
  }, [tab]);

  async function loadTab(next: StatementTab) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.get(ENDPOINTS[next]);
      setData((res.data as { data: StatementData }).data ?? {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('finance.title')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {(Object.keys(tabLabels) as StatementTab[]).map((tk) => (
          <TouchableOpacity
            key={tk}
            style={[styles.tab, tab === tk && styles.tabActive]}
            onPress={() => setTab(tk)}
          >
            <Text style={[styles.tabText, tab === tk && styles.tabTextActive]}>{tabLabels[tk]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {loading ? <ActivityIndicator size="large" color={palette.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && data ? <StatementView tab={tab} data={data} /> : null}
      </View>
    </View>
  );
}

function StatementView({ tab, data }: { tab: StatementTab; data: StatementData }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const period = data.periodStart && data.periodEnd
    ? `${data.periodStart} → ${data.periodEnd}`
    : data.asOf ?? '';

  const styles = useMemo(() => StyleSheet.create({
    period: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.sm },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    summaryCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border, minWidth: 120, flex: 1 },
    summaryValue: { fontSize: 16, fontWeight: '700', color: palette.primaryDark },
    summaryLabel: { fontSize: 11, color: palette.textMuted, marginTop: 2, textTransform: 'capitalize' },
    sectionCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: palette.border },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.text, marginBottom: spacing.sm },
    table: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, overflow: 'hidden' },
    headRow: { flexDirection: 'row', backgroundColor: palette.secondary, paddingVertical: spacing.sm },
    bodyRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: palette.border, paddingVertical: spacing.sm },
    cell: { fontSize: 12, color: palette.text, paddingHorizontal: spacing.sm },
    flexCell: { flex: 1 },
    numberCell: { width: 80, textAlign: 'right' },
    bodyCell: { color: palette.text },
  }), [palette]);

  return (
    <ScrollView style={{ flex: 1 }}>
      <Text style={styles.period}>{period}</Text>

      {data.summary ? (
        <View style={styles.summaryGrid}>
          {Object.entries(data.summary).map(([key, value]) => (
            <View key={key} style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{formatValue(value)}</Text>
              <Text style={styles.summaryLabel}>{key}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.sections?.map((section, idx) => (
        <View key={idx} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.table}>
            <View style={styles.headRow}>
              <Text style={[styles.cell, styles.flexCell]}>{t('finance.particular')}</Text>
              {tab === 'trial-balance' ? (
                <>
                  <Text style={[styles.cell, styles.numberCell]}>{t('finance.debit')}</Text>
                  <Text style={[styles.cell, styles.numberCell]}>{t('finance.credit')}</Text>
                </>
              ) : (
                <Text style={[styles.cell, styles.numberCell]}>{t('finance.amount')}</Text>
              )}
            </View>
            {(section.rows ?? []).map((row, ridx) => (
              <View key={ridx} style={styles.bodyRow}>
                <Text style={[styles.cell, styles.flexCell, styles.bodyCell]}>{row.label}</Text>
                {tab === 'trial-balance' ? (
                  <>
                    <Text style={[styles.cell, styles.numberCell, styles.bodyCell]}>{formatValue(row.debit ?? 0)}</Text>
                    <Text style={[styles.cell, styles.numberCell, styles.bodyCell]}>{formatValue(row.credit ?? 0)}</Text>
                  </>
                ) : (
                  <Text style={[styles.cell, styles.numberCell, styles.bodyCell]}>{formatValue(row.value)}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function formatValue(value: number | string | undefined): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'number') return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(value);
}