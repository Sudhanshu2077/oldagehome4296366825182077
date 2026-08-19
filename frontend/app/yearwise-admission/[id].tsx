import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface YwaEntry {
  id: string;
  entryNumber: string;
  status: string;
  registerYear: string;
  residentId: string | null;
  residentNumber: string;
  fullName: string;
  birthDate: string | null;
  birthYear: number | null;
  aadhaar: string;
  aadhaarMasked: string;
  aadhaarReadable: boolean;
  signatureType: string;
  signatureUrl: string;
  thumbImpressionUrl: string;
  noSignatureReason: string;
  photoUrl: string;
  admissionDate: string | null;
  officerId: string | null;
  officerName: string;
  officerDesignation: string;
  officerSignature: string;
  officerSignedAt: string | null;
  remarks: string;
  submittedAt: string | null;
  finalizedAt: string | null;
  voidReason: string;
  changes: { field: string; previousValue: unknown; newValue: unknown; reason: string; changedAt: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  UNDER_REVIEW: '#d97706',
  APPROVED: '#2563eb',
  FINALIZED: '#047857',
  VOIDED: '#b91c1c',
};

const FIELD_LABELS: Record<string, string> = {
  registerYear: 'ywa.year',
  residentId: 'ywa.residentLink',
  residentNumber: 'ywa.residentId',
  fullName: 'ywa.fullName',
  birthDate: 'ywa.dob',
  birthYear: 'ywa.birthYear',
  aadhaar: 'ywa.aadhaar',
  signatureType: 'ywa.signature',
  signatureUrl: 'ywa.signature',
  thumbImpressionUrl: 'ywa.signature',
  noSignatureReason: 'ywa.noSignatureReason',
  photoUrl: 'ywa.photo',
  admissionDate: 'ywa.admissionDate',
  officerId: 'ywa.officerId',
  officerName: 'ywa.officerName',
  officerDesignation: 'ywa.officerDesignation',
  officerSignature: 'ywa.officerSignature',
  remarks: 'ywa.remarks',
};

export default function YwaDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [row, setRow] = useState<YwaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [correctionModal, setCorrectionModal] = useState(false);
  const [corrField, setCorrField] = useState('remarks');
  const [corrValue, setCorrValue] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [voidModal, setVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [aadhaarFull, setAadhaarFull] = useState<string | null>(null);

  const canWrite = user?.tier === 'institution' && (user?.role === 'assistant-manager' || user?.role === 'department-user');
  const canReview = user?.tier === 'institution' && (user?.role === 'institution-head' || user?.role === 'assistant-manager');
  const canReadFullAadhaar = user?.tier === 'government' || canReview;

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
    dangerButton: { backgroundColor: palette.error, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    auditRow: { marginBottom: spacing.md, borderLeftWidth: 2, borderLeftColor: palette.border, paddingLeft: spacing.md },
    aadhaarFull: { fontSize: 18, fontWeight: '700', color: palette.primaryDark, letterSpacing: 2, marginBottom: spacing.sm },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/yearwise-admission/${id}`);
      setRow((res.data as { data: YwaEntry }).data);
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
      await api.post(`/yearwise-admission/${id}/submit`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/yearwise-admission/${id}/approve`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/yearwise-admission/${id}/finalize`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function voidEntry() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/yearwise-admission/${id}/void`, { reason: voidReason });
      setVoidModal(false);
      setVoidReason('');
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
      await api.post(`/yearwise-admission/${id}/correct`, { field: corrField, value: corrValue, reason: corrReason });
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

  async function revealAadhaar() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.get(`/yearwise-admission/${id}/aadhaar`);
      setAadhaarFull((res.data as { data: { aadhaar: string } }).data.aadhaar);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const fieldOptions = Object.entries(FIELD_LABELS).map(([k, v]) => ({ key: k, label: t(v) }));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        {error ? <Text style={{ color: palette.error, marginBottom: spacing.md }}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.appNo}>{row.entryNumber} | {row.registerYear}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[row.status] ?? '#6b7280' }]}>
              <Text style={styles.statusText}>{t(`ywa.status${row.status}`)}</Text>
            </View>
          </View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.fullName')}</Text><Text style={styles.fieldValue}>{row.fullName || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.residentLink')}</Text><Text style={styles.fieldValue}>{row.residentId ? `${row.residentNumber} (${row.residentId})` : t('ywa.notLinked')}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.dob')}</Text><Text style={styles.fieldValue}>{row.birthDate ? String(row.birthDate).slice(0, 10) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.birthYear')}</Text><Text style={styles.fieldValue}>{row.birthYear ?? '—'}</Text></View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('ywa.aadhaar')}</Text>
            <Text style={styles.fieldValue}>
              {aadhaarFull ?? row.aadhaarMasked ?? row.aadhaar}
            </Text>
          </View>
          {canReadFullAadhaar && !aadhaarFull && (row.aadhaarMasked || row.aadhaar) ? (
            <TouchableOpacity onPress={() => void revealAadhaar()} disabled={busy}>
              <Text style={[styles.note, { color: palette.primary, fontWeight: '600' }]}>{t('ywa.viewAadhaar')}</Text>
            </TouchableOpacity>
          ) : null}
          {aadhaarFull ? <Text style={styles.aadhaarFull}>{aadhaarFull.replace(/(\d{4})/g, '$1 ')}</Text> : null}
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.signature')}</Text><Text style={styles.fieldValue}>{t(`ywa.signatureType${row.signatureType[0]?.toUpperCase()}${row.signatureType.slice(1)}`)}</Text></View>
          {row.noSignatureReason ? <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.noSignatureReason')}</Text><Text style={styles.fieldValue}>{row.noSignatureReason}</Text></View> : null}
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.admissionDate')}</Text><Text style={styles.fieldValue}>{row.admissionDate ? String(row.admissionDate).slice(0, 10) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.officerName')}</Text><Text style={styles.fieldValue}>{row.officerName || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.officerDesignation')}</Text><Text style={styles.fieldValue}>{row.officerDesignation || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.officerSignature')}</Text><Text style={styles.fieldValue}>{row.officerSignature || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.remarks')}</Text><Text style={styles.fieldValue}>{row.remarks || '—'}</Text></View>
          {row.voidReason ? <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.void')}</Text><Text style={styles.fieldValue}>{row.voidReason}</Text></View> : null}
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.submittedAt')}</Text><Text style={styles.fieldValue}>{row.submittedAt ? String(row.submittedAt).slice(0, 19) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('ywa.finalizedAt')}</Text><Text style={styles.fieldValue}>{row.finalizedAt ? String(row.finalizedAt).slice(0, 19) : '—'}</Text></View>
        </View>

        {canWrite && row.status === 'DRAFT' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void submit()} disabled={busy}>
              <Text style={styles.actionText}>{t('ywa.submit')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'UNDER_REVIEW' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void approve()} disabled={busy}>
              <Text style={styles.actionText}>{t('ywa.approve')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'APPROVED' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void finalize()} disabled={busy}>
              <Text style={styles.actionText}>{t('ywa.finalize')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'FINALIZED' ? (
          <View>
            <Text style={styles.note}>{t('ywa.correctionWorkflow')}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.surfaceAlt }]} onPress={() => setCorrectionModal(true)}>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{t('ywa.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.error }]} onPress={() => setVoidModal(true)}>
                <Text style={styles.actionText}>{t('ywa.void')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {row.changes.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('ywa.auditHistory')}</Text>
            {row.changes.map((c, i) => (
              <View key={i} style={styles.auditRow}>
                <Text style={styles.fieldValue}>{t(FIELD_LABELS[c.field] ?? c.field)}</Text>
                <Text style={styles.note}>{t('ywa.previousValue')}: {String(c.previousValue ?? '')} → {t('ywa.newValue')}: {String(c.newValue ?? '')}</Text>
                <Text style={styles.note}>{t('ywa.reasonForChange')}: {c.reason}</Text>
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
            <Text style={styles.modalTitle}>{t('ywa.edit')}</Text>
            <Text style={styles.label}>{t('ywa.correctionWorkflow')}</Text>
            <View style={styles.chipRow}>
              {fieldOptions.map((f) => (
                <TouchableOpacity key={f.key} style={[styles.chip, corrField === f.key && styles.chipActive]} onPress={() => { setCorrField(f.key); setCorrValue(''); }}>
                  <Text style={[styles.chipText, corrField === f.key && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('ywa.newValue')}</Text>
            <TextInput style={styles.input} value={corrValue} onChangeText={setCorrValue} placeholder={t('ywa.newValue')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('ywa.reasonForChange')}</Text>
            <TextInput style={styles.textArea} value={corrReason} onChangeText={setCorrReason} placeholder={t('ywa.reasonForChange')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCorrectionModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void correct()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={voidModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('ywa.void')}</Text>
            <Text style={styles.label}>{t('ywa.voidWorkflow')}</Text>
            <Text style={styles.label}>{t('ywa.reasonForChange')}</Text>
            <TextInput style={styles.textArea} value={voidReason} onChangeText={setVoidReason} placeholder={t('ywa.reasonForChange')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setVoidModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.dangerButton} onPress={() => void voidEntry()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('ywa.void')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}