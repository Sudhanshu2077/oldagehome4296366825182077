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

interface ResidentRow {
  id: string;
  residentNumber: string;
  fullName: string;
  photoUrl: string;
  roomName: string;
  bedName: string;
}

interface EntryRow {
  residentId: string;
  residentNumber: string;
  fullName: string;
  roomName: string;
  bedName: string;
  status: string;
  reason: string;
}

interface SessionRow {
  id: string;
  sessionId: string;
  attendanceDate: string;
  status: string;
  entries: EntryRow[];
  corrections: { residentId: string; fullName: string; originalStatus: string; newStatus: string; reason: string; changedAt: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#047857',
  ABSENT: '#b91c1c',
  ON_LEAVE: '#d97706',
  MEDICAL: '#2563eb',
  TEMPORARILY_OUT: '#7c3aed',
  OTHER: '#6b7280',
};

const REASON_REQUIRED = ['ABSENT', 'MEDICAL', 'TEMPORARILY_OUT'];

export default function AttDailyScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = params.date ?? '';
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [session, setSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [submitSummary, setSubmitSummary] = useState<Record<string, number> | null>(null);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [corrResidentId, setCorrResidentId] = useState('');
  const [corrStatus, setCorrStatus] = useState('PRESENT');
  const [corrReason, setCorrReason] = useState('');
  const [corrError, setCorrError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const canMark = user?.tier === 'institution' && (user?.role === 'assistant-manager' || user?.role === 'department-user');
  const canReview = user?.tier === 'institution' && (user?.role === 'institution-head' || user?.role === 'assistant-manager');

  const statuses = ['PRESENT', 'ABSENT', 'ON_LEAVE', 'MEDICAL', 'TEMPORARILY_OUT', 'OTHER'] as const;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
    card: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: palette.border },
    title: { fontSize: 15, fontWeight: '700', color: palette.text, textAlign: 'center' },
    sub: { fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 2 },
    residentRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: spacing.sm },
    residentInfo: { flex: 1 },
    residentName: { fontSize: 13, fontWeight: '600', color: palette.text },
    residentIdText: { fontSize: 11, color: palette.textMuted, marginTop: 1 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 11, color: palette.text },
    chipTextActive: { color: palette.textInverse },
    reasonInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 12, color: palette.text, backgroundColor: palette.surface, marginTop: spacing.xs },
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    summaryChip: { backgroundColor: palette.backgroundSoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
    summaryText: { fontSize: 12, color: palette.text },
    toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, flex: 1, minWidth: 140 },
    smallInput: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, width: 110 },
    primaryButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
    primaryText: { color: palette.textInverse, fontWeight: '700', fontSize: 14 },
    outlineButton: { borderWidth: 1, borderColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
    outlineText: { color: palette.primary, fontWeight: '600', fontSize: 14 },
    error: { color: palette.error, marginBottom: spacing.md },
    note: { fontSize: 11, color: palette.textMuted, marginTop: spacing.sm },
    label: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
    auditRow: { marginBottom: spacing.md, borderLeftWidth: 2, borderLeftColor: palette.border, paddingLeft: spacing.md },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
  }), [palette]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/resident-attendance/meta', { params: { date } });
      const data = (res.data as { data: { residents: ResidentRow[]; session: SessionRow | null } }).data;
      setResidents(data.residents);
      setSession(data.session);
      if (data.session) {
        const sm: Record<string, string> = {};
        const rm: Record<string, string> = {};
        data.session.entries.forEach((e) => {
          sm[e.residentId] = e.status;
          rm[e.residentId] = e.reason;
        });
        setStatusMap(sm);
        setReasonMap(rm);
      }
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  function computeSummary() {
    const s: Record<string, number> = { total: 0, marked: 0, PRESENT: 0, ABSENT: 0, ON_LEAVE: 0, MEDICAL: 0, TEMPORARILY_OUT: 0, OTHER: 0 };
    const active = residents.filter((r) => statusMap[r.id]);
    s.total = residents.length;
    s.marked = active.length;
    active.forEach((r) => {
      const st = statusMap[r.id] ?? '';
      if (st in s) s[st] = (s[st] as number) + 1;
    });
    return s;
  }

  function presentAll() {
    const sm = { ...statusMap };
    residents.forEach((r) => {
      if (reasonMap[r.id] && REASON_REQUIRED.includes(statusMap[r.id] ?? '')) sm[r.id] = 'PRESENT';
      else sm[r.id] = 'PRESENT';
    });
    setStatusMap(sm);
    setReasonMap({});
  }

  async function submitAttendance() {
    setBusy(true);
    setError(null);
    try {
      const body = {
        residentIds: residents.map((r) => r.id),
        statusMap,
        reasonMap,
      };
      const res = await api.post(`/resident-attendance/${date}/mark`, body);
      const data = (res.data as { data: { summary: Record<string, number> } }).data;
      setSubmitSummary(data.summary);
      setConfirmModal(true);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmSubmit() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/resident-attendance/${date}/submit`);
      setConfirmModal(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function applyCorrection() {
    setCorrError(null);
    if (!corrResidentId) {
      setCorrError(t('att.correctionSelectResident'));
      return;
    }
    if (!corrReason.trim()) {
      setCorrError(t('att.correctionReasonRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/resident-attendance/${date}/correct`, { residentId: corrResidentId, status: corrStatus, reason: corrReason });
      setCorrectionMode(false);
      setCorrReason('');
      setCorrResidentId('');
      setCorrError(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const filteredResidents = residents.filter((r) => {
    if (filterStatus && statusMap[r.id] !== filterStatus) return false;
    if (search.trim() && !r.fullName.toLowerCase().includes(search.trim().toLowerCase()) && !r.residentNumber.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const summary = computeSummary();
  const isSubmitted = session?.status === 'SUBMITTED';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('att.title')}</Text>
          <Text style={styles.sub}>{t('att.attendanceDate')}: {date}</Text>
          <Text style={styles.sub}>{session?.sessionId ?? ''}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.total')}: {summary.total}</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.marked')}: {summary.marked}</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusPRESENT')}: {summary.PRESENT}</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusABSENT')}: {summary.ABSENT}</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusON_LEAVE')}: {summary.ON_LEAVE}</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusMEDICAL')}: {summary.MEDICAL}</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusTEMPORARILY_OUT')}: {summary.TEMPORARILY_OUT}</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusOTHER')}: {summary.OTHER}</Text></View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.toolbar}>
          <TextInput style={styles.input} placeholder={t('att.search')} value={search} onChangeText={setSearch} placeholderTextColor={palette.textMuted} />
          <TextInput style={styles.smallInput} placeholder={t('att.filterStatus')} value={filterStatus} onChangeText={setFilterStatus} placeholderTextColor={palette.textMuted} />
        </View>

        {!isSubmitted && canMark ? (
          <TouchableOpacity style={styles.outlineButton} onPress={presentAll}>
            <Text style={styles.outlineText}>{t('att.presentAll')}</Text>
          </TouchableOpacity>
        ) : null}

        {filteredResidents.map((r) => {
          const current = statusMap[r.id] ?? (isSubmitted ? 'PRESENT' : 'PRESENT');
          const reasonRequired = REASON_REQUIRED.includes(current);
          const canEdit = !isSubmitted && canMark;
          return (
            <View key={r.id} style={styles.residentRow}>
              <View style={styles.residentInfo}>
                <Text style={styles.residentName}>{r.fullName}</Text>
                <Text style={styles.residentIdText}>{r.residentNumber}{r.roomName ? ` · ${r.roomName}${r.bedName ? `/ ${r.bedName}` : ''}` : ''}</Text>
              </View>
              <View>
                <View style={styles.chipRow}>
                  {statuses.map((st) => (
                    <TouchableOpacity key={st} style={[styles.chip, current === st && styles.chipActive]} disabled={!canEdit} onPress={() => setStatusMap((p) => ({ ...p, [r.id]: st }))}>
                      <Text style={[styles.chipText, current === st && styles.chipTextActive]}>{t(`att.status${st}`)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {reasonRequired && canEdit ? (
                  <TextInput style={styles.reasonInput} value={reasonMap[r.id] ?? ''} onChangeText={(v) => setReasonMap((p) => ({ ...p, [r.id]: v }))} placeholder={t('att.reason')} placeholderTextColor={palette.textMuted} />
                ) : null}
                {isSubmitted && reasonMap[r.id] ? <Text style={styles.note}>{t('att.reason')}: {reasonMap[r.id]}</Text> : null}
              </View>
            </View>
          );
        })}

        {!isSubmitted && canMark ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => void submitAttendance()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t('att.submit')}</Text>}
          </TouchableOpacity>
        ) : null}

        {isSubmitted && (canMark || canReview) ? (
          <TouchableOpacity style={styles.outlineButton} onPress={() => { setCorrError(null); setCorrResidentId(''); setCorrReason(''); setCorrStatus('PRESENT'); setCorrectionMode(true); }}>
            <Text style={styles.outlineText}>{t('att.editAttendance')}</Text>
          </TouchableOpacity>
        ) : null}

        {session && session.corrections.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('att.auditHistory')}</Text>
            {session.corrections.map((c, i) => (
              <View key={i} style={styles.auditRow}>
                <Text style={styles.residentName}>{c.fullName}</Text>
                <Text style={styles.note}>{t('att.originalStatus')}: {t(`att.status${c.originalStatus}`)} → {t('att.newStatus')}: {t(`att.status${c.newStatus}`)}</Text>
                <Text style={styles.note}>{t('att.reason')}: {c.reason}</Text>
                <Text style={styles.note}>{String(c.changedAt).slice(0, 19)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.outlineButton} onPress={() => router.back()}>
          <Text style={styles.outlineText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={confirmModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('att.submitSummary')}</Text>
            {submitSummary ? (
              <View style={styles.summaryRow}>
                <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.total')}: {submitSummary.total}</Text></View>
                <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.marked')}: {submitSummary.marked}</Text></View>
                <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusPRESENT')}: {submitSummary.PRESENT}</Text></View>
                <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusABSENT')}: {submitSummary.ABSENT}</Text></View>
                <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusON_LEAVE')}: {submitSummary.ON_LEAVE}</Text></View>
                <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusMEDICAL')}: {submitSummary.MEDICAL}</Text></View>
                <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusTEMPORARILY_OUT')}: {submitSummary.TEMPORARILY_OUT}</Text></View>
                <View style={styles.summaryChip}><Text style={styles.summaryText}>{t('att.statusOTHER')}: {submitSummary.OTHER}</Text></View>
              </View>
            ) : null}
            <Text style={styles.note}>{t('att.confirmSubmit')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmModal(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void confirmSubmit()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('att.confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={correctionMode} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('att.correctionMode')}</Text>
            <View style={styles.chipRow}>
              {residents.map((r) => (
                <TouchableOpacity key={r.id} style={[styles.chip, corrResidentId === r.id && styles.chipActive]} onPress={() => { setCorrResidentId(r.id); setCorrStatus('PRESENT'); setCorrError(null); }}>
                  <Text style={[styles.chipText, corrResidentId === r.id && styles.chipTextActive]}>{r.fullName}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.chipRow}>
              {statuses.map((st) => (
                <TouchableOpacity key={st} style={[styles.chip, corrStatus === st && styles.chipActive]} onPress={() => { setCorrStatus(st); setCorrError(null); }}>
                  <Text style={[styles.chipText, corrStatus === st && styles.chipTextActive]}>{t(`att.status${st}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('att.correctionReason')}</Text>
            <TextInput style={styles.reasonInput} value={corrReason} onChangeText={(v) => { setCorrReason(v); setCorrError(null); }} placeholder={t('att.correctionReason')} placeholderTextColor={palette.textMuted} />
            {corrError ? <Text style={styles.error}>{corrError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCorrectionMode(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void applyCorrection()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}