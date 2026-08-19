import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface ResidentOption {
  id: string;
  residentNumber: string;
  fullName: string;
  gender: string;
  photoUrl: string;
}

const SIGNATURE_TYPES = ['digital', 'uploaded', 'thumb', 'none'] as const;

export default function YwaNewScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [defaultYear, setDefaultYear] = useState('');
  const [registerYear, setRegisterYear] = useState('');
  const [residentId, setResidentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [signatureType, setSignatureType] = useState<string>('none');
  const [noSignatureReason, setNoSignatureReason] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [officerDesignation, setOfficerDesignation] = useState('');
  const [officerSignature, setOfficerSignature] = useState('');
  const [remarks, setRemarks] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    field: { marginBottom: spacing.lg },
    label: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.surface },
    textArea: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.surface, minHeight: 80, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
    chip: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 5 },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 12, color: palette.text },
    chipTextActive: { color: palette.textInverse },
    warning: { fontSize: 12, color: palette.warning, marginBottom: spacing.md },
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
        const res = await api.get('/yearwise-admission/meta');
        const data = (res.data as { data: { residents: ResidentOption[]; years: string[]; defaultYear: string } }).data;
        setResidents(data.residents);
        setYears(data.years);
        setDefaultYear(data.defaultYear);
        setRegisterYear(data.defaultYear);
      } catch {
        setResidents([]);
      }
    })();
  }, []);

  function pickResident(r: ResidentOption) {
    setResidentId(r.id);
    setFullName(r.fullName);
  }

  async function save(andSubmit: boolean) {
    setBusy(true);
    setError(null);
    setDuplicateWarning(null);
    try {
      if (!fullName.trim() || !admissionDate.trim()) {
        setError(t('ywa.required'));
        setBusy(false);
        return;
      }
      const body = {
        registerYear,
        residentId: residentId || null,
        fullName,
        birthDate: birthDate || null,
        birthYear: birthYear ? Number(birthYear) : null,
        aadhaar: aadhaar.replace(/\D/g, ''),
        signatureType,
        noSignatureReason: signatureType === 'none' ? noSignatureReason : '',
        admissionDate,
        officerName,
        officerDesignation,
        officerSignature,
        remarks,
      };
      const res = await api.post('/yearwise-admission', body);
      const data = res.data as { data: { id: string }; warning?: { duplicateWarning?: string } };
      const id = data.data.id;
      if (data.warning?.duplicateWarning) setDuplicateWarning(data.warning.duplicateWarning);
      if (andSubmit) {
        await api.post(`/yearwise-admission/${id}/submit`);
      }
      router.replace('/yearwise-admission/list');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {duplicateWarning ? <Text style={styles.warning}>{t('ywa.duplicateWarning')}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.year')} *</Text>
          <View style={styles.chipRow}>
            {years.map((y) => (
              <TouchableOpacity key={y} style={[styles.chip, registerYear === y && styles.chipActive]} onPress={() => setRegisterYear(y)}>
                <Text style={[styles.chipText, registerYear === y && styles.chipTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.residentLink')}</Text>
          {residents.length === 0 ? <Text style={styles.label}>{t('ywa.listEmpty')}</Text> : null}
          <View style={styles.chipRow}>
            {residents.map((r) => (
              <TouchableOpacity key={r.id} style={[styles.chip, residentId === r.id && styles.chipActive]} onPress={() => pickResident(r)}>
                <Text style={[styles.chipText, residentId === r.id && styles.chipTextActive]}>{r.fullName}{r.residentNumber ? ` (${r.residentNumber})` : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.fullName')} *</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder={t('ywa.fullName')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.dob')} (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="1950-06-12" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.birthYear')}</Text>
          <TextInput style={styles.input} value={birthYear} onChangeText={setBirthYear} placeholder="1950" placeholderTextColor={palette.textMuted} keyboardType="number-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.aadhaar')} (12 digits)</Text>
          <TextInput style={styles.input} value={aadhaar} onChangeText={setAadhaar} placeholder="XXXXXXXXXXXX" placeholderTextColor={palette.textMuted} keyboardType="number-pad" maxLength={12} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.signature')}</Text>
          <View style={styles.chipRow}>
            {SIGNATURE_TYPES.map((st) => (
              <TouchableOpacity key={st} style={[styles.chip, signatureType === st && styles.chipActive]} onPress={() => setSignatureType(st)}>
                <Text style={[styles.chipText, signatureType === st && styles.chipTextActive]}>{t(`ywa.signatureType${st[0]!.toUpperCase()}${st.slice(1)}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {signatureType === 'none' ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('ywa.noSignatureReason')}</Text>
            <TextInput style={styles.textArea} value={noSignatureReason} onChangeText={setNoSignatureReason} placeholder={t('ywa.noSignatureReason')} placeholderTextColor={palette.textMuted} multiline />
          </View>
        ) : null}
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.admissionDate')} * (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={admissionDate} onChangeText={setAdmissionDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.officerName')}</Text>
          <TextInput style={styles.input} value={officerName} onChangeText={setOfficerName} placeholder={t('ywa.officerName')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.officerDesignation')}</Text>
          <TextInput style={styles.input} value={officerDesignation} onChangeText={setOfficerDesignation} placeholder={t('ywa.officerDesignation')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.officerSignature')}</Text>
          <TextInput style={styles.input} value={officerSignature} onChangeText={setOfficerSignature} placeholder={t('ywa.officerSignature')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('ywa.remarks')}</Text>
          <TextInput style={styles.textArea} value={remarks} onChangeText={setRemarks} placeholder={t('ywa.remarks')} placeholderTextColor={palette.textMuted} multiline />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.draftButton} onPress={() => void save(false)} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.draftButtonText}>{t('ywa.saveDraft')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={() => void save(true)} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('ywa.submit')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}