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

interface InOutRow {
  id: string;
  entryNumber: string;
  status: string;
  employeeCode: string;
  employeeName: string;
  outDate: string | null;
  outTime: string;
  place: string;
  reason: string;
  returnDate: string | null;
  returnTime: string;
  remarks: string;
}

interface HeaderInfo {
  officeName: string;
  officeNameMr: string;
  talukaName: string;
  districtName: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  OUT: '#2563eb',
  RETURNED: '#047857',
};

type ViewMode = 'all' | 'active' | 'returned' | 'late';

export default function EmployeeInOutListScreen() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<InOutRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderInfo | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState<ViewMode>('all');
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState<{ id: string; fullName: string; employeeCode: string }[]>([]);
  const pageSize = 50;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    headerCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, margin: spacing.md, borderWidth: 1, borderColor: palette.border },
    officeName: { fontSize: 15, fontWeight: '700', color: palette.primaryDark, textAlign: 'center' },
    sub: { fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 2 },
    title: { fontSize: 18, fontWeight: '700', color: palette.text, textAlign: 'center', marginTop: spacing.sm },
    toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, flex: 1, minWidth: 140 },
    smallInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, width: 130 },
    viewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
    viewChip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    viewChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    viewText: { fontSize: 12, color: palette.text },
    viewTextActive: { color: palette.textInverse },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    exportBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    exportText: { color: palette.primaryDark, fontWeight: '600', fontSize: 12 },
    error: { color: palette.error, paddingHorizontal: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
    headRow: { backgroundColor: palette.secondary, borderTopWidth: 1, borderTopColor: palette.border },
    cell: { width: 100, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 12, color: palette.text },
    wideCell: { flex: 1, minWidth: 150, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 12, color: palette.text },
    headCell: { fontWeight: '700', color: palette.primaryDark, fontSize: 11 },
    statusBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start' },
    statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    pageBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    pageBtnDisabled: { opacity: 0.4 },
    pageText: { color: palette.primaryDark, fontWeight: '600' },
    pageInfo: { fontSize: 12, color: palette.textMuted },
  }), [palette]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      let res;
      if (view === 'active') {
        res = await api.get('/employee-inout/active');
        setRows((res.data as { data: { items: InOutRow[] } }).data.items);
        setTotal((res.data as { data: { items: InOutRow[] } }).data.items.length);
      } else if (view === 'late') {
        res = await api.get('/employee-inout/late');
        setRows((res.data as { data: InOutRow[] }).data);
        setTotal((res.data as { data: InOutRow[] }).data.length);
      } else {
        res = await api.get('/employee-inout', {
          params: {
            page: p,
            pageSize,
            ...(view === 'returned' ? { status: 'RETURNED' } : {}),
            ...(employeeId ? { employeeId } : {}),
            ...(dateFrom ? { from: dateFrom } : {}),
            ...(dateTo ? { to: dateTo } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        });
        setRows((res.data as { data: InOutRow[] }).data);
        setTotal((res.data as { pagination: { total: number } }).pagination.total);
      }
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [view, employeeId, dateFrom, dateTo, search]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/employee-inout/meta');
        const meta = (res.data as { data: { header: HeaderInfo; employees: { id: string; fullName: string; employeeCode: string }[] } }).data;
        setHeader(meta.header);
        setEmployees(meta.employees);
      } catch {
        setHeader(null);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
    void load(1);
  }, [view, employeeId, dateFrom, dateTo, search, load]);

  async function doExport(kind: 'csv' | 'xlsx' | 'pdf') {
    try {
      const token = await tokenStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (view === 'returned') params.set('status', 'RETURNED');
      if (employeeId) params.set('employeeId', employeeId);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (search.trim()) params.set('search', search.trim());
      const qs = params.toString();
      const url = `${API_BASE_URL}/employee-inout/export/${kind}${qs ? `?${qs}` : ''}`;
      if (Platform.OS === 'web') {
        const w = window as unknown as { open: (u: string) => void };
        w.open(url);
      } else {
        const res = await api.get(`/employee-inout/export/${kind}`, { params });
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        void (await import('react-native')).Share.share({ message: text.slice(0, 5000) });
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const officeName = lang === 'en' || !header ? header?.officeName ?? '' : (header.officeNameMr || header.officeName);
  const displayTitle = lang === 'en' ? t('inout.title') : t('inout.titleMr');

  if (loading && rows.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.officeName}>{t('inout.name')} {officeName || t('inout.office')}</Text>
        <Text style={styles.sub}>
          {t('inout.taluka')} {header?.talukaName ? ` ${header.talukaName}` : ''}   {t('inout.district')} {header?.districtName ? ` ${header.districtName}` : ''}
        </Text>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.sub}>{t('inout.forYear')} {new Date().getFullYear()}</Text>
      </View>

      <View style={styles.viewRow}>
        {(['all', 'active', 'returned', 'late'] as ViewMode[]).map((v) => (
          <TouchableOpacity key={v} style={[styles.viewChip, view === v && styles.viewChipActive]} onPress={() => setView(v)}>
            <Text style={[styles.viewText, view === v && styles.viewTextActive]}>
              {v === 'all' ? t('inout.entryNumber') : v === 'active' ? t('inout.activeOut') : v === 'returned' ? t('inout.returned') : t('inout.lateReturns')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toolbar}>
        <TextInput style={styles.input} placeholder={t('inout.search')} value={search} onChangeText={setSearch} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.smallInput} placeholder={t('inout.filterByDate')} value={dateFrom} onChangeText={setDateFrom} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.smallInput} placeholder="—" value={dateTo} onChangeText={setDateTo} placeholderTextColor={palette.textMuted} />
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/employee-inout/new')}>
          <Text style={styles.addButtonText}>{t('inout.newEntry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('xlsx')}><Text style={styles.exportText}>{t('inout.excelExport')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('pdf')}><Text style={styles.exportText}>{t('inout.pdfExport')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('pdf')}><Text style={styles.exportText}>{t('inout.print')}</Text></TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.headRow}>
        <Text style={[styles.cell, styles.headCell]}>{t('inout.srNo')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('inout.date')}</Text>
        <Text style={[styles.wideCell, styles.headCell]}>{t('inout.employeeName')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('inout.outTime')}</Text>
        <Text style={[styles.wideCell, styles.headCell]}>{t('inout.place')}</Text>
        <Text style={[styles.wideCell, styles.headCell]}>{t('inout.reason')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('inout.returnDate')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('inout.returnTime')}</Text>
        <Text style={[styles.wideCell, styles.headCell]}>{t('inout.remarks')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('inout.status')}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>{view === 'active' ? t('inout.noActiveOut') : t('inout.listEmpty')}</Text>}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/employee-inout/[id]', params: { id: item.id } })}>
            <Text style={styles.cell}>{index + 1}</Text>
            <Text style={styles.cell}>{item.outDate ? String(item.outDate).slice(0, 10) : '—'}</Text>
            <Text style={styles.wideCell}>{item.employeeName}{item.employeeCode ? ` (${item.employeeCode})` : ''}</Text>
            <Text style={styles.cell}>{item.outTime}</Text>
            <Text style={styles.wideCell}>{item.place}</Text>
            <Text style={styles.wideCell} numberOfLines={2}>{item.reason}</Text>
            <Text style={styles.cell}>{item.returnDate ? String(item.returnDate).slice(0, 10) : '—'}</Text>
            <Text style={styles.cell}>{item.returnTime}</Text>
            <Text style={styles.wideCell} numberOfLines={2}>{item.remarks}</Text>
            <View style={styles.cell}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6b7280' }]}>
                <Text style={styles.statusText}>{item.status === 'OUT' ? t('inout.activeOut') : t(`inout.status${item.status}`)}</Text>
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