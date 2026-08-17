import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

export default function InwardNewScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [fileNo, setFileNo] = useState('');
  const [senderName, setSenderName] = useState('');
  const [letterNo, setLetterNo] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [subject, setSubject] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    field: { marginBottom: spacing.lg },
    label: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.surface },
    textArea: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.surface, minHeight: 90, textAlignVertical: 'top' },
    error: { color: palette.error, marginBottom: spacing.md },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    draftButton: { flex: 1, borderWidth: 1, borderColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    draftButtonText: { color: palette.primary, fontWeight: '600', fontSize: 14 },
    submitButton: { flex: 1, backgroundColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    submitText: { color: palette.textInverse, fontWeight: '700', fontSize: 14 },
  }), [palette]);

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/inward', { fileNo, senderName, letterNo, receivedDate: receivedDate || null, subject, issuedTo });
      router.replace('/inward/list');
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
      if (!receivedDate || !senderName.trim()) {
        setError(t('inward.required'));
        return;
      }
      const res = await api.post('/inward', { fileNo, senderName, letterNo, receivedDate, subject, issuedTo });
      const id = (res.data as { data: { id: string } }).data.id;
      await api.post(`/inward/${id}/submit`);
      router.replace('/inward/list');
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
          <Text style={styles.label}>{t('inward.fileNo')}</Text>
          <TextInput style={styles.input} value={fileNo} onChangeText={setFileNo} placeholder={t('inward.fileNo')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inward.fromWhomReceived')}</Text>
          <TextInput style={styles.input} value={senderName} onChangeText={setSenderName} placeholder={t('inward.fromWhomReceived')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inward.letterNo')}</Text>
          <TextInput style={styles.input} value={letterNo} onChangeText={setLetterNo} placeholder={t('inward.letterNo')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inward.receivedDate')} (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={receivedDate} onChangeText={setReceivedDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inward.subject')}</Text>
          <TextInput style={styles.textArea} value={subject} onChangeText={setSubject} placeholder={t('inward.subject')} placeholderTextColor={palette.textMuted} multiline />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('inward.toWhomIssued')}</Text>
          <TextInput style={styles.input} value={issuedTo} onChangeText={setIssuedTo} placeholder={t('inward.toWhomIssued')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.draftButton} onPress={() => void saveDraft()} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.draftButtonText}>{t('inward.saveDraft')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={() => void saveAndSubmit()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('inward.submit')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}