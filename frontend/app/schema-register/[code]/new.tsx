import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, errorMessage } from '../../../src/api/client';
import { tokenStorage } from '../../../src/api/storage';
import { API_BASE_URL } from '../../../src/config/env';
import { spacing, radii } from '../../../src/config/theme';
import { useTheme } from '../../../src/config/ThemeContext';
import { useI18n } from '../../../src/i18n';

interface ColumnDef {
  key: string;
  en: string;
  mr: string;
  hi: string;
  type: 'text' | 'number' | 'date' | 'signature';
  required: boolean;
  sourceFlag: boolean;
  sourceFieldNumber: number | null;
}

export default function SchemaRegisterNewScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = params.code ?? '';
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const needsDocument = useMemo(() => columns.some((c) => c.sourceFlag), [columns]);

  function pickImages() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,application/pdf';
    input.multiple = true;
    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : [];
      setPendingFiles((prev) => [...prev, ...files]);
    };
    input.click();
  }

  async function uploadDocuments(entryId: string) {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    try {
      const token = await tokenStorage.getItem('accessToken');
      for (const file of pendingFiles) {
        const fd = new FormData();
        fd.append('file', file);
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/schema-register/${code}/${entryId}/documents`, { method: 'POST', headers, body: fd });
        if (!res.ok) throw new Error('document upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    field: { marginBottom: spacing.lg },
    label: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.surface },
    textArea: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 14, color: palette.text, backgroundColor: palette.surface, minHeight: 80, textAlignVertical: 'top' },
    sourceFlag: { fontSize: 11, color: palette.warning, marginBottom: spacing.sm },
    attachBtn: { borderWidth: 1, borderColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: palette.backgroundSoft },
    attachText: { color: palette.primary, fontWeight: '600', fontSize: 13 },
    fileCount: { fontSize: 12, color: palette.textMuted, marginTop: spacing.xs },
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
        const res = await api.get(`/schema-register/${code}/meta`);
        setColumns((res.data as { data: { columns: ColumnDef[] } }).data.columns);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  function colLabel(c: ColumnDef): string {
    if (lang === 'mr') return c.mr || c.en;
    if (lang === 'hi') return c.hi || c.en;
    return c.en;
  }

  function buildBody() {
    const body: Record<string, unknown> = {
      date: date || null,
      month,
      remarks,
    };
    for (const c of columns) {
      if (c.type === 'signature') {
        body[c.key] = signatures[c.key] ?? '';
      } else {
        body[c.key] = values[c.key] ?? '';
      }
    }
    return body;
  }

  function validate(): string | null {
    if (!date) return t('sreg.required');
    for (const c of columns) {
      const v = c.type === 'signature' ? (signatures[c.key] ?? '') : (values[c.key] ?? '');
      if (c.required && !String(v).trim()) return `${colLabel(c)} — ${t('sreg.required')}`;
    }
    return null;
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/schema-register/${code}`, buildBody());
      const id = (res.data as { data: { id: string } }).data.id;
      await uploadDocuments(id);
      router.replace({ pathname: '/schema-register/[code]/list', params: { code } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveAndSubmit() {
    setBusy(true);
    setError(null);
    const vErr = validate();
    if (vErr) {
      setError(vErr);
      setBusy(false);
      return;
    }
    if (needsDocument && pendingFiles.length === 0) {
      setError(t('sreg.documentProofRequired'));
      setBusy(false);
      return;
    }
    try {
      const res = await api.post(`/schema-register/${code}`, buildBody());
      const id = (res.data as { data: { id: string } }).data.id;
      await uploadDocuments(id);
      await api.post(`/schema-register/${code}/${id}/submit`);
      router.replace({ pathname: '/schema-register/[code]/list', params: { code } });
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
          <Text style={styles.label}>{t('sreg.date')} (YYYY-MM-DD) *</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('sreg.month')}</Text>
          <TextInput style={styles.input} value={month} onChangeText={setMonth} placeholder="2026-08" placeholderTextColor={palette.textMuted} />
        </View>

        {columns.map((c) => (
          <View key={c.key} style={styles.field}>
            <Text style={styles.label}>{colLabel(c)}{c.required ? ' *' : ''}</Text>
            {c.sourceFlag ? <Text style={styles.sourceFlag}>{t('sreg.sourceVerificationRequired')} — {t('sreg.sourceFlag')}</Text> : null}
            {c.type === 'signature' ? (
              <TextInput style={styles.input} value={signatures[c.key] ?? ''} onChangeText={(v) => setSignatures((p) => ({ ...p, [c.key]: v }))} placeholder={colLabel(c)} placeholderTextColor={palette.textMuted} />
            ) : (
              <TextInput
                style={styles.input}
                value={values[c.key] ?? ''}
                onChangeText={(v) => setValues((p) => ({ ...p, [c.key]: v }))}
                placeholder={colLabel(c)}
                placeholderTextColor={palette.textMuted}
                keyboardType={c.type === 'number' ? 'number-pad' : 'default'}
              />
            )}
          </View>
        ))}

        <View style={styles.field}>
          <Text style={styles.label}>{t('sreg.remarks')}</Text>
          <TextInput style={styles.textArea} value={remarks} onChangeText={setRemarks} placeholder={t('sreg.remarks')} placeholderTextColor={palette.textMuted} multiline />
        </View>

        {needsDocument ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('sreg.documents')}</Text>
            {needsDocument ? <Text style={styles.sourceFlag}>{t('sreg.documentProofRequired')}</Text> : null}
            <TouchableOpacity style={styles.attachBtn} onPress={pickImages} activeOpacity={0.7}>
              <Text style={styles.attachText}>{t('sreg.attachDocument')}</Text>
            </TouchableOpacity>
            {pendingFiles.length > 0 ? <Text style={styles.fileCount}>{pendingFiles.length} file(s)</Text> : null}
            {uploading ? <Text style={styles.fileCount}>{t('sreg.uploadingDocuments')}</Text> : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.draftButton} onPress={() => void saveDraft()} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.draftButtonText}>{t('sreg.saveDraft')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={() => void saveAndSubmit()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('sreg.submit')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}