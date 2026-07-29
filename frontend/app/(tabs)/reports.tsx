import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface ReportMeta {
  key: string;
  label: string;
  labelMr: string;
  endpoint: string;
}

const REPORTS: ReportMeta[] = [
  { key: 'admissions', label: 'Admissions', labelMr: 'प्रवेश', endpoint: '/reports/admissions' },
  { key: 'discharges', label: 'Discharges', labelMr: 'डिस्चार्ज', endpoint: '/reports/discharges' },
  { key: 'deaths', label: 'Deaths', labelMr: 'मृत्यू', endpoint: '/reports/deaths' },
  { key: 'medical', label: 'Medical', labelMr: 'वैद्यकीय', endpoint: '/reports/medical' },
  { key: 'medicine', label: 'Medicine', labelMr: 'औषध', endpoint: '/reports/medicine' },
  { key: 'attendance', label: 'Attendance', labelMr: 'उपस्थिती', endpoint: '/reports/attendance' },
  { key: 'kitchen', label: 'Kitchen', labelMr: 'स्वयंपाक', endpoint: '/reports/kitchen' },
  { key: 'diet', label: 'Diet', labelMr: 'आहार', endpoint: '/reports/diet' },
  { key: 'laundry', label: 'Laundry', labelMr: 'धुलाई', endpoint: '/reports/laundry' },
  { key: 'housekeeping', label: 'Housekeeping', labelMr: 'घरकाम', endpoint: '/reports/housekeeping' },
  { key: 'incidents', label: 'Incidents', labelMr: 'घटना', endpoint: '/reports/incidents' },
  { key: 'visitors', label: 'Visitors', labelMr: 'भेटी', endpoint: '/reports/visitors' },
  { key: 'emergencies', label: 'Emergencies', labelMr: 'आपत्काल', endpoint: '/reports/emergencies' },
  { key: 'monthly', label: 'Monthly', labelMr: 'मासिक', endpoint: '/reports/monthly' },
  { key: 'finance', label: 'Finance', labelMr: 'वित्त', endpoint: '/reports/finance' },
  { key: 'ledger', label: 'Ledger', labelMr: 'खाती', endpoint: '/reports/ledger' },
  { key: 'donations', label: 'Donations', labelMr: 'देणगी', endpoint: '/reports/donations' },
  { key: 'inventory', label: 'Inventory', labelMr: 'साठा', endpoint: '/reports/inventory' },
  { key: 'assets', label: 'Assets', labelMr: 'मालमत्ता', endpoint: '/reports/assets' },
  { key: 'payroll', label: 'Payroll', labelMr: 'वेतनपत्र', endpoint: '/reports/payroll' },
  { key: 'complaints', label: 'Complaints', labelMr: 'तक्रारी', endpoint: '/reports/complaints' },
  { key: 'audits', label: 'Audits', labelMr: 'लेखापरीक्षण', endpoint: '/reports/audits' },
];

export default function ReportsScreen() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<ReportMeta | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, flexDirection: 'row', backgroundColor: palette.background },
    sidebar: { width: 180, backgroundColor: palette.surface, borderRightWidth: 1, borderRightColor: palette.border },
    heading: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, padding: spacing.md },
    reportItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.border },
    reportItemActive: { backgroundColor: palette.secondary },
    reportText: { fontSize: 13, fontWeight: '600', color: palette.text },
    reportSub: { fontSize: 11, color: palette.textMuted, marginTop: spacing.xs },
    reportTextActive: { color: palette.primaryDark },
    content: { flex: 1, padding: spacing.md },
    contentTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    recordCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: palette.border },
    recordRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.border },
    recordKey: { fontSize: 12, color: palette.textMuted, flex: 1 },
    recordValue: { fontSize: 12, color: palette.text, fontWeight: '600', flex: 1, textAlign: 'right' },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: spacing.xl },
    error: { color: palette.error, textAlign: 'center', marginTop: spacing.xl },
  }), [palette]);

  async function loadReport(meta: ReportMeta) {
    setSelected(meta);
    setLoading(true);
    setError(null);
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
    if (Array.isArray(v)) return `${v.length} item(s)`;
    return JSON.stringify(v).slice(0, 80);
  }

  function renderData() {
    if (loading) return <ActivityIndicator size="large" color={palette.primary} />;
    if (error) return <Text style={styles.error}>{error}</Text>;
    if (!data) return <Text style={styles.empty}>{t('reports.selectReport')}</Text>;

    if (Array.isArray(data)) {
      return (
        <FlatList
          data={data}
          keyExtractor={(_, i) => String(i)}
          ListEmptyComponent={<Text style={styles.empty}>{t('reports.noRecords')}</Text>}
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                <View key={k} style={styles.recordRow}>
                  <Text style={styles.recordKey}>{k}</Text>
                  <Text style={styles.recordValue}>{renderValue(v)}</Text>
                </View>
              ))}
            </View>
          )}
        />
      );
    }

    return (
      <View style={styles.recordCard}>
        {Object.entries(data as Record<string, unknown>).map(([k, v]) => (
          <View key={k} style={styles.recordRow}>
            <Text style={styles.recordKey}>{k}</Text>
            <Text style={styles.recordValue}>{renderValue(v)}</Text>
          </View>
        ))}
      </View>
    );
  }

  const selectedLabel = selected ? (lang === 'en' ? selected.label : (selected.labelMr || selected.label)) : t('reports.selectReport');

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <Text style={styles.heading}>{t('reports.title')}</Text>
        <FlatList
          data={REPORTS}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ padding: spacing.sm }}
          renderItem={({ item }) => {
            const label = lang === 'en' ? item.label : (item.labelMr || item.label);
            return (
              <TouchableOpacity
                style={[styles.reportItem, selected?.key === item.key && styles.reportItemActive]}
                onPress={() => void loadReport(item)}
              >
                <Text style={[styles.reportText, selected?.key === item.key && styles.reportTextActive]}>
                  {label}
                </Text>
                <Text style={[styles.reportSub, selected?.key === item.key && styles.reportTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.contentTitle}>{selectedLabel}</Text>
        {renderData()}
      </View>
    </View>
  );
}