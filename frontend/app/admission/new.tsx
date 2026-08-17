import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface Relative {
  name: string;
  age: string;
  relation: string;
  phone: string;
}

const emptyRelative = (): Relative => ({ name: '', age: '', relation: '', phone: '' });

interface Meta {
  financialRules: { annualIncomeThreshold: number; monthlyFee: number };
  committeeRoles: string[];
  statuses: string[];
  occupationStatuses: string[];
}

export default function AdmissionNewScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [husbandName, setHusbandName] = useState('');
  const [surname, setSurname] = useState('');
  const [caste, setCaste] = useState('');
  const [religion, setReligion] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [taluka, setTaluka] = useState('');
  const [district, setDistrict] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [currentAge, setCurrentAge] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [occupationStatus, setOccupationStatus] = useState('');
  const [husband, setHusband] = useState<Relative>(emptyRelative());
  const [wife, setWife] = useState<Relative>(emptyRelative());
  const [sonsDaughters, setSonsDaughters] = useState<Relative[]>([]);
  const [brothers, setBrothers] = useState<Relative[]>([]);
  const [annualIncome, setAnnualIncome] = useState('');
  const [freeAdmissionRequested, setFreeAdmissionRequested] = useState(false);
  const [paidAdmission, setPaidAdmission] = useState(false);
  const [monthlyFeeAcceptance, setMonthlyFeeAcceptance] = useState(false);
  const [dailyActivitiesSelf, setDailyActivitiesSelf] = useState(false);
  const [noInfectiousDisease, setNoInfectiousDisease] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [noSubstanceAddiction, setNoSubstanceAddiction] = useState(false);
  const [recreationalActivities, setRecreationalActivities] = useState('');
  const [signatureMethod, setSignatureMethod] = useState('digital');
  const [finalDeclarationAccepted, setFinalDeclarationAccepted] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
    section: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: palette.border },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    field: { marginBottom: spacing.md },
    label: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft },
    textArea: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft, minHeight: 70, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 12, color: palette.text },
    chipTextActive: { color: palette.textInverse },
    declarationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    declarationText: { flex: 1, fontSize: 12, color: palette.text, lineHeight: 18 },
    yesNo: { flexDirection: 'row', gap: spacing.xs },
    yesNoChip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    yesNoChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    yesNoText: { fontSize: 12, color: palette.text },
    yesNoTextActive: { color: palette.textInverse },
    relativeBlock: { borderWidth: 1, borderColor: palette.borderSoft, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.md, backgroundColor: palette.backgroundSoft },
    relativeRow: { flexDirection: 'row', gap: spacing.sm },
    relativeInput: { flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 13, color: palette.text, backgroundColor: palette.surface, marginBottom: spacing.sm },
    relativeRemove: { color: palette.error, fontWeight: '600', fontSize: 12, alignSelf: 'flex-end', padding: spacing.xs },
    addRelative: { color: palette.primary, fontWeight: '600', fontSize: 13, marginTop: spacing.xs },
    ruleRef: { fontSize: 11, color: palette.textMuted, lineHeight: 16, marginBottom: spacing.md },
    error: { color: palette.error, marginBottom: spacing.md },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    draftButton: { flex: 1, borderWidth: 1, borderColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    draftButtonText: { color: palette.primary, fontWeight: '600', fontSize: 14 },
    submitButton: { flex: 1, backgroundColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    submitText: { color: palette.textInverse, fontWeight: '700', fontSize: 14 },
  }), [palette]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/admissions/meta');
        setMeta((res.data as { data: Meta }).data);
      } catch {
        setMeta({ financialRules: { annualIncomeThreshold: 12000, monthlyFee: 500 }, committeeRoles: [], statuses: [], occupationStatuses: ['government', 'private', 'homemaker', 'unmarried'] });
      }
    })();
  }, []);

  function buildBody(): Record<string, unknown> {
    const clean = (r: Relative): Record<string, unknown> => ({ name: r.name, age: r.age === '' ? null : Number(r.age), relation: r.relation, phone: r.phone });
    return {
      name, fatherName, husbandName, surname, caste, religion, address, village, taluka, district,
      admissionDate: admissionDate || null,
      currentAge: currentAge === '' ? null : Number(currentAge),
      idProofNumber,
      aadhaar,
      occupationStatus: occupationStatus || null,
      husband: husband.name ? clean(husband) : null,
      wife: wife.name ? clean(wife) : null,
      sonsDaughters: sonsDaughters.filter((r) => r.name).map(clean),
      brothers: brothers.filter((r) => r.name).map(clean),
      annualIncome: annualIncome === '' ? null : Number(annualIncome),
      freeAdmissionRequested,
      paidAdmission,
      monthlyFeeAcceptance,
      dailyActivitiesSelf,
      noInfectiousDisease,
      rulesAccepted,
      noSubstanceAddiction,
      recreationalActivities: recreationalActivities ? recreationalActivities.split(',').map((s) => s.trim()).filter(Boolean) : [],
      signatureMethod,
      finalDeclarationAccepted,
    };
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/admissions', buildBody());
      router.replace('/admission/list');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitApplication() {
    setError(null);
    if (!name.trim()) {
      setError(t('admission.errorRequired'));
      return;
    }
    if (!rulesAccepted) {
      setError(t('admission.declarationRules'));
      return;
    }
    if (!finalDeclarationAccepted) {
      setError(t('admission.finalDeclarationAcknowledge'));
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/admissions', buildBody());
      const id = (res.data as { data: { id: string } }).data.id;
      await api.post(`/admissions/${id}/submit`);
      router.replace('/admission/list');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function renderRelativeBlock(label: string, value: Relative, onChange: (v: Relative) => void, showRelation: boolean, onRemove?: () => void) {
    return (
      <View style={styles.relativeBlock}>
        <View style={styles.relativeRow}>
          <TextInput style={styles.relativeInput} placeholder={t('admission.relativeName')} placeholderTextColor={palette.textMuted} value={value.name} onChangeText={(v) => onChange({ ...value, name: v })} />
          <TextInput style={styles.relativeInput} placeholder={t('admission.relativeAge')} placeholderTextColor={palette.textMuted} keyboardType="numeric" value={value.age} onChangeText={(v) => onChange({ ...value, age: v })} />
        </View>
        {showRelation ? (
          <TextInput style={styles.relativeInput} placeholder={t('admission.relativeRelation')} placeholderTextColor={palette.textMuted} value={value.relation} onChangeText={(v) => onChange({ ...value, relation: v })} />
        ) : null}
        <TextInput style={styles.relativeInput} placeholder={t('admission.relativePhone')} placeholderTextColor={palette.textMuted} keyboardType="phone-pad" value={value.phone} onChangeText={(v) => onChange({ ...value, phone: v })} />
        {onRemove ? (
          <TouchableOpacity onPress={onRemove}>
            <Text style={styles.relativeRemove}>✕ {label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  function renderDecl(label: string, value: boolean, onChange: (v: boolean) => void) {
    return (
      <View style={styles.declarationRow}>
        <Text style={styles.declarationText}>{label}</Text>
        <View style={styles.yesNo}>
          <TouchableOpacity style={[styles.yesNoChip, value && styles.yesNoChipActive]} onPress={() => onChange(true)}>
            <Text style={[styles.yesNoText, value && styles.yesNoTextActive]}>{t('admission.yes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.yesNoChip, !value && styles.yesNoChipActive]} onPress={() => onChange(false)}>
            <Text style={[styles.yesNoText, !value && styles.yesNoTextActive]}>{t('admission.no')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const occOptions = meta?.occupationStatuses ?? ['government', 'private', 'homemaker', 'unmarried'];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionPersonal')}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.name')} *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('admission.name')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.fatherName')}</Text>
            <TextInput style={styles.input} value={fatherName} onChangeText={setFatherName} placeholder={t('admission.fatherName')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.husbandName')}</Text>
            <TextInput style={styles.input} value={husbandName} onChangeText={setHusbandName} placeholder={t('admission.husbandName')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.surname')}</Text>
            <TextInput style={styles.input} value={surname} onChangeText={setSurname} placeholder={t('admission.surname')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.caste')}</Text>
            <TextInput style={styles.input} value={caste} onChangeText={setCaste} placeholder={t('admission.caste')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.religion')}</Text>
            <TextInput style={styles.input} value={religion} onChangeText={setReligion} placeholder={t('admission.religion')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.address')}</Text>
            <TextInput style={styles.textArea} value={address} onChangeText={setAddress} placeholder={t('admission.address')} placeholderTextColor={palette.textMuted} multiline />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.village')}</Text>
            <TextInput style={styles.input} value={village} onChangeText={setVillage} placeholder={t('admission.village')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.taluka')}</Text>
            <TextInput style={styles.input} value={taluka} onChangeText={setTaluka} placeholder={t('admission.taluka')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.district')}</Text>
            <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder={t('admission.district')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.admissionDate')}</Text>
            <TextInput style={styles.input} value={admissionDate} onChangeText={setAdmissionDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.textMuted} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionIdentity')}</Text>
          <Text style={styles.ruleRef}>{t('admission.currentAgeFull')}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.currentAge')}</Text>
            <TextInput style={styles.input} value={currentAge} onChangeText={setCurrentAge} keyboardType="numeric" placeholder="50–130" placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.idProofNumber')}</Text>
            <TextInput style={styles.input} value={idProofNumber} onChangeText={setIdProofNumber} placeholder={t('admission.idProofNumber')} placeholderTextColor={palette.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.aadhaar')}</Text>
            <TextInput style={styles.input} value={aadhaar} onChangeText={setAadhaar} keyboardType="number-pad" maxLength={12} placeholder="12-digit Aadhaar" placeholderTextColor={palette.textMuted} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionOccupation')}</Text>
          <View style={styles.chipRow}>
            {occOptions.map((opt) => (
              <TouchableOpacity key={opt} style={[styles.chip, occupationStatus === opt && styles.chipActive]} onPress={() => setOccupationStatus(opt)}>
                <Text style={[styles.chipText, occupationStatus === opt && styles.chipTextActive]}>{t(`admission.occupation${opt.charAt(0).toUpperCase()}${opt.slice(1)}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionRelatives')}</Text>
          <Text style={styles.ruleRef}>{t('admission.relativesHeading')}</Text>
          <Text style={styles.label}>{t('admission.husband')}</Text>
          {renderRelativeBlock(t('admission.husband'), husband, setHusband, false)}
          <Text style={styles.label}>{t('admission.wife')}</Text>
          {renderRelativeBlock(t('admission.wife'), wife, setWife, false)}
          <Text style={styles.label}>{t('admission.sonDaughter')} ({sonsDaughters.length}/4)</Text>
          {sonsDaughters.map((r, i) => renderRelativeBlock(`${t('admission.sonDaughter')} ${i + 1}`, r, (v) => setSonsDaughters((prev) => prev.map((p, j) => (j === i ? v : p))), true, () => setSonsDaughters((prev) => prev.filter((_, j) => j !== i))))}
          {sonsDaughters.length < 4 ? (
            <TouchableOpacity onPress={() => setSonsDaughters((prev) => [...prev, emptyRelative()])}>
              <Text style={styles.addRelative}>+ {t('admission.addRelative')}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.label}>{t('admission.brother')} ({brothers.length}/4)</Text>
          {brothers.map((r, i) => renderRelativeBlock(`${t('admission.brother')} ${i + 1}`, r, (v) => setBrothers((prev) => prev.map((p, j) => (j === i ? v : p))), true, () => setBrothers((prev) => prev.filter((_, j) => j !== i))))}
          {brothers.length < 4 ? (
            <TouchableOpacity onPress={() => setBrothers((prev) => [...prev, emptyRelative()])}>
              <Text style={styles.addRelative}>+ {t('admission.addRelative')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionFinancial')}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.annualIncome')}</Text>
            <TextInput style={styles.input} value={annualIncome} onChangeText={setAnnualIncome} keyboardType="numeric" placeholder="₹" placeholderTextColor={palette.textMuted} />
          </View>
          {renderDecl(t('admission.freeAdmissionRequested'), freeAdmissionRequested, setFreeAdmissionRequested)}
          {renderDecl(t('admission.paidAdmission'), paidAdmission, setPaidAdmission)}
          {renderDecl(t('admission.monthlyFeeAcceptance'), monthlyFeeAcceptance, setMonthlyFeeAcceptance)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionDeclarations')}</Text>
          {renderDecl(t('admission.declarationDailyActivities'), dailyActivitiesSelf, setDailyActivitiesSelf)}
          {renderDecl(t('admission.declarationDisease'), noInfectiousDisease, setNoInfectiousDisease)}
          {renderDecl(t('admission.declarationRules'), rulesAccepted, setRulesAccepted)}
          {renderDecl(t('admission.declarationSubstance'), noSubstanceAddiction, setNoSubstanceAddiction)}
          <Text style={styles.ruleRef}>{t('admission.govRuleReference')}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{t('admission.recreationalActivities')}</Text>
            <TextInput style={styles.textArea} value={recreationalActivities} onChangeText={setRecreationalActivities} placeholder="Games, music, yoga, ..." placeholderTextColor={palette.textMuted} multiline />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionPhotoSignature')}</Text>
          <Text style={styles.ruleRef}>{t('admission.photograph')}</Text>
          <Text style={styles.ruleRef}>{t('admission.signature')}</Text>
          <View style={styles.chipRow}>
            {['digital', 'upload', 'thumb'].map((m) => (
              <TouchableOpacity key={m} style={[styles.chip, signatureMethod === m && styles.chipActive]} onPress={() => setSignatureMethod(m)}>
                <Text style={[styles.chipText, signatureMethod === m && styles.chipTextActive]}>{t(`admission.signatureMethod.${m}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admission.sectionFinal')}</Text>
          <Text style={styles.ruleRef}>{t('admission.finalDeclaration')}</Text>
          {renderDecl(t('admission.finalDeclarationAcknowledge'), finalDeclarationAccepted, setFinalDeclarationAccepted)}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.draftButton} onPress={() => void saveDraft()} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.draftButtonText}>{t('admission.saveDraft')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={() => void submitApplication()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('admission.submit')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}