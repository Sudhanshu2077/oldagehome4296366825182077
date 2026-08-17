import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api, errorMessage } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import { spacing, radii } from '../../../src/config/theme';
import { useTheme } from '../../../src/config/ThemeContext';
import { useI18n } from '../../../src/i18n';

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

interface SRegEntry {
  id: string;
  entryNumber: string;
  status: string;
  date: string | null;
  month: string;
  values: Record<string, unknown>;
  signatures: Record<string, string>;
  remarks: string;
  submittedAt: string | null;
  finalizedAt: string | null;
  changes: { field: string; previousValue: unknown; newValue: unknown; reason: string; changedAt: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#2563eb',
  FINALIZED: '#047857',
};

export default function SchemaRegisterDetailScreen() {
  const params = useLocalSearchParams<{ code: string; id: string }>();
  const code = params.code ?? '';
  const id = params.id ?? '';
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const [row, setRow] = useState<SRegEntry | null>(null);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [correctionModal, setCorrectionModal] = useState(false);
  const [corrField, setCorrField] = useState('remarks');
  const [corrValue, setCorrValue] = useState('');
  const [corrReason, setCorrReason] = useState('');

  const canWrite = user?.tier === 'institution' && (user?.role === 'assistant-manager' || user?.role === 'department-user');
  const canReview = user?.tier === 'institution' && (user?.role === 'institution-head' || user?.role === 'assistant-manager');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
    card: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: palette.border },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    appNo: { fontSize: 13, fontWeight: '700', color: palette.primaryDark },
    statusBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
    fieldRow: { flexDirection: 'row', marginBottom: spacing.xs },
    fieldLabel: { width: 190, fontSize: 12, color: palette.textMuted },
    fieldValue: { flex: 1, fontSize: 12, color: palette.text },
    sourceFlag: { fontSize: 10, color: palette.warning, marginTop: 2 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
    actionBtn: { flex: 1, minWidth: 130, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    actionPrimary: { backgroundColor: palette.primary },
    actionText: { color: palette.textInverse, fontWeight: '700', fontSize: 13 },
    note: { fontSize: 11, color: palette.textMuted, marginTop: spacing.sm },
    label: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft, marginBottom: spacing.md },
    textArea: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.md },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
    chip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 12, color: palette.text },
    chipTextActive: { color: palette.textInverse },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
    auditRow: { marginBottom: spacing.md, borderLeftWidth: 2, borderLeftColor: palette.border, paddingLeft: spacing.md },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const [entryRes, metaRes] = await Promise.all([
        api.get(`/schema-register/${code}/${id}`),
        api.get(`/schema-register/${code}/meta`),
      ]);
      setRow((entryRes.data as { data: SRegEntry }).data);
      setColumns((metaRes.data as { data: { columns: ColumnDef[] } }).data.columns);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [code, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (!row) return <View style={styles.center}><Text>{error}</Text></View>;

  function colLabel(c: ColumnDef): string {
    if (lang === 'mr') return c.mr || c.en;
    if (lang === 'hi') return c.hi || c.en;
    return c.en;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/schema-register/${code}/${id}/submit`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function review() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/schema-register/${code}/${id}/review`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function correct() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/schema-register/${code}/${id}/correct`, { field: corrField, value: corrValue, reason: corrReason });
      setCorrectionModal(false);
      setCorrValue('');
      setCorrReason('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const fieldOptions = [{ key: 'remarks', label: t('sreg.remarks') }, { key: 'month', label: t('sreg.month') }, ...columns.map((c) => ({ key: c.key, label: colLabel(c) }))];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        {error ? <Text style={{ color: palette.error, marginBottom: spacing.md }}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.appNo}>{row.entryNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[row.status] ?? '#6b7280' }]}>
              <Text style={styles.statusText}>{t(`sreg.status${row.status}`)}</Text>
            </View>
          </View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('sreg.date')}</Text><Text style={styles.fieldValue}>{row.date ? String(row.date).slice(0, 10) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('sreg.month')}</Text><Text style={styles.fieldValue}>{row.month || '—'}</Text></View>
          {columns.map((c) => {
            const v = c.type === 'signature' ? (row.signatures[c.key] ?? '') : (row.values[c.key] ?? '');
            return (
              <View key={c.key}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{colLabel(c)}{c.required ? ' *' : ''}</Text>
                  <Text style={styles.fieldValue}>{v === null || v === undefined || v === '' ? '—' : String(v)}</Text>
                </View>
                {c.sourceFlag ? <Text style={styles.sourceFlag}>{t('sreg.sourceVerificationRequired')} — {t('sreg.sourceFlag')}</Text> : null}
              </View>
            );
          })}
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('sreg.remarks')}</Text><Text style={styles.fieldValue}>{row.remarks || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('sreg.submittedAt')}</Text><Text style={styles.fieldValue}>{row.submittedAt ? String(row.submittedAt).slice(0, 19) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('sreg.finalizedAt')}</Text><Text style={styles.fieldValue}>{row.finalizedAt ? String(row.finalizedAt).slice(0, 19) : '—'}</Text></View>
        </View>

        {canWrite && row.status === 'DRAFT' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void submit()} disabled={busy}>
              <Text style={styles.actionText}>{t('sreg.submit')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'SUBMITTED' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void review()} disabled={busy}>
              <Text style={styles.actionText}>{t('sreg.finalize')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'FINALIZED' ? (
          <View>
            <Text style={styles.note}>{t('sreg.correctionWorkflow')}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.surfaceAlt }]} onPress={() => setCorrectionModal(true)}>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{t('sreg.edit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {row.changes.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('sreg.auditHistory')}</Text>
            {row.changes.map((c, i) => (
              <View key={i} style={styles.auditRow}>
                <Text style={styles.fieldValue}>{fieldOptions.find((f) => f.key === c.field)?.label ?? c.field}</Text>
                <Text style={styles.note}>{t('sreg.previousValue')}: {String(c.previousValue ?? '')} → {t('sreg.newValue')}: {String(c.newValue ?? '')}</Text>
                <Text style={styles.note}>{t('sreg.reasonForChange')}: {c.reason}</Text>
                <Text style={styles.note}>{String(c.changedAt).slice(0, 19)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.surfaceAlt }]} onPress={() => router.back()}>
            <Text style={{ color: palette.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={correctionModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('sreg.edit')}</Text>
            <Text style={styles.label}>{t('sreg.correctionWorkflow')}</Text>
            <View style={styles.chipRow}>
              {fieldOptions.map((f) => (
                <TouchableOpacity key={f.key} style={[styles.chip, corrField === f.key && styles.chipActive]} onPress={() => { setCorrField(f.key); setCorrValue(''); }}>
                  <Text style={[styles.chipText, corrField === f.key && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('sreg.newValue')}</Text>
            <TextInput style={styles.input} value={corrValue} onChangeText={setCorrValue} placeholder={t('sreg.newValue')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('sreg.reasonForChange')}</Text>
            <TextInput style={styles.textArea} value={corrReason} onChangeText={setCorrReason} placeholder={t('sreg.reasonForChange')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCorrectionModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void correct()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('sreg.saveDraft')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}