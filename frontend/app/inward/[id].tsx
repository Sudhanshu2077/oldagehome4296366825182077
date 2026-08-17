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
import { tokenStorage } from '../../src/api/storage';
import { API_BASE_URL } from '../../src/config/env';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface InwardAttachment {
  documentId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string | null;
  verificationStatus: string;
}

interface InwardEntry {
  id: string;
  entryNumber: string;
  status: string;
  fileNo: string;
  senderName: string;
  letterNo: string;
  receivedDate: string | null;
  subject: string;
  issuedTo: string;
  attachments: InwardAttachment[];
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
  fileNo: 'inward.fileNo',
  senderName: 'inward.fromWhomReceived',
  letterNo: 'inward.letterNo',
  receivedDate: 'inward.receivedDate',
  subject: 'inward.subject',
  issuedTo: 'inward.toWhomIssued',
};

export default function InwardDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [row, setRow] = useState<InwardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [correctionModal, setCorrectionModal] = useState(false);
  const [corrField, setCorrField] = useState<keyof typeof FIELD_LABELS>('senderName');
  const [corrValue, setCorrValue] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);

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
    fieldLabel: { width: 150, fontSize: 12, color: palette.textMuted },
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
    attachRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: spacing.sm },
    attachName: { fontSize: 12, color: palette.text, flex: 1 },
    attachMeta: { fontSize: 10, color: palette.textMuted },
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
      const res = await api.get(`/inward/${id}`);
      setRow((res.data as { data: InwardEntry }).data);
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

  function openEdit() {
    if (!row) return;
    setForm({
      fileNo: row.fileNo,
      senderName: row.senderName,
      letterNo: row.letterNo,
      receivedDate: row.receivedDate ? String(row.receivedDate).slice(0, 10) : '',
      subject: row.subject,
      issuedTo: row.issuedTo,
    });
    setEditing(true);
  }

  async function saveEdit() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/inward/${id}`, {
        fileNo: form.fileNo ?? '',
        senderName: form.senderName ?? '',
        letterNo: form.letterNo ?? '',
        receivedDate: form.receivedDate || null,
        subject: form.subject ?? '',
        issuedTo: form.issuedTo ?? '',
      });
      setEditing(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/inward/${id}/submit`);
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
      await api.post(`/inward/${id}/review`);
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
      await api.post(`/inward/${id}/correct`, { field: corrField, value: corrValue, reason: corrReason });
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

  async function attachFile() {
    setUploadBusy(true);
    setError(null);
    try {
      const token = await tokenStorage.getItem('accessToken');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,image/*,.doc,.docx,application/pdf,image/*,application/msword';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', 'inward-register');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/documents`, { method: 'POST', headers, body: fd });
        if (!res.ok) throw new Error('upload failed');
        const uploaded = (await res.json()) as { data: { id: string; name: string; size: number } };
        const attachment = {
          documentId: uploaded.data.id,
          filename: uploaded.data.name,
          size: uploaded.data.size,
          verificationStatus: 'pending',
        };
        const current = row?.attachments ?? [];
        await api.patch(`/inward/${id}`, { attachments: [...current, attachment] });
        await load();
      };
      input.click();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploadBusy(false);
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
              <Text style={styles.statusText}>{t(`inward.status${row.status}`)}</Text>
            </View>
          </View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inward.srNoFileNo')}</Text><Text style={styles.fieldValue}>{row.entryNumber}{row.fileNo ? ` / ${row.fileNo}` : ''}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inward.fromWhomReceived')}</Text><Text style={styles.fieldValue}>{row.senderName || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inward.letterNo')}</Text><Text style={styles.fieldValue}>{row.letterNo || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inward.receivedDate')}</Text><Text style={styles.fieldValue}>{row.receivedDate ? String(row.receivedDate).slice(0, 10) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inward.subject')}</Text><Text style={styles.fieldValue}>{row.subject || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inward.toWhomIssued')}</Text><Text style={styles.fieldValue}>{row.issuedTo || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inward.submittedAt')}</Text><Text style={styles.fieldValue}>{row.submittedAt ? String(row.submittedAt).slice(0, 19) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('inward.finalizedAt')}</Text><Text style={styles.fieldValue}>{row.finalizedAt ? String(row.finalizedAt).slice(0, 19) : '—'}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('inward.attachments')}</Text>
          {(row.attachments ?? []).length === 0 ? <Text style={styles.note}>{t('inward.listEmpty')}</Text> : null}
          {(row.attachments ?? []).map((a, i) => (
            <View key={i} style={styles.attachRow}>
              <Text style={styles.attachName} numberOfLines={1}>{a.filename}</Text>
              <Text style={styles.attachMeta}>{a.verificationStatus} · {a.uploadedAt ? String(a.uploadedAt).slice(0, 10) : ''}</Text>
            </View>
          ))}
          {canWrite ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary, { marginTop: spacing.md }]} onPress={() => void attachFile()} disabled={uploadBusy}>
              {uploadBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>{t('inward.attachDocument')}</Text>}
            </TouchableOpacity>
          ) : null}
        </View>

        {editing && canWrite ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('inward.edit')}</Text>
            <Text style={styles.label}>{t('inward.fileNo')}</Text>
            <TextInput style={styles.input} value={form.fileNo ?? ''} onChangeText={(v) => setForm((p) => ({ ...p, fileNo: v }))} placeholder={t('inward.fileNo')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inward.fromWhomReceived')}</Text>
            <TextInput style={styles.input} value={form.senderName ?? ''} onChangeText={(v) => setForm((p) => ({ ...p, senderName: v }))} placeholder={t('inward.fromWhomReceived')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inward.letterNo')}</Text>
            <TextInput style={styles.input} value={form.letterNo ?? ''} onChangeText={(v) => setForm((p) => ({ ...p, letterNo: v }))} placeholder={t('inward.letterNo')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inward.receivedDate')}</Text>
            <TextInput style={styles.input} value={form.receivedDate ?? ''} onChangeText={(v) => setForm((p) => ({ ...p, receivedDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inward.subject')}</Text>
            <TextInput style={styles.textArea} value={form.subject ?? ''} onChangeText={(v) => setForm((p) => ({ ...p, subject: v }))} placeholder={t('inward.subject')} placeholderTextColor={palette.textMuted} multiline />
            <Text style={styles.label}>{t('inward.toWhomIssued')}</Text>
            <TextInput style={styles.input} value={form.issuedTo ?? ''} onChangeText={(v) => setForm((p) => ({ ...p, issuedTo: v }))} placeholder={t('inward.toWhomIssued')} placeholderTextColor={palette.textMuted} />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.surfaceAlt }]} onPress={() => setEditing(false)}>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void saveEdit()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>{t('inward.saveDraft')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {canWrite && row.status === 'DRAFT' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.surfaceAlt }]} onPress={openEdit}>
              <Text style={{ color: palette.text, fontWeight: '600' }}>{t('inward.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void submit()} disabled={busy}>
              <Text style={styles.actionText}>{t('inward.submit')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'SUBMITTED' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void review()} disabled={busy}>
              <Text style={styles.actionText}>{t('inward.finalize')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canReview && row.status === 'FINALIZED' ? (
          <View>
            <Text style={styles.note}>{t('inward.correctionWorkflow')}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: palette.surfaceAlt }]} onPress={() => setCorrectionModal(true)}>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{t('inward.review')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {row.changes.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('inward.auditHistory')}</Text>
            {row.changes.map((c, i) => (
              <View key={i} style={styles.auditRow}>
                <Text style={styles.fieldValue}>{t(FIELD_LABELS[c.field] ?? c.field)}</Text>
                <Text style={styles.note}>{t('inward.previousValue')}: {String(c.previousValue ?? '')} → {t('inward.newValue')}: {String(c.newValue ?? '')}</Text>
                <Text style={styles.note}>{t('inward.reasonForChange')}: {c.reason}</Text>
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
            <Text style={styles.modalTitle}>{t('inward.review')}</Text>
            <Text style={styles.label}>{t('inward.correctionWorkflow')}</Text>
            <View style={styles.chipRow}>
              {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).map((f) => (
                <TouchableOpacity key={f} style={[styles.chip, corrField === f && styles.chipActive]} onPress={() => setCorrField(f)}>
                  <Text style={[styles.chipText, corrField === f && styles.chipTextActive]}>{t(FIELD_LABELS[f] ?? 'inward.subject')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('inward.newValue')}</Text>
            <TextInput style={styles.input} value={corrValue} onChangeText={setCorrValue} placeholder={t('inward.newValue')} placeholderTextColor={palette.textMuted} />
            <Text style={styles.label}>{t('inward.reasonForChange')}</Text>
            <TextInput style={styles.textArea} value={corrReason} onChangeText={setCorrReason} placeholder={t('inward.reasonForChange')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCorrectionModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void correct()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('inward.saveDraft')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}