import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface InOutEntry {
  id: string;
  entryNumber: string;
  status: string;
  employeeCode: string;
  employeeName: string;
  outDate: string | null;
  outTime: string;
  place: string;
  reason: string;
  outSignature: string;
  returnDate: string | null;
  returnTime: string;
  inSignature: string;
  remarks: string;
  outSubmittedAt: string | null;
  returnSubmittedAt: string | null;
  changes: { field: string; previousValue: unknown; newValue: unknown; reason: string; changedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  OUT: '#2563eb',
  RETURNED: '#047857',
};

const FIELD_LABELS: Record<string, string> = {
  outDate: 'inout.date',
  outTime: 'inout.outTime',
  place: 'inout.place',
  reason: 'inout.reason',
  returnDate: 'inout.returnDate',
  returnTime: 'inout.returnTime',
  remarks: 'inout.remarks',
};

export default function EmployeeInOutDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [row, setRow] = useState<InOutEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [inSignature, setInSignature] = useState('');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [correctionModal, setCorrectionModal] = useState(false);
  const [corrField, setCorrField] = useState<keyof typeof FIELD_LABELS>('returnDate');
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
    fieldLabel: { width: 180, fontSize: 12, color: palette.textMuted },
    fieldValue: { flex: 1, fontSize: 12, color: palette.text },
    label: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft, marginBottom: spacing.md },
    textArea: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.md },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
    actionBtn: { flex: 1, minWidth: 130, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    actionPrimary: { backgroundColor: palette.primary },
    actionDanger: { backgroundColor: palette.error },
    actionText: { color: palette.textInverse, fontWeight: '700', fontSize: 13 },
    note: { fontSize: 11, color: palette.textMuted, marginTop: spacing.sm },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
    chip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 12, color: palette.text },
    chipTextActive: { color: palette.textInverse },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
    auditRow: { marginBottom: spacing.md, borderLeftWidth: 2, borderLeftColor: palette.border, paddingLeft: spacing.md },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/employee-inout/${id}`);
      setRow((res.data as { data: InOutEntry }).data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (!row) return <View style={styles.center}><Text>{error}</Text></View>;

  async function submitOut() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/employee-inout/${id}/submit`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function recordReturn() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/employee-inout/${id}/return`, { returnDate, returnTime, inSignature, remarks: returnRemarks });
      setReturnModal(false);
      setReturnDate('');
      setReturnTime('');
      setInSignature('');
      setReturnRemarks('');
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
      await api.post(`/employee-inout/${id}/correct`, { field: corrField, value: corrValue, reason: corrReason });
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        {error ? <Text style={{ color: palette.error, marginBottom: spacing.md }}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.appNo}>{row.entryNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[row.status] ?? '#6b7280' }]}>
              <Text style={styles.statusText}>{row.status === 'OUT' ? t('inout.activeOut') : t(`inout.status${row.status}`)}</Text>
            </View>
          </View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.employeeName')}</Text><Text style={styles.fieldValue}>{row.employeeName}{row.employeeCode ? ` (${row.employeeCode})` : ''}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.date')}</Text><Text style={styles.fieldValue}>{row.outDate ? String(row.outDate).slice(0, 10) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.outTime')}</Text><Text style={styles.fieldValue}>{row.outTime || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.place')}</Text><Text style={styles.fieldValue}>{row.place || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.reason')}</Text><Text style={styles.fieldValue}>{row.reason || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.outSignature')}</Text><Text style={styles.fieldValue}>{row.outSignature || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.returnDate')}</Text><Text style={styles.fieldValue}>{row.returnDate ? String(row.returnDate).slice(0, 10) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.returnTime')}</Text><Text style={styles.fieldValue}>{row.returnTime || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.inSignature')}</Text><Text style={styles.fieldValue}>{row.inSignature || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.remarks')}</Text><Text style={styles.fieldValue}>{row.remarks || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.outSubmittedAt')}</Text><Text style={styles.fieldValue}>{row.outSubmittedAt ? String(row.outSubmittedAt).slice(0, 19) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inout.returnSubmittedAt')}</Text><Text style={styles.fieldValue}>{row.returnSubmittedAt ? String(row.returnSubmittedAt).slice(0, 19) : '—'}</Text></View>
        </View>

        {canWrite && row.status === 'DRAFT' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void submitOut()} disabled={busy}>
              <Text style={styles.actionText}>{t('inout.submitOut')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'OUT' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => setReturnModal(true)} disabled={busy}>
              <Text style={styles.actionText}>{t('inout.recordReturn')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'RETURNED' ? (
          <View>
            <Text style={styles.note}>{t('inout.correctionWorkflow')}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.surfaceAlt }]} onPress={() => setCorrectionModal(true)}>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{t('inout.edit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {row.changes.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('inout.auditHistory')}</Text>
            {row.changes.map((c, i) => (
              <View key={i} style={styles.auditRow}>
                <Text style={styles.fieldValue}>{t(FIELD_LABELS[c.field] ?? c.field)}</Text>
                <Text style={styles.note}>{t('inout.previousValue')}: {String(c.previousValue ?? '')} → {t('inout.newValue')}: {String(c.newValue ?? '')}</Text>
                <Text style={styles.note}>{t('inout.reasonForChange')}: {c.reason}</Text>
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

      <Modal visible={returnModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('inout.recordReturn')}</Text>
            <Text style={styles.label}>{t('inout.returnDate')} (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={returnDate} onChangeText={setReturnDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inout.returnTime')} (HH:MM)</Text>
            <TextInput style={styles.input} value={returnTime} onChangeText={setReturnTime} placeholder="18:30" placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inout.inSignature')}</Text>
            <TextInput style={styles.input} value={inSignature} onChangeText={setInSignature} placeholder={t('inout.inSignature')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inout.remarks')}</Text>
            <TextInput style={styles.textArea} value={returnRemarks} onChangeText={setReturnRemarks} placeholder={t('inout.remarks')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReturnModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void recordReturn()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('inout.finalize')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={correctionModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('inout.edit')}</Text>
            <Text style={styles.label}>{t('inout.correctionWorkflow')}</Text>
            <View style={styles.chipRow}>
              {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).map((f) => (
                <TouchableOpacity key={f} style={[styles.chip, corrField === f && styles.chipActive]} onPress={() => setCorrField(f)}>
                  <Text style={[styles.chipText, corrField === f && styles.chipTextActive]}>{t(FIELD_LABELS[f] ?? 'inout.remarks')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('inout.newValue')}</Text>
            <TextInput style={styles.input} value={corrValue} onChangeText={setCorrValue} placeholder={t('inout.newValue')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inout.reasonForChange')}</Text>
            <TextInput style={styles.textArea} value={corrReason} onChangeText={setCorrReason} placeholder={t('inout.reasonForChange')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCorrectionModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void correct()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('inout.finalize')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}