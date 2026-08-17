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
  Switch,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface DistributionEntry {
  id: string;
  entryNumber: string;
  status: string;
  personName: string;
  className: string;
  date: string | null;
  clothesWashingPowder: number;
  clothesWashingSoap: number;
  bathingSoap: number;
  toothPowder: number;
  paste: number;
  brush: number;
  sourceColumn10: number;
  sourceColumn11: number;
  distributionDate: string | null;
  superintendentSignature: string;
  remarks: string;
  submittedAt: string | null;
  finalizedAt: string | null;
  changes: { field: string; previousValue: unknown; newValue: unknown; reason: string; changedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#2563eb',
  FINALIZED: '#047857',
};

const FIELD_LABELS: Record<string, string> = {
  date: 'dist.date',
  personName: 'dist.personName',
  className: 'dist.className',
  clothesWashingPowder: 'dist.clothesWashingPowder',
  clothesWashingSoap: 'dist.clothesWashingSoap',
  bathingSoap: 'dist.bathingSoap',
  toothPowder: 'dist.toothPowder',
  paste: 'dist.paste',
  brush: 'dist.brush',
  sourceColumn10: 'dist.sourceColumn10',
  sourceColumn11: 'dist.sourceColumn11',
  distributionDate: 'dist.distributionDate',
  superintendentSignature: 'dist.superintendentSignature',
  remarks: 'dist.remarks',
};

export default function DistributionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [row, setRow] = useState<DistributionEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [override, setOverride] = useState(false);
  const [correctionModal, setCorrectionModal] = useState(false);
  const [corrField, setCorrField] = useState<keyof typeof FIELD_LABELS>('remarks');
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
    sourceFlag: { fontSize: 11, color: palette.warning, marginBottom: spacing.md },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
    chip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 12, color: palette.text },
    chipTextActive: { color: palette.textInverse },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    switchLabel: { fontSize: 12, color: palette.text },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
    auditRow: { marginBottom: spacing.md, borderLeftWidth: 2, borderLeftColor: palette.border, paddingLeft: spacing.md },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/distribution/${id}`);
      setRow((res.data as { data: DistributionEntry }).data);
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

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/distribution/${id}/submit`);
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
      await api.post(`/distribution/${id}/review`, { override });
      setReviewModal(false);
      setOverride(false);
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
      await api.post(`/distribution/${id}/correct`, { field: corrField, value: corrValue, reason: corrReason });
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
        <Text style={styles.sourceFlag}>{t('dist.sourceFlag')}</Text>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.appNo}>{row.entryNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[row.status] ?? '#6b7280' }]}>
              <Text style={styles.statusText}>{t(`dist.status${row.status}`)}</Text>
            </View>
          </View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.date')}</Text><Text style={styles.fieldValue}>{row.date ? String(row.date).slice(0, 10) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.personName')}</Text><Text style={styles.fieldValue}>{row.personName || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.className')}</Text><Text style={styles.fieldValue}>{row.className || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.clothesWashingPowder')}</Text><Text style={styles.fieldValue}>{row.clothesWashingPowder}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.clothesWashingSoap')}</Text><Text style={styles.fieldValue}>{row.clothesWashingSoap}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.bathingSoap')}</Text><Text style={styles.fieldValue}>{row.bathingSoap}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.toothPowder')}</Text><Text style={styles.fieldValue}>{row.toothPowder}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.paste')}</Text><Text style={styles.fieldValue}>{row.paste}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.brush')}</Text><Text style={styles.fieldValue}>{row.brush}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.sourceColumn10')}</Text><Text style={styles.fieldValue}>{row.sourceColumn10}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.sourceColumn11')}</Text><Text style={styles.fieldValue}>{row.sourceColumn11}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.distributionDate')}</Text><Text style={styles.fieldValue}>{row.distributionDate ? String(row.distributionDate).slice(0, 10) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.superintendentSignature')}</Text><Text style={styles.fieldValue}>{row.superintendentSignature || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.remarks')}</Text><Text style={styles.fieldValue}>{row.remarks || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.submittedAt')}</Text><Text style={styles.fieldValue}>{row.submittedAt ? String(row.submittedAt).slice(0, 19) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('dist.finalizedAt')}</Text><Text style={styles.fieldValue}>{row.finalizedAt ? String(row.finalizedAt).slice(0, 19) : '—'}</Text></View>
        </View>

        {canWrite && row.status === 'DRAFT' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void submit()} disabled={busy}>
              <Text style={styles.actionText}>{t('dist.submit')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'SUBMITTED' ? (
          <View>
            <Text style={styles.note}>{t('dist.stockReduced')}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => setReviewModal(true)} disabled={busy}>
                <Text style={styles.actionText}>{t('dist.finalize')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {canReview && row.status === 'FINALIZED' ? (
          <View>
            <Text style={styles.note}>{t('dist.correctionWorkflow')}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.surfaceAlt }]} onPress={() => setCorrectionModal(true)}>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{t('dist.edit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {row.changes.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('dist.auditHistory')}</Text>
            {row.changes.map((c, i) => (
              <View key={i} style={styles.auditRow}>
                <Text style={styles.fieldValue}>{t(FIELD_LABELS[c.field] ?? c.field)}</Text>
                <Text style={styles.note}>{t('dist.previousValue')}: {String(c.previousValue ?? '')} → {t('dist.newValue')}: {String(c.newValue ?? '')}</Text>
                <Text style={styles.note}>{t('dist.reasonForChange')}: {c.reason}</Text>
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

      <Modal visible={reviewModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('dist.finalize')}</Text>
            <Text style={styles.label}>{t('dist.stockReduced')}</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('dist.overrideRequired')}</Text>
              <Switch value={override} onValueChange={setOverride} trackColor={{ true: palette.primary }} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReviewModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void review()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('dist.finalize')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={correctionModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('dist.edit')}</Text>
            <Text style={styles.label}>{t('dist.correctionWorkflow')}</Text>
            <View style={styles.chipRow}>
              {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).map((f) => (
                <TouchableOpacity key={f} style={[styles.chip, corrField === f && styles.chipActive]} onPress={() => setCorrField(f)}>
                  <Text style={[styles.chipText, corrField === f && styles.chipTextActive]}>{t(FIELD_LABELS[f] ?? 'dist.remarks')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('dist.newValue')}</Text>
            <TextInput style={styles.input} value={corrValue} onChangeText={setCorrValue} placeholder={t('dist.newValue')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('dist.reasonForChange')}</Text>
            <TextInput style={styles.textArea} value={corrReason} onChangeText={setCorrReason} placeholder={t('dist.reasonForChange')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCorrectionModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void correct()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('dist.saveDraft')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}