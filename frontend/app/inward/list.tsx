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

interface InwardRow {
  id: string;
  entryNumber: string;
  status: string;
  fileNo: string;
  senderName: string;
  letterNo: string;
  receivedDate: string | null;
  subject: string;
  issuedTo: string;
  __sample?: boolean;
}

interface HeaderInfo {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#2563eb',
  FINALIZED: '#047857',
};

export default function InwardListScreen() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const { withSamples, samplesFor } = useSamples();
  const [rows, setRows] = useState<InwardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderInfo | null>(null);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const pageSize = 50;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    headerCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, margin: spacing.md, borderWidth: 1, borderColor: palette.border },
    officeName: { fontSize: 15, fontWeight: '700', color: palette.primaryDark, textAlign: 'center' },
    officeSub: { fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 2 },
    title: { fontSize: 18, fontWeight: '700', color: palette.text, textAlign: 'center', marginTop: spacing.sm },
    yearLine: { fontSize: 12, color: palette.primaryDark, textAlign: 'center', marginTop: spacing.xs, fontWeight: '600' },
    toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, flex: 1, minWidth: 150 },
    smallInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, width: 110 },
    dateInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, width: 130 },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    exportBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    exportText: { color: palette.primaryDark, fontWeight: '600', fontSize: 12 },
    error: { color: palette.error, paddingHorizontal: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
    headRow: { backgroundColor: palette.secondary, borderTopWidth: 1, borderTopColor: palette.border },
    cell: { width: 110, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 12, color: palette.text },
    wideCell: { flex: 1, minWidth: 160, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 12, color: palette.text },
    headCell: { fontWeight: '700', color: palette.primaryDark, fontSize: 11 },
    statusBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start' },
    statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    pageBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    pageBtnDisabled: { opacity: 0.4 },
    pageText: { color: palette.primaryDark, fontWeight: '600' },
    pageInfo: { fontSize: 12, color: palette.textMuted },
  }), [palette]);

  const load = useCallback(async (p: number, s?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/inward', {
        params: {
          page: p,
          pageSize,
          ...(s || status ? { status: s ?? status } : {}),
          ...(year ? { year } : {}),
          ...(month ? { month } : {}),
          ...(dateFrom ? { from: dateFrom } : {}),
          ...(dateTo ? { to: dateTo } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      setRows((res.data as { data: InwardRow[] }).data);
      setTotal((res.data as { pagination: { total: number } }).pagination.total);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, year, month, dateFrom, dateTo, status]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/inward/meta');
        setHeader((res.data as { data: { header: HeaderInfo } }).data.header);
      } catch {
        setHeader(null);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
    void load(1);
  }, [search, year, month, dateFrom, dateTo, status, load]);

  async function doExport(kind: 'csv' | 'xlsx' | 'pdf') {
    try {
      const token = await tokenStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (year) params.set('year', year);
      if (month) params.set('month', month);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (status) params.set('status', status);
      const qs = params.toString();
      const url = `${API_BASE_URL}/inward/export/${kind}${qs ? `?${qs}` : ''}`;
      if (Platform.OS === 'web') {
        const w = window as unknown as { open: (u: string) => void };
        w.open(url);
      } else {
        const res = await api.get(`/inward/export/${kind}`, { params });
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        void (await import('react-native')).Share.share({ message: text.slice(0, 5000) });
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const displayTitle = t(lang === 'mr' ? 'inward.titleMr' : 'inward.title');
  const officeName = lang === 'mr' ? ((header?.officeNameMr || header?.officeName) ?? '') : (header?.officeName ?? '');

  if (loading && page === 1 && rows.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.officeName}>{t('inward.officeOfThe')}</Text>
        <Text style={styles.title}>{officeName || t('inward.office')}</Text>
        <Text style={styles.officeSub}>
          {t('inward.taluka')} {header?.talukaName ? ` ${header.talukaName}` : ''}   {t('inward.district')} {header?.districtName ? ` ${header.districtName}` : ''}
        </Text>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.yearLine}>{t('inward.forTheYear')} {year || new Date().getFullYear()}</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput style={styles.input} placeholder={t('inward.search')} value={search} onChangeText={setSearch} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.smallInput} placeholder={t('inward.year')} value={year} onChangeText={setYear} placeholderTextColor={palette.textMuted} keyboardType="number-pad" />
        <TextInput style={styles.smallInput} placeholder={t('inward.month')} value={month} onChangeText={setMonth} placeholderTextColor={palette.textMuted} keyboardType="number-pad" />
        <TextInput style={styles.dateInput} placeholder={t('inward.filterByDateRange')} value={dateFrom} onChangeText={setDateFrom} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.dateInput} placeholder="—" value={dateTo} onChangeText={setDateTo} placeholderTextColor={palette.textMuted} />
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/inward/new')}>
          <Text style={styles.addButtonText}>{t('inward.newEntry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('xlsx')}><Text style={styles.exportText}>{t('inward.excelExport')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('pdf')}><Text style={styles.exportText}>{t('inward.pdfExport')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('pdf')}><Text style={styles.exportText}>{t('inward.print')}</Text></TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {rows.length === 0 && samplesFor('reg.inward', 1).length > 0 ? <SampleBanner /> : null}

      <View style={styles.headRow}>
        <Text style={[styles.cell, styles.headCell]}>{t('inward.srNoFileNo')}</Text>
        <Text style={[styles.wideCell, styles.headCell]}>{t('inward.fromWhomReceived')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('inward.letterNo')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('inward.date')}</Text>
        <Text style={[styles.wideCell, styles.headCell]}>{t('inward.subject')}</Text>
        <Text style={[styles.wideCell, styles.headCell]}>{t('inward.toWhomIssued')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('inward.status')}</Text>
      </View>

      <FlatList
        data={withSamples(rows, 'reg.inward', 3)}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>{t('inward.listEmpty')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/inward/[id]', params: { id: item.id } })}>
            <Text style={styles.cell}>{item.entryNumber}{item.fileNo ? ` / ${item.fileNo}` : ''}</Text>
            <Text style={styles.wideCell}>{item.senderName}</Text>
            <Text style={styles.cell}>{item.letterNo}</Text>
            <Text style={styles.cell}>{item.receivedDate ? String(item.receivedDate).slice(0, 10) : '—'}</Text>
            <Text style={styles.wideCell} numberOfLines={2}>{item.subject}</Text>
            <Text style={styles.wideCell}>{item.issuedTo}</Text>
            <View style={styles.cell}>
              {item.__sample ? <SampleBadge /> : null}
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6b7280' }]}>
                <Text style={styles.statusText}>{t(`inward.status${item.status}`)}</Text>
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