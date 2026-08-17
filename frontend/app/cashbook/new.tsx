import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CashbookNewScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [entryDate, setEntryDate] = useState('');
  const [month, setMonth] = useState('');
  const [vrNo, setVrNo] = useState('');
  const [particulars, setParticulars] = useState('');
  const [lfNo, setLfNo] = useState('');
  const [cashRupees, setCashRupees] = useState('');
  const [cashPaise, setCashPaise] = useState('');
  const [bankRupees, setBankRupees] = useState('');
  const [bankPaise, setBankPaise] = useState('');
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
    moneyRow: { flexDirection: 'row', gap: spacing.md },
    moneyField: { flex: 1 },
    note: { fontSize: 11, color: palette.textMuted, marginBottom: spacing.lg },
    error: { color: palette.error, marginBottom: spacing.md },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    draftButton: { flex: 1, borderWidth: 1, borderColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    draftButtonText: { color: palette.primary, fontWeight: '600', fontSize: 14 },
    submitButton: { flex: 1, backgroundColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    submitText: { color: palette.textInverse, fontWeight: '700', fontSize: 14 },
  }), [palette]);

  function buildBody() {
    return {
      entryDate: entryDate || null,
      month,
      vrNo,
      particulars,
      lfNo,
      cashRupees: cashRupees ? Number(cashRupees) : 0,
      cashPaise: cashPaise ? Number(cashPaise) : 0,
      bankRupees: bankRupees ? Number(bankRupees) : 0,
      bankPaise: bankPaise ? Number(bankPaise) : 0,
      remarks,
    };
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/cashbook', buildBody());
      router.replace('/cashbook/list');
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
      if (!particulars.trim() || !entryDate) {
        setError(t('cb.required'));
        return;
      }
      const res = await api.post('/cashbook', buildBody());
      const id = (res.data as { data: { id: string } }).data.id;
      await api.post(`/cashbook/${id}/submit`);
      router.replace('/cashbook/list');
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
        <Text style={styles.note}>{t('cb.sourceFlag')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('cb.monthDate')} * (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={entryDate} onChangeText={setEntryDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('cb.monthDate')} — month</Text>
          <TextInput style={styles.input} value={month} onChangeText={setMonth} placeholder={MONTHS[new Date().getMonth() + 1] ?? ''} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('cb.vrNo')}</Text>
          <TextInput style={styles.input} value={vrNo} onChangeText={setVrNo} placeholder={t('cb.vrNo')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('cb.particulars')} *</Text>
          <TextInput style={styles.textArea} value={particulars} onChangeText={setParticulars} placeholder={t('cb.particulars')} placeholderTextColor={palette.textMuted} multiline />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('cb.lfNo')}</Text>
          <TextInput style={styles.input} value={lfNo} onChangeText={setLfNo} placeholder={t('cb.lfNo')} placeholderTextColor={palette.textMuted} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('cb.cash')}</Text>
          <View style={styles.moneyRow}>
            <View style={styles.moneyField}>
              <Text style={styles.label}>Rs.</Text>
              <TextInput style={styles.input} value={cashRupees} onChangeText={setCashRupees} keyboardType="number-pad" placeholder="0" placeholderTextColor={palette.textMuted} />
            </View>
            <View style={styles.moneyField}>
              <Text style={styles.label}>Ps.</Text>
              <TextInput style={styles.input} value={cashPaise} onChangeText={setCashPaise} keyboardType="number-pad" placeholder="00" placeholderTextColor={palette.textMuted} />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('cb.bank')}</Text>
          <View style={styles.moneyRow}>
            <View style={styles.moneyField}>
              <Text style={styles.label}>Rs.</Text>
              <TextInput style={styles.input} value={bankRupees} onChangeText={setBankRupees} keyboardType="number-pad" placeholder="0" placeholderTextColor={palette.textMuted} />
            </View>
            <View style={styles.moneyField}>
              <Text style={styles.label}>Ps.</Text>
              <TextInput style={styles.input} value={bankPaise} onChangeText={setBankPaise} keyboardType="number-pad" placeholder="00" placeholderTextColor={palette.textMuted} />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('cb.remarks')}</Text>
          <TextInput style={styles.textArea} value={remarks} onChangeText={setRemarks} placeholder={t('cb.remarks')} placeholderTextColor={palette.textMuted} multiline />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.draftButton} onPress={() => void saveDraft()} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.draftButtonText}>{t('cb.saveDraft')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={() => void saveAndSubmit()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('cb.submit')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}