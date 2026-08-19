import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { tokenStorage } from '../../src/api/storage';
import { API_BASE_URL } from '../../src/config/env';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { useSamples } from '../../src/sample/SampleContext';
import { SampleBadge, SampleBanner } from '../../src/components/ui';

interface SessionRow {
  id: string;
  sessionId: string;
  attendanceDate: string;
  status: string;
  entries: unknown[];
  corrections: unknown[];
  __sample?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#047857',
};

export default function AttListScreen() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const { withSamples, samplesFor } = useSamples();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<{ officeName: string; officeNameMr: string; talukaName: string; districtName: string } | null>(null);
  const [date, setDate] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const pageSize = 50;

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    headerCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, margin: spacing.md, borderWidth: 1, borderColor: palette.border },
    officeName: { fontSize: 15, fontWeight: '700', color: palette.primaryDark, textAlign: 'center' },
    sub: { fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 2 },
    title: { fontSize: 16, fontWeight: '700', color: palette.text, textAlign: 'center', marginTop: spacing.sm },
    toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, flex: 1, minWidth: 140 },
    smallInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, width: 90 },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    exportBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    exportText: { color: palette.primaryDark, fontWeight: '600', fontSize: 12 },
    error: { color: palette.error, paddingHorizontal: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
    sessionId: { fontSize: 13, fontWeight: '700', color: palette.primaryDark },
    sessionSub: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
    statusBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
    rightBox: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    pageBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    pageBtnDisabled: { opacity: 0.4 },
    pageText: { color: palette.primaryDark, fontWeight: '600' },
    pageInfo: { fontSize: 12, color: palette.textMuted },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: palette.primaryDark, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.xs },
  }), [palette]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get('/resident-attendance/sessions', { params: { page: p, pageSize } });
      setSessions((res.data as { data: SessionRow[] }).data);
      setTotal((res.data as { pagination: { total: number } }).pagination.total);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/resident-attendance/meta');
        setHeader((res.data as { data: { header: { officeName: string; officeNameMr: string; talukaName: string; districtName: string } } }).data.header);
      } catch {
        setHeader(null);
      }
    })();
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function doExport(kind: 'daily-pdf' | 'monthly-pdf' | 'daily-csv' | 'monthly-csv') {
    try {
      const params = new URLSearchParams();
      if (kind.includes('daily')) params.set('date', date || today);
      else {
        params.set('year', year);
        params.set('month', month);
      }
      const qs = params.toString();
      const url = `${API_BASE_URL}/resident-attendance/export/${kind}${qs ? `?${qs}` : ''}`;
      if (Platform.OS === 'web') {
        const w = window as unknown as { open: (u: string) => void };
        w.open(url);
      } else {
        const res = await api.get(`/resident-attendance/export/${kind}`, { params });
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        void (await import('react-native')).Share.share({ message: text.slice(0, 5000) });
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const officeName = lang === 'mr' ? ((header?.officeNameMr || header?.officeName) ?? '') : (header?.officeName ?? '');
  const displayTitle = t(lang === 'mr' ? 'att.titleMr' : 'att.title');

  if (loading && page === 1 && sessions.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.officeName}>{t('att.institutionName')} {officeName || t('att.office')}</Text>
        <Text style={styles.sub}>
          {t('att.taluka')} {header?.talukaName ? ` ${header.talukaName}` : ''}   {t('att.district')} {header?.districtName ? ` ${header.districtName}` : ''}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>{t('att.dailyView')}</Text>
      <View style={styles.toolbar}>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder={today} placeholderTextColor={palette.textMuted} />
        <TouchableOpacity style={styles.addButton} onPress={() => router.push({ pathname: '/resident-attendance/[date]', params: { date: date || today } })}>
          <Text style={styles.addButtonText}>{t('att.attendanceDate')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('daily-pdf')}><Text style={styles.exportText}>{t('att.exportPdf')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('daily-csv')}><Text style={styles.exportText}>{t('att.exportCsv')}</Text></TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>{t('att.monthlyView')}</Text>
      <View style={styles.toolbar}>
        <TextInput style={styles.smallInput} value={year} onChangeText={setYear} placeholder={t('att.year')} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.smallInput} value={month} onChangeText={setMonth} placeholder={t('att.month')} placeholderTextColor={palette.textMuted} />
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('monthly-pdf')}><Text style={styles.exportText}>{t('att.exportPdf')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('monthly-csv')}><Text style={styles.exportText}>{t('att.exportCsv')}</Text></TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {sessions.length === 0 && samplesFor('reg.attendance', 1).length > 0 ? <SampleBanner /> : null}

      <Text style={styles.sectionLabel}>{t('att.submitSummary')}</Text>
      <FlatList
        data={withSamples(sessions, 'reg.attendance', 3)}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>{t('att.listEmpty')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/resident-attendance/[date]', params: { date: String(item.attendanceDate).slice(0, 10) } })}>
            <View>
              <Text style={styles.sessionId}>{item.sessionId}</Text>
              <Text style={styles.sessionSub}>{String(item.attendanceDate).slice(0, 10)} · {item.entries?.length ?? 0} {t('att.marked')}</Text>
            </View>
            <View style={styles.rightBox}>
              {item.__sample ? <SampleBadge /> : null}
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6b7280' }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {totalPages > 1 ? (
        <View style={styles.pagination}>
          <TouchableOpacity style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]} disabled={page <= 1} onPress={() => { setPage(page - 1); void load(page - 1); }}>
            <Text style={styles.pageText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
          <TouchableOpacity style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]} disabled={page >= totalPages} onPress={() => { setPage(page + 1); void load(page + 1); }}>
            <Text style={styles.pageText}>›</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}