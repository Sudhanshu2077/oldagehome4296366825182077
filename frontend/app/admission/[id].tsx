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
import { useLocalSearchParams } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface AdmissionDetail {
  id: string;
  applicationNumber: string;
  status: string;
  name: string;
  gender: string | null;
  fatherName: string;
  spouseName: string;
  surname: string;
  caste: string;
  religion: string;
  address: string;
  village: string;
  taluka: string;
  district: string;
  admissionDate: string | null;
  currentAge: number | null;
  idProofNumber: string;
  aadhaar: string;
  aadhaarLast4: string;
  occupationStatus: string | null;
  husband: { name: string; age: number | null; phone: string } | null;
  wife: { name: string; age: number | null; phone: string } | null;
  sonsDaughters: { name: string; age: number | null; relation: string; phone: string }[];
  brothers: { name: string; age: number | null; relation: string; phone: string }[];
  annualIncome: number | null;
  freeAdmissionRequested: boolean;
  paidAdmission: boolean;
  monthlyFeeAcceptance: boolean;
  dailyActivitiesSelf: boolean;
  noInfectiousDisease: boolean;
  rulesAccepted: boolean;
  noSubstanceAddiction: boolean;
  govRuleReference: string;
  recreationalActivities: string[];
  femaleRoomAvailable: boolean | null;
  photoUrl: string;
  signatureMethod: string;
  signatureUrl: string;
  finalDeclarationAccepted: boolean;
  committeeDecision: { recommendation: string; admissionCategory: string | null; remarks: string; decisionDate: string; decidedBy: string } | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvalDate: string | null;
  changes: { field: string; previousValue: unknown; newValue: unknown; reason: string; changedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#2563eb',
  PENDING_REVIEW: '#9333ea',
  RECOMMENDED: '#16a34a',
  NOT_RECOMMENDED: '#ea580c',
  APPROVED: '#047857',
  REJECTED: '#dc2626',
  QUERY_RAISED: '#d97706',
};

export default function AdmissionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [row, setRow] = useState<AdmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'' | 'committee' | 'reject' | 'query' | 'aadhaar'>('');
  const [recommendation, setRecommendation] = useState('recommended');
  const [admissionCategory, setAdmissionCategory] = useState('free');
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');
  const [fullAadhaar, setFullAadhaar] = useState('');

  const canReview = user?.tier === 'institution' && (user?.role === 'institution-head' || user?.role === 'assistant-manager');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
    headerCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: palette.border },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    appNo: { fontSize: 13, fontWeight: '700', color: palette.primaryDark },
    statusBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
    name: { fontSize: 18, fontWeight: '700', color: palette.text },
    meta: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
    section: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: palette.border },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    fieldRow: { flexDirection: 'row', marginBottom: spacing.xs },
    fieldLabel: { width: 140, fontSize: 12, color: palette.textMuted },
    fieldValue: { flex: 1, fontSize: 12, color: palette.text },
    yes: { color: palette.success, fontWeight: '600' },
    no: { color: palette.error, fontWeight: '600' },
    actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
    actionBtn: { flex: 1, minWidth: 140, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    actionPrimary: { backgroundColor: palette.primary },
    actionDanger: { backgroundColor: palette.error },
    actionWarn: { backgroundColor: palette.warning },
    actionText: { color: palette.textInverse, fontWeight: '700', fontSize: 13 },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    label: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft, marginBottom: spacing.md },
    textArea: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.md },
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
    aadhaarValue: { fontSize: 18, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admissions/${id}`);
      setRow((res.data as { data: AdmissionDetail }).data);
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

  async function submitCommittee() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admissions/${id}/committee`, { recommendation, admissionCategory, remarks, committee: [] });
      setModal('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitAction(action: 'approve' | 'reject' | 'query') {
    setBusy(true);
    setError(null);
    try {
      if (action === 'approve') await api.post(`/admissions/${id}/approve`);
      if (action === 'reject') await api.post(`/admissions/${id}/reject`, { reason });
      if (action === 'query') await api.post(`/admissions/${id}/query`, { reason });
      setModal('');
      setReason('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function viewFullAadhaar() {
    setBusy(true);
    try {
      const res = await api.post(`/admissions/${id}/aadhaar/full`);
      setFullAadhaar((res.data as { data: string }).data);
      setModal('aadhaar');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (!row) return <View style={styles.center}><Text style={styles.fieldValue}>{error}</Text></View>;

  const bool = (v: boolean) => <Text style={v ? styles.yes : styles.no}>{v ? t('admission.yes') : t('admission.no')}</Text>;

  const decision = row.committeeDecision;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {error ? <Text style={{ color: palette.error, marginBottom: spacing.md }}>{error}</Text> : null}

        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.appNo}>{row.applicationNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[row.status] ?? '#6b7280' }]}>
              <Text style={styles.statusText}>{t(`admission.status.${row.status}`)}</Text>
            </View>
          </View>
          <Text style={styles.name}>{row.name}</Text>
          <Text style={styles.meta}>{t('admission.age')}: {row.currentAge ?? '—'}</Text>
          <Text style={styles.meta}>{t('admission.admissionDate')}: {row.admissionDate ? String(row.admissionDate).slice(0, 10) : '—'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionPersonal')}</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.name')}</Text><Text style={styles.fieldValue}>{row.name}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.gender')}</Text><Text style={styles.fieldValue}>{row.gender ? t(`admission.${row.gender}`) : '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.fatherName')}</Text><Text style={styles.fieldValue}>{row.fatherName || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.spouseName')}</Text><Text style={styles.fieldValue}>{row.spouseName || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.surname')}</Text><Text style={styles.fieldValue}>{row.surname || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.caste')}</Text><Text style={styles.fieldValue}>{row.caste || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.religion')}</Text><Text style={styles.fieldValue}>{row.religion || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.address')}</Text><Text style={styles.fieldValue}>{row.address || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.village')}</Text><Text style={styles.fieldValue}>{row.village || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.taluka')}</Text><Text style={styles.fieldValue}>{row.taluka || '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.district')}</Text><Text style={styles.fieldValue}>{row.district || '—'}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionIdentity')}</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.currentAge')}</Text><Text style={styles.fieldValue}>{row.currentAge ?? '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.idProofNumber')}</Text><Text style={styles.fieldValue}>{row.idProofNumber || '—'}</Text></View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('admission.aadhaar')}</Text>
            <Text style={styles.fieldValue}>{row.aadhaar || '—'}{user?.tier === 'institution' && (user.role === 'institution-head' || user.role === 'assistant-manager') ? `  ` : ''}</Text>
          </View>
          {user?.tier === 'institution' && (user.role === 'institution-head' || user.role === 'assistant-manager') && row.aadhaarLast4 ? (
            <TouchableOpacity onPress={() => void viewFullAadhaar()}>
              <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600' }}>{t('admission.aadhaarMasked')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionOccupation')}</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.occupationStatus')}</Text><Text style={styles.fieldValue}>{row.occupationStatus ? t(`admission.occupation${row.occupationStatus.charAt(0).toUpperCase()}${row.occupationStatus.slice(1)}`) : '—'}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionRelatives')}</Text>
          {row.husband ? (
            <View>
              <Text style={styles.fieldLabel}>{t('admission.husband')}</Text>
              <Text style={styles.fieldValue}>{row.husband.name} · {row.husband.age ?? '—'} · {row.husband.phone || '—'}</Text>
            </View>
          ) : null}
          {row.wife ? (
            <View>
              <Text style={styles.fieldLabel}>{t('admission.wife')}</Text>
              <Text style={styles.fieldValue}>{row.wife.name} · {row.wife.age ?? '—'} · {row.wife.phone || '—'}</Text>
            </View>
          ) : null}
          {row.sonsDaughters.length > 0 ? (
            <View>
              <Text style={styles.fieldLabel}>{t('admission.sonDaughter')}</Text>
              {row.sonsDaughters.map((r, i) => <Text key={i} style={styles.fieldValue}>{r.name} · {r.age ?? '—'} · {r.relation || '—'} · {r.phone || '—'}</Text>)}
            </View>
          ) : null}
          {row.brothers.length > 0 ? (
            <View>
              <Text style={styles.fieldLabel}>{t('admission.brother')}</Text>
              {row.brothers.map((r, i) => <Text key={i} style={styles.fieldValue}>{r.name} · {r.age ?? '—'} · {r.relation || '—'} · {r.phone || '—'}</Text>)}
            </View>
          ) : null}
          {!row.husband && !row.wife && row.sonsDaughters.length === 0 && row.brothers.length === 0 ? <Text style={styles.fieldValue}>—</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionFinancial')}</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.annualIncome')}</Text><Text style={styles.fieldValue}>{row.annualIncome ?? '—'}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.freeAdmissionRequested')}</Text>{bool(row.freeAdmissionRequested)}</View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.paidAdmission')}</Text>{bool(row.paidAdmission)}</View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.monthlyFeeAcceptance')}</Text>{bool(row.monthlyFeeAcceptance)}</View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionDeclarations')}</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.declarationDailyActivities')}</Text>{bool(row.dailyActivitiesSelf)}</View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.declarationDisease')}</Text>{bool(row.noInfectiousDisease)}</View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.declarationRules')}</Text>{bool(row.rulesAccepted)}</View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.declarationSubstance')}</Text>{bool(row.noSubstanceAddiction)}</View>
          <Text style={{ fontSize: 11, color: palette.textMuted, marginTop: spacing.sm }}>{t('admission.govRuleReference')}</Text>
          {row.recreationalActivities.length > 0 ? <Text style={styles.fieldValue}>{row.recreationalActivities.join(', ')}</Text> : null}
        </View>

        {decision ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('admission.sectionCommittee')}</Text>
            <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.committeeRecommendation')}</Text><Text style={styles.fieldValue}>{decision.recommendation === 'recommended' ? t('admission.recommended') : t('admission.notRecommended')}</Text></View>
            {decision.admissionCategory ? <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.admissionCategory')}</Text><Text style={styles.fieldValue}>{decision.admissionCategory === 'free' ? t('admission.free') : t('admission.paid')}</Text></View> : null}
            {decision.remarks ? <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.committeeRemarks')}</Text><Text style={styles.fieldValue}>{decision.remarks}</Text></View> : null}
            <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{t('admission.decisionDate')}</Text><Text style={styles.fieldValue}>{String(decision.decisionDate).slice(0, 10)}</Text></View>
          </View>
        ) : null}

        {row.changes.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('admission.auditTrail')}</Text>
            {row.changes.map((c, i) => (
              <View key={i} style={{ marginBottom: spacing.sm }}>
                <Text style={styles.fieldValue}>{c.field}: {String(c.previousValue)} → {String(c.newValue)}{c.reason ? ` (${c.reason})` : ''}</Text>
                <Text style={{ fontSize: 10, color: palette.textMuted }}>{String(c.changedAt).slice(0, 19)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {canReview && (row.status === 'SUBMITTED' || row.status === 'RECOMMENDED' || row.status === 'PENDING_REVIEW') ? (
          <View style={styles.actionsRow}>
            {row.status === 'SUBMITTED' || row.status === 'PENDING_REVIEW' ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => setModal('committee')}>
                <Text style={styles.actionText}>{t('admission.recordDecision')}</Text>
              </TouchableOpacity>
            ) : null}
            {row.status === 'RECOMMENDED' ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => void submitAction('approve')} disabled={busy}>
                <Text style={styles.actionText}>{t('admission.approve')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.actionBtn, styles.actionWarn]} onPress={() => setModal('query')}>
              <Text style={styles.actionText}>{t('admission.raiseQuery')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionDanger]} onPress={() => setModal('reject')}>
              <Text style={styles.actionText}>{t('admission.reject')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={modal === 'committee'} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admission.recordDecision')}</Text>
            <Text style={styles.label}>{t('admission.committeeRecommendation')}</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, recommendation === 'recommended' && styles.chipActive]} onPress={() => setRecommendation('recommended')}>
                <Text style={[styles.chipText, recommendation === 'recommended' && styles.chipTextActive]}>{t('admission.recommended')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, recommendation === 'not-recommended' && styles.chipActive]} onPress={() => setRecommendation('not-recommended')}>
                <Text style={[styles.chipText, recommendation === 'not-recommended' && styles.chipTextActive]}>{t('admission.notRecommended')}</Text>
              </TouchableOpacity>
            </View>
            {recommendation === 'recommended' ? (
              <View>
                <Text style={styles.label}>{t('admission.admissionCategory')}</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, admissionCategory === 'free' && styles.chipActive]} onPress={() => setAdmissionCategory('free')}>
                    <Text style={[styles.chipText, admissionCategory === 'free' && styles.chipTextActive]}>{t('admission.free')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, admissionCategory === 'paid' && styles.chipActive]} onPress={() => setAdmissionCategory('paid')}>
                    <Text style={[styles.chipText, admissionCategory === 'paid' && styles.chipTextActive]}>{t('admission.paid')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            <Text style={styles.label}>{t('admission.committeeRemarks')}</Text>
            <TextInput style={styles.textArea} value={remarks} onChangeText={setRemarks} placeholder={t('admission.committeeRemarks')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModal('')}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void submitCommittee()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'reject'} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admission.reject')}</Text>
            <Text style={styles.label}>{t('admission.rejectReason')}</Text>
            <TextInput style={styles.textArea} value={reason} onChangeText={setReason} placeholder={t('admission.rejectReason')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModal('')}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: palette.error }]} onPress={() => void submitAction('reject')} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('admission.reject')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'query'} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admission.raiseQuery')}</Text>
            <Text style={styles.label}>{t('admission.queryReason')}</Text>
            <TextInput style={styles.textArea} value={reason} onChangeText={setReason} placeholder={t('admission.queryReason')} placeholderTextColor={palette.textMuted} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModal('')}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: palette.warning }]} onPress={() => void submitAction('query')} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('admission.raiseQuery')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'aadhaar'} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admission.aadhaar')}</Text>
            <Text style={styles.aadhaarValue}>{fullAadhaar.replace(/(\d{4})/g, '$1 ').trim()}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveButton} onPress={() => setModal('')}><Text style={styles.saveText}>{t('common.cancel')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}