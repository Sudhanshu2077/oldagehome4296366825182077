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
}

export default function MedicalNewScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [personId, setPersonId] = useState('');
  const [personName, setPersonName] = useState('');
  const [illnessDate, setIllnessDate] = useState('');
  const [diseaseNature, setDiseaseNature] = useState('');
  const [medicineParticulars, setMedicineParticulars] = useState('');
  const [medicineAllowances, setMedicineAllowances] = useState('');
  const [medicalOfficerName, setMedicalOfficerName] = useState('');
  const [medicalOfficerSignature, setMedicalOfficerSignature] = useState('');
  const [remarks, setRemarks] = useState('');
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
    sourceFlag: { fontSize: 11, color: palette.warning, marginBottom: spacing.sm },
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
        const res = await api.get('/medical/meta');
        setResidents((res.data as { data: { residents: ResidentOption[] } }).data.residents);
      } catch {
        setResidents([]);
      }
    })();
  }, []);

  function pickResident(r: ResidentOption) {
    setPersonId(r.id);
    setPersonName(r.fullName);
  }

  function buildBody() {
    return {
      personId: personId || null,
      personName,
      illnessDate: illnessDate || null,
      diseaseNature,
      medicineParticulars,
      medicineAllowances,
      medicalOfficerName,
      medicalOfficerSignature,
      remarks,
    };
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/medical', buildBody());
      router.replace('/medical/list');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveAndSubmit() {
    setBusy(true);
    setError(null);
    try {
      if (!personName.trim() || !illnessDate) {
        setError(t('med.required'));
        return;
      }
      const res = await api.post('/medical', buildBody());
      const id = (res.data as { data: { id: string } }).data.id;
      await api.post(`/medical/${id}/submit`);
      router.replace('/medical/list');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.sourceFlag}>{t('med.sourceFlag')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('med.studentName')} *</Text>
          {residents.length === 0 ? <Text style={styles.label}>{t('med.listEmpty')}</Text> : null}
          <View style={styles.chipRow}>
            {residents.map((r) => (
              <TouchableOpacity key={r.id} style={[styles.chip, personId === r.id && styles.chipActive]} onPress={() => pickResident(r)}>
                <Text style={[styles.chipText, personId === r.id && styles.chipTextActive]}>{r.fullName}{r.residentNumber ? ` (${r.residentNumber})` : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {!personId ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('med.studentName')} (free text)</Text>
            <TextInput style={styles.input} value={personName} onChangeText={setPersonName} placeholder={t('med.studentName')} placeholderTextColor={palette.textMuted} />
          </View>
        ) : null}
        <View style={styles.field}>
          <Text style={styles.label}>{t('med.illnessDate')} * (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={illnessDate} onChangeText={setIllnessDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('med.diseaseNature')}</Text>
          <TextInput style={styles.textArea} value={diseaseNature} onChangeText={setDiseaseNature} placeholder={t('med.diseaseNature')} placeholderTextColor={palette.textMuted} multiline />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('med.medicineParticulars')}</Text>
          <TextInput style={styles.textArea} value={medicineParticulars} onChangeText={setMedicineParticulars} placeholder={t('med.medicineParticulars')} placeholderTextColor={palette.textMuted} multiline />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('med.medicineAllowances')} *</Text>
          <Text style={styles.sourceFlag}>{t('med.sourceFlag')}</Text>
          <TextInput style={styles.textArea} value={medicineAllowances} onChangeText={setMedicineAllowances} placeholder={t('med.medicineAllowances')} placeholderTextColor={palette.textMuted} multiline />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('med.medicalOfficer')}</Text>
          <TextInput style={styles.input} value={medicalOfficerName} onChangeText={setMedicalOfficerName} placeholder={t('med.medicalOfficer')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('med.medicalOfficer')} — signature</Text>
          <TextInput style={styles.input} value={medicalOfficerSignature} onChangeText={setMedicalOfficerSignature} placeholder={t('med.medicalOfficer')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('med.remarks')}</Text>
          <TextInput style={styles.textArea} value={remarks} onChangeText={setRemarks} placeholder={t('med.remarks')} placeholderTextColor={palette.textMuted} multiline />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.draftButton} onPress={() => void saveDraft()} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.draftButtonText}>{t('med.saveDraft')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={() => void saveAndSubmit()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('med.submit')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}