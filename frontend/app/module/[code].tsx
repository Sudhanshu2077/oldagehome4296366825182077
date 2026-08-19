import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { fieldKeyToI18n } from '../../src/i18n/fieldKeys';

interface ModuleField {
  key: string;
  type: string;
  label: string;
  labelMr: string;
  required: boolean;
  enum: string[] | null;
}

interface ModuleMeta {
  code: string;
  title: string;
  titleMr: string;
  workflow: { field?: string; states: string[]; transitions: Record<string, string[]> } | null;
  fields: ModuleField[];
}

type Row = Record<string, unknown> & { id: string };

export default function ModuleScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = params.code ?? '';
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const [meta, setMeta] = useState<ModuleMeta | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const canWrite = user?.tier === 'institution' && (user?.role === 'assistant-manager' || user?.role === 'institution-head' || user?.role === 'department-user');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    title: { fontSize: 17, fontWeight: '700', color: palette.primaryDark },
    subtitle: { fontSize: 12, color: palette.textMuted },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    searchInput: { backgroundColor: palette.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14, color: palette.text },
    error: { color: palette.error, paddingHorizontal: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
    headRow: { backgroundColor: palette.secondary, borderTopWidth: 1, borderTopColor: palette.border },
    cell: { width: 150, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 12, color: palette.text },
    headCell: { fontWeight: '700', color: palette.primaryDark, fontSize: 11 },
    actionCell: { flexDirection: 'row', gap: spacing.md, width: 170 },
    action: { color: palette.primary, fontWeight: '600', fontSize: 12 },
    actionDelete: { color: palette.error, fontWeight: '600', fontSize: 12 },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    fieldLabel: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft },
    enumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    enumChip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    enumChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    enumChipText: { fontSize: 12, color: palette.text },
    enumChipTextActive: { color: palette.textInverse },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const [metaRes, listRes] = await Promise.all([
        api.get('/modules'),
        api.get(`/m/${code}`, { params: { pageSize: 100, ...(search ? { q: search } : {}) } }),
      ]);
      const all = (metaRes.data as { data: ModuleMeta[] }).data;
      setMeta(all.find((m) => m.code === code) ?? null);
      setRows((listRes.data as { data: Row[] }).data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [code, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayFields = useMemo(() => (meta?.fields ?? []).slice(0, 6), [meta]);

  function openCreate() {
    setEditing(null);
    setForm({});
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const next: Record<string, string> = {};
    for (const f of meta?.fields ?? []) {
      const v = row[f.key];
      next[f.key] = v === null || v === undefined ? '' : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : String(v);
    }
    setForm(next);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      for (const f of meta?.fields ?? []) {
        const raw = form[f.key];
        if (raw === undefined || raw === '') continue;
        body[f.key] = f.type === 'number' ? Number(raw) : f.type === 'boolean' ? raw === 'true' : raw;
      }
      if (editing) {
        await api.patch(`/m/${code}/${editing.id}`, body);
      } else {
        await api.post(`/m/${code}`, body);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    try {
      await api.delete(`/m/${code}/${row.id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function transition(row: Row, to: string) {
    try {
      await api.post(`/m/${code}/${row.id}/transition`, { to });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (!meta) return <View style={styles.center}><Text style={styles.error}>{t('module.notFound')}: {code}</Text></View>;

  const statusField = meta.workflow?.field ?? 'status';

  function fieldLabel(f: ModuleField): string {
    if (lang === 'mr' && f.labelMr) return f.labelMr;
    return t(fieldKeyToI18n(f.key), f.label);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t(`mod.${code}`, meta.title)}</Text>
          <Text style={styles.subtitle}>{code}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>{t('module.new')}</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder={t('module.search')}
        placeholderTextColor={palette.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView horizontal>
        <View style={{ flex: 1 }}>
          <View style={[styles.row, styles.headRow]}>
            {displayFields.map((f) => (
              <Text key={f.key} style={[styles.cell, styles.headCell]}>{fieldLabel(f)}</Text>
            ))}
            <Text style={[styles.cell, styles.headCell]}>{t('module.actions')}</Text>
          </View>
          <FlatList
            data={rows}
            keyExtractor={(r) => r.id}
            ListEmptyComponent={<Text style={styles.empty}>{t('module.noRecords')}</Text>}
            renderItem={({ item }) => {
              const currentStatus = String(item[statusField] ?? '');
              const nextStates = meta.workflow?.transitions[currentStatus] ?? [];
              return (
                <View style={styles.row}>
                  {displayFields.map((f) => {
                    const v = item[f.key];
                    const text = v === null || v === undefined ? '' : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : String(v);
                    return <Text key={f.key} style={styles.cell}>{text}</Text>;
                  })}
                  <View style={[styles.cell, styles.actionCell]}>
                    {nextStates.slice(0, 2).map((s) => (
                      <TouchableOpacity key={s} onPress={() => void transition(item, s)}>
                        <Text style={styles.action}>→{s}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => openEdit(item)}><Text style={styles.action}>{t('module.edit')}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => void remove(item)}><Text style={styles.actionDelete}>{t('module.delete')}</Text></TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? t('module.edit') : t('module.new')} — {t(`mod.${code}`, meta.title)}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {(meta.fields ?? []).map((f) => (
                <View key={f.key} style={{ marginBottom: spacing.md }}>
                  <Text style={styles.fieldLabel}>{fieldLabel(f)}{f.required ? ' *' : ''}</Text>
                  {f.enum ? (
                    <View style={styles.enumRow}>
                      {f.enum.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.enumChip, form[f.key] === opt && styles.enumChipActive]}
                          onPress={() => setForm((prev) => ({ ...prev, [f.key]: opt }))}
                        >
                          <Text style={[styles.enumChipText, form[f.key] === opt && styles.enumChipTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : f.type === 'boolean' ? (
                    <View style={styles.enumRow}>
                      {['true', 'false'].map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.enumChip, form[f.key] === opt && styles.enumChipActive]}
                          onPress={() => setForm((prev) => ({ ...prev, [f.key]: opt }))}
                        >
                          <Text style={[styles.enumChipText, form[f.key] === opt && styles.enumChipTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={styles.input}
                      value={form[f.key] ?? ''}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                      keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                      placeholder={f.type === 'date' ? 'YYYY-MM-DD' : fieldLabel(f)}
                      placeholderTextColor={palette.textMuted}
                      multiline={f.type === 'text'}
                    />
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void save()} disabled={saving}>
                {saving ? <ActivityIndicator color={palette.textInverse} /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}