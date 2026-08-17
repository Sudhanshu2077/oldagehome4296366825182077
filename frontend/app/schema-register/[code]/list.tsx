import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Platform, Modal, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, errorMessage } from '../../../src/api/client';
import { tokenStorage } from '../../../src/api/storage';
import { API_BASE_URL } from '../../../src/config/env';
import { spacing, radii } from '../../../src/config/theme';
import { useTheme } from '../../../src/config/ThemeContext';
import { useI18n } from '../../../src/i18n';
import { useAuth } from '../../../src/auth/AuthContext';

interface ColumnDef {
  key: string;
  en: string;
  mr: string;
  hi: string;
  type: 'text' | 'number' | 'date' | 'signature';
  required: boolean;
  sourceFlag: boolean;
  sourceFieldNumber: number | null;
}

interface SRegRow {
  id: string;
  entryNumber: string;
  status: string;
  date: string | null;
  month: string;
  values: Record<string, unknown>;
  signatures: Record<string, string>;
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
  SUBMITTED: '#2563eb',
  FINALIZED: '#047857',
};

const TYPES: ('text' | 'number' | 'date' | 'signature')[] = ['text', 'number', 'date', 'signature'];

export default function SchemaRegisterListScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = params.code ?? '';
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [title, setTitle] = useState<{ en: string; mr: string; hi: string } | null>(null);
  const [prefix, setPrefix] = useState('');
  const [header, setHeader] = useState<HeaderInfo | null>(null);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [schemaConfigured, setSchemaConfigured] = useState(false);
  const [rows, setRows] = useState<SRegRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [schemaEditor, setSchemaEditor] = useState(false);
  const [draftColumns, setDraftColumns] = useState<ColumnDef[]>([]);
  const [savingSchema, setSavingSchema] = useState(false);
  const pageSize = 50;

  const canEditSchema = user?.tier === 'institution' && (user?.role === 'institution-head' || user?.role === 'assistant-manager');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    headerCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, margin: spacing.md, borderWidth: 1, borderColor: palette.border },
    officeName: { fontSize: 15, fontWeight: '700', color: palette.primaryDark, textAlign: 'center' },
    sub: { fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 2 },
    title: { fontSize: 16, fontWeight: '700', color: palette.text, textAlign: 'center', marginTop: spacing.sm },
    pendingBanner: { backgroundColor: palette.backgroundSoft, borderRadius: radii.sm, padding: spacing.md, margin: spacing.md },
    pendingText: { fontSize: 12, color: palette.warning, textAlign: 'center' },
    toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, flex: 1, minWidth: 140 },
    smallInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, width: 130 },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    exportBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    exportText: { color: palette.primaryDark, fontWeight: '600', fontSize: 12 },
    configBtn: { backgroundColor: palette.secondary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12 },
    error: { color: palette.error, paddingHorizontal: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
    headRow: { backgroundColor: palette.secondary, borderTopWidth: 1, borderTopColor: palette.border },
    cell: { width: 110, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 12, color: palette.text },
    wideCell: { flex: 1, minWidth: 150, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 12, color: palette.text },
    headCell: { fontWeight: '700', color: palette.primaryDark, fontSize: 11 },
    statusBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start' },
    statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    pageBtn: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    pageBtnDisabled: { opacity: 0.4 },
    pageText: { color: palette.primaryDark, fontWeight: '600' },
    pageInfo: { fontSize: 12, color: palette.textMuted },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 640 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.xs },
    modalHint: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.md },
    colCard: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md },
    colRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    colInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? 6 : 8, fontSize: 12, color: palette.text, backgroundColor: palette.backgroundSoft, flex: 1 },
    colTypeInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? 6 : 8, fontSize: 12, color: palette.text, backgroundColor: palette.backgroundSoft, width: 110 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    checkboxLabel: { fontSize: 12, color: palette.text },
    checkBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.backgroundSoft, alignItems: 'center', justifyContent: 'center' },
    checkMark: { color: palette.primary, fontSize: 14, fontWeight: '700' },
    removeBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
    removeText: { color: palette.error, fontSize: 12, fontWeight: '600' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
  }), [palette]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/schema-register/${code}`, {
        params: {
          page: p,
          pageSize,
          ...(status ? { status } : {}),
          ...(dateFrom ? { from: dateFrom } : {}),
          ...(dateTo ? { to: dateTo } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      setRows((res.data as { data: SRegRow[] }).data);
      setTotal((res.data as { pagination: { total: number } }).pagination.total);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [code, search, dateFrom, dateTo, status]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get(`/schema-register/${code}/meta`);
        const meta = (res.data as { data: { title: { en: string; mr: string; hi: string }; prefix: string; header: HeaderInfo; columns: ColumnDef[]; schemaConfigured: boolean } }).data;
        setTitle(meta.title);
        setPrefix(meta.prefix);
        setHeader(meta.header);
        setColumns(meta.columns);
        setSchemaConfigured(meta.schemaConfigured);
      } catch {
        setTitle({ en: 'Register', mr: 'रजिस्टर', hi: 'रजिस्टर' });
      }
    })();
  }, [code]);

  useEffect(() => {
    setPage(1);
    void load(1);
  }, [search, dateFrom, dateTo, status, load]);

  async function doExport(kind: 'xlsx' | 'pdf') {
    try {
      const token = await tokenStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const qs = params.toString();
      const url = `${API_BASE_URL}/schema-register/${code}/export/${kind}${qs ? `?${qs}` : ''}`;
      if (Platform.OS === 'web') {
        const w = window as unknown as { open: (u: string) => void };
        w.open(url);
      } else {
        const res = await api.get(`/schema-register/${code}/export/${kind}`, { params });
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        void (await import('react-native')).Share.share({ message: text.slice(0, 5000) });
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function openSchemaEditor() {
    setDraftColumns(columns.length > 0 ? columns.map((c) => ({ ...c })) : [{ key: 'source_field_1', en: 'Source Field 1', mr: '', hi: '', type: 'text', required: false, sourceFlag: true, sourceFieldNumber: 1 }]);
    setSchemaEditor(true);
  }

  function updateDraftColumn(i: number, patch: Partial<ColumnDef>) {
    setDraftColumns((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function addColumn() {
    const n = draftColumns.length + 1;
    setDraftColumns((prev) => [...prev, { key: `source_field_${n}`, en: `Source Field ${n}`, mr: '', hi: '', type: 'text', required: false, sourceFlag: true, sourceFieldNumber: n }]);
  }

  function removeColumn(i: number) {
    setDraftColumns((prev) => prev.filter((_, idx) => idx !== i));
  }

  function autoKey(c: ColumnDef): string {
    if (/^source_field_\d+$/.test(c.key) || !c.key) {
      const slug = c.en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || `field_${Date.now().toString(36)}`;
      return slug;
    }
    return c.key;
  }

  async function saveSchema() {
    setSavingSchema(true);
    setError(null);
    try {
      const cleaned = draftColumns.map((c) => ({ ...c, key: autoKey(c) }));
      if (cleaned.some((c) => !c.en.trim())) {
        setError(t('sreg.required'));
        return;
      }
      const res = await api.put(`/schema-register/${code}/schema`, { columns: cleaned });
      setColumns((res.data as { data: { columns: ColumnDef[] } }).data.columns);
      setSchemaConfigured(true);
      setSchemaEditor(false);
      await load(page);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingSchema(false);
    }
  }

  const displayTitle = lang === 'en' || !title ? title?.en ?? '' : (lang === 'mr' ? title?.mr : title?.hi);
  const officeName = lang === 'en' || !header ? header?.officeName ?? '' : (header.officeNameMr || header.officeName);

  if (loading && page === 1 && rows.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.officeName}>{t('sreg.institutionName')} {officeName || t('sreg.office')}</Text>
        <Text style={styles.sub}>
          {t('sreg.taluka')} {header?.talukaName ? ` ${header.talukaName}` : ''}   {t('sreg.district')} {header?.districtName ? ` ${header.districtName}` : ''}
        </Text>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.sub}>{t('sreg.forYear')} {new Date().getFullYear()}</Text>
      </View>

      {!schemaConfigured ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>{t('sreg.schemaPending')}</Text>
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <TextInput style={styles.input} placeholder={t('sreg.search')} value={search} onChangeText={setSearch} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.smallInput} placeholder={t('sreg.filterByDate')} value={dateFrom} onChangeText={setDateFrom} placeholderTextColor={palette.textMuted} />
        <TextInput style={styles.smallInput} placeholder="—" value={dateTo} onChangeText={setDateTo} placeholderTextColor={palette.textMuted} />
        <TouchableOpacity style={styles.addButton} onPress={() => (schemaConfigured ? router.push({ pathname: '/schema-register/[code]/new', params: { code } }) : setError(t('sreg.schemaPending')))}>
          <Text style={styles.addButtonText}>{t('sreg.newEntry')}</Text>
        </TouchableOpacity>
        {canEditSchema ? (
          <TouchableOpacity style={styles.configBtn} onPress={openSchemaEditor}>
            <Text style={styles.exportText}>{t('sreg.configureSchema')}</Text>
          </TouchableOpacity>
        ) : null}
        {schemaConfigured ? (
          <>
            <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('xlsx')}><Text style={styles.exportText}>{t('sreg.excelExport')}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => void doExport('pdf')}><Text style={styles.exportText}>{t('sreg.pdfExport')}</Text></TouchableOpacity>
          </>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.headRow}>
        <Text style={[styles.cell, styles.headCell]}>{t('sreg.entryNumber')}</Text>
        <Text style={[styles.cell, styles.headCell]}>{t('sreg.date')}</Text>
        {schemaConfigured ? columns.map((c) => (
          <Text key={c.key} style={[styles.cell, styles.headCell]}>
            {lang === 'en' ? c.en : lang === 'mr' ? (c.mr || c.en) : (c.hi || c.en)}{c.required ? ' *' : ''}
          </Text>
        )) : <Text style={[styles.wideCell, styles.headCell]}>{t('sreg.remarks')}</Text>}
        <Text style={[styles.cell, styles.headCell]}>{t('sreg.status')}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>{t('sreg.listEmpty')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/schema-register/[code]/[id]', params: { code, id: item.id } })}>
            <Text style={styles.cell}>{item.entryNumber}</Text>
            <Text style={styles.cell}>{item.date ? String(item.date).slice(0, 10) : '—'}</Text>
            {schemaConfigured ? columns.map((c) => (
              <Text key={c.key} style={styles.cell} numberOfLines={2}>
                {c.type === 'signature' ? (item.signatures[c.key] ?? '') : (item.values[c.key] === null || item.values[c.key] === undefined || item.values[c.key] === '' ? '—' : String(item.values[c.key]).slice(0, 10))}
              </Text>
            )) : <Text style={styles.wideCell} numberOfLines={2}>{item.remarks}</Text>}
            <View style={styles.cell}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6b7280' }]}>
                <Text style={styles.statusText}>{t(`sreg.status${item.status}`)}</Text>
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

      <Modal visible={schemaEditor} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>{t('sreg.schemaEditorTitle')} — {displayTitle}</Text>
              <Text style={styles.modalHint}>{t('sreg.schemaEditorHint')}</Text>
              {draftColumns.map((c, i) => (
                <View key={i} style={styles.colCard}>
                  <View style={styles.colRow}>
                    <TextInput style={styles.colInput} placeholder={t('sreg.columnKey')} value={c.key} onChangeText={(v) => updateDraftColumn(i, { key: v })} placeholderTextColor={palette.textMuted} />
                    <TextInput style={styles.colTypeInput} placeholder={t('sreg.columnType')} value={c.type} onChangeText={(v) => { const ty = v as typeof c.type; if (TYPES.includes(ty)) updateDraftColumn(i, { type: ty }); }} placeholderTextColor={palette.textMuted} />
                  </View>
                  <View style={styles.colRow}>
                    <TextInput style={styles.colInput} placeholder={t('sreg.columnEn')} value={c.en} onChangeText={(v) => updateDraftColumn(i, { en: v })} placeholderTextColor={palette.textMuted} />
                  </View>
                  <View style={styles.colRow}>
                    <TextInput style={styles.colInput} placeholder={t('sreg.columnMr')} value={c.mr} onChangeText={(v) => updateDraftColumn(i, { mr: v })} placeholderTextColor={palette.textMuted} />
                    <TextInput style={styles.colInput} placeholder={t('sreg.columnHi')} value={c.hi} onChangeText={(v) => updateDraftColumn(i, { hi: v })} placeholderTextColor={palette.textMuted} />
                  </View>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity style={styles.checkBox} onPress={() => updateDraftColumn(i, { required: !c.required })}>
                      {c.required ? <Text style={styles.checkMark}>✓</Text> : null}
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>{t('sreg.columnRequired')}</Text>
                  </View>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity style={styles.checkBox} onPress={() => updateDraftColumn(i, { sourceFlag: !c.sourceFlag })}>
                      {c.sourceFlag ? <Text style={styles.checkMark}>✓</Text> : null}
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>{t('sreg.columnSourceFlag')}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeColumn(i)}>
                    <Text style={styles.removeText}>{t('module.delete')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addColumn}>
                <Text style={styles.addButtonText}>{t('sreg.addColumn')}</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setSchemaEditor(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void saveSchema()} disabled={savingSchema}>
                {savingSchema ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('sreg.saveSchema')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}