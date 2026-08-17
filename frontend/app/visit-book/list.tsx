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

interface VisitBookRow {
  id: string;
  entryNumber: string;
  status: string;
  entryDate: string | null;
  officerName: string;
  officerPost: string;
  remark: string;
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

export default function VisitBookListScreen() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<VisitBookRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderInfo | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const pageSize = 50;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    headerCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, margin: spacing.md, borderWidth: 1, borderColor: palette.border },
    officeName: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, textAlign: 'center' },
    sub: { fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 2 },
    title: { fontSize: 18, fontWeight: '700', color: palette.text, textAlign: 'center', marginTop: spacing.sm },
    toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, flex: 1, minWidth: 140 },
    smallInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, width: 150 },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    exportBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    exportText: { color: palette.primaryDark, fontWeight: '600', fontSize: 12 },
    error: { color: palette.error, paddingHorizontal: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
    headRow: { backgroundColor: palette.secondary, borderTopWidth: 1, borderTopColor: palette.border },
    cell: { width: 130, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 12, color: palette.text },
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
      const res = await api.get('/visit-book', {
        params: {
          page: p,
          pageSize,
          ...(s || status ? { status: s ?? status } : {}),
          ...(dateFrom ? { from: dateFrom } : {}),
          ...(dateTo ? { to: dateTo } : {}),
          ...(search.trim() ? { officer: search.trim() } : {}),
        },
      });
      setRows((res.data as { data: VisitBookRow[] }).data);
      setTotal((res.data as { pagination: { total: number } }).pagination.total);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, status]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/visit-book/meta');
        setHeader((res.data as { data: { header: HeaderInfo } }).data.header);
      } catch {
        setHeader(null);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
    void load(1);
  }, [search, dateFrom, dateTo, status, load]);

  async function doExport(kind: 'csv' | 'xlsx' | 'pdf') {
    try {
      const token = await tokenStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (search.trim()) params.set('officer', search.trim());
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (status) params.set('status', status);
      const qs = params.toString();
      const url = `${API_BASE_URL}/visit-book/export/${kind}${qs ? `?${qs}` : ''}`;
      if (Platform.OS === 'web') {
        const w = window as unknown as { open: (u: string) => void };
        w.open(url);
      } else {
        const res = await api.get(`/visit-book/export/${kind}`, { params });
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        void (await import('react-native')).Share.share({ message: text.slice(0, 5000) });
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const displayTitle = lang === 'en' ? t('visitbook.title') : t('visitbook.titleMr');
  const officeName = lang === 'en' || !header ? header?.officeName ?? '' : (header.officeNameMr || header.officeName);

  if (loading && page === 1 && rows.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.officeName}>{officeName || t('visitbook.office')}</Text>
        <Text style={styles.sub}>
          {t('visitbook.taluka')} {header?.talukaName ? ` ${header.talukaName}` : ''}   {t('visitbook.district')} {header?.districtName ? ` ${header.districtName}` : ''}
        </Text>
        <Text style={styles.title}>{displayTitle}</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput style={styles.input} placeholder={t('visitbook.search')} value={search} onChangeText={setSearch} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.smallInput} placeholder={t('visitbook.filterByDate')} value={dateFrom} onChangeText={setDateFrom} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.smallInput} placeholder="—" value={dateTo} onChangeText={setDateTo} placeholderTextColor={palette.textMuted} />
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/visit-book/new')}>
          <Text style={styles.addButtonText}>{t('visitbook.newEntry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('csv')}><Text style={styles.exportText}>{t('visitbook.excelExport')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('pdf')}><Text style={styles.exportText}>{t('visitbook.pdfExport')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('pdf')}><Text style={styles.exportText}>{t('visitbook.print')}</Text></TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>{t('visitbook.listEmpty')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/visit-book/[id]', params: { id: item.id } })}>
            <Text style={styles.cell}>{item.entryNumber}</Text>
            <Text style={styles.cell}>{item.entryDate ? String(item.entryDate).slice(0, 10) : '—'}</Text>
            <Text style={[styles.cell, { width: 200 }]}>{item.officerName}{item.officerPost ? `, ${item.officerPost}` : ''}</Text>
            <Text style={[styles.cell, { width: 240 }]}>{item.remark}</Text>
            <View style={[styles.cell, { width: 100 }]}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6b7280' }]}>
                <Text style={styles.statusText}>{t(`visitbook.status${item.status}`)}</Text>
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
          <Text style={styles.pageInfo}>{t('visitbook.srNo')} {page} / {totalPages}</Text>
          <TouchableOpacity style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]} disabled={page >= totalPages} onPress={() => { setPage(page + 1); void load(page + 1); }}>
            <Text style={styles.pageText}>›</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
