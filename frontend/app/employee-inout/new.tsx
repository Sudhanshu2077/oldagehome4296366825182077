import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface EmployeeOption {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string;
}

export default function EmployeeInOutNewScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [outDate, setOutDate] = useState('');
  const [outTime, setOutTime] = useState('');
  const [place, setPlace] = useState('');
  const [reason, setReason] = useState('');
  const [outSignature, setOutSignature] = useState('');
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
        const res = await api.get('/employee-inout/meta');
        setEmployees((res.data as { data: { employees: EmployeeOption[] } }).data.employees);
      } catch {
        setEmployees([]);
      }
    })();
  }, []);

  function pickEmployee(emp: EmployeeOption) {
    setEmployeeId(emp.id);
    setEmployeeName(emp.fullName);
    setEmployeeCode(emp.employeeCode);
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/employee-inout', { employeeId, employeeName, employeeCode, outDate: outDate || null, outTime, place, reason, outSignature });
      router.replace('/employee-inout/list');
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
      if (!employeeId || !outDate || !outTime) {
        setError(t('inout.required'));
        return;
      }
      if (!outSignature.trim()) {
        setError(t('inout.outSignature'));
        return;
      }
      const res = await api.post('/employee-inout', { employeeId, employeeName, employeeCode, outDate, outTime, place, reason, outSignature });
      const id = (res.data as { data: { id: string } }).data.id;
      await api.post(`/employee-inout/${id}/submit`);
      router.replace('/employee-inout/list');
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

        <View style={styles.field}>
          <Text style={styles.label}>{t('inout.selectEmployee')}</Text>
          {employees.length === 0 ? <Text style={styles.label}>{t('inout.listEmpty')}</Text> : null}
          <View style={styles.chipRow}>
            {employees.map((emp) => (
              <TouchableOpacity key={emp.id} style={[styles.chip, employeeId === emp.id && styles.chipActive]} onPress={() => pickEmployee(emp)}>
                <Text style={[styles.chipText, employeeId === emp.id && styles.chipTextActive]}>{emp.fullName}{emp.employeeCode ? ` (${emp.employeeCode})` : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('inout.date')} (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={outDate} onChangeText={setOutDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inout.outTime')} (HH:MM)</Text>
          <TextInput style={styles.input} value={outTime} onChangeText={setOutTime} placeholder="10:30" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inout.place')}</Text>
          <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder={t('inout.place')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inout.reason')}</Text>
          <TextInput style={styles.textArea} value={reason} onChangeText={setReason} placeholder={t('inout.reason')} placeholderTextColor={palette.textMuted} multiline />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inout.outSignature')}</Text>
          <TextInput style={styles.input} value={outSignature} onChangeText={setOutSignature} placeholder={t('inout.outSignature')} placeholderTextColor={palette.textMuted} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.draftButton} onPress={() => void saveDraft()} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.draftButtonText}>{t('inout.saveDraft')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={() => void saveAndSubmit()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('inout.submitOut')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}