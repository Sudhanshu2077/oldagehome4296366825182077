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

interface ItemField {
  key: string;
  en: string;
  mr: string;
  hi: string;
}

export default function DistributionNewScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [itemFields, setItemFields] = useState<ItemField[]>([]);
  const [personId, setPersonId] = useState('');
  const [personName, setPersonName] = useState('');
  const [className, setClassName] = useState('');
  const [date, setDate] = useState('');
  const [distributionDate, setDistributionDate] = useState('');
  const [superintendentSignature, setSuperintendentSignature] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<Record<string, string>>({});
  const [sourceColumns, setSourceColumns] = useState<Record<string, string>>({});
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
    note: { fontSize: 11, color: palette.warning, marginBottom: spacing.md },
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
        const res = await api.get('/distribution/meta');
        const meta = (res.data as { data: { residents: ResidentOption[]; itemLabels: ItemField[] } }).data;
        setResidents(meta.residents);
        setItemFields(meta.itemLabels);
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
    const body: Record<string, string | null> = {
      date: date || null,
      distributionDate: distributionDate || null,
      personId,
      personName,
      className,
      superintendentSignature,
      remarks,
    };
    for (const f of itemFields) body[f.key] = items[f.key] ?? '';
    body.sourceColumn10 = sourceColumns.sourceColumn10 ?? '';
    body.sourceColumn11 = sourceColumns.sourceColumn11 ?? '';
    return body;
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/distribution', buildBody());
      router.replace('/distribution/list');
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
      if (!date || !personName.trim()) {
        setError(t('dist.required'));
        return;
      }
      const res = await api.post('/distribution', buildBody());
      const id = (res.data as { data: { id: string } }).data.id;
      await api.post(`/distribution/${id}/submit`);
      router.replace('/distribution/list');
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
        <Text style={styles.note}>{t('dist.sourceFlag')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('dist.personName')}</Text>
          {residents.length === 0 ? <Text style={styles.label}>{t('dist.listEmpty')}</Text> : null}
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
            <Text style={styles.label}>{t('dist.personName')} (free text)</Text>
            <TextInput style={styles.input} value={personName} onChangeText={setPersonName} placeholder={t('dist.personName')} placeholderTextColor={palette.textMuted} />
          </View>
        ) : null}
        <View style={styles.field}>
          <Text style={styles.label}>{t('dist.className')}</Text>
          <TextInput style={styles.input} value={className} onChangeText={setClassName} placeholder={t('dist.className')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('dist.date')} (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
        </View>

        {itemFields.map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{t(`dist.${f.key}`)}</Text>
            <TextInput style={styles.input} value={items[f.key] ?? ''} onChangeText={(v) => setItems((p) => ({ ...p, [f.key]: v }))} placeholder="0" placeholderTextColor={palette.textMuted} keyboardType="number-pad" />
          </View>
        ))}

        <View style={styles.field}>
          <Text style={styles.label}>{t('dist.sourceColumn10')}</Text>
          <TextInput style={styles.input} value={sourceColumns.sourceColumn10 ?? ''} onChangeText={(v) => setSourceColumns((p) => ({ ...p, sourceColumn10: v }))} placeholder="0" placeholderTextColor={palette.textMuted} keyboardType="number-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('dist.sourceColumn11')}</Text>
          <TextInput style={styles.input} value={sourceColumns.sourceColumn11 ?? ''} onChangeText={(v) => setSourceColumns((p) => ({ ...p, sourceColumn11: v }))} placeholder="0" placeholderTextColor={palette.textMuted} keyboardType="number-pad" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('dist.distributionDate')} (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={distributionDate} onChangeText={setDistributionDate} placeholder="2026-08-17" placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('dist.superintendentSignature')}</Text>
          <TextInput style={styles.input} value={superintendentSignature} onChangeText={setSuperintendentSignature} placeholder={t('dist.superintendentSignature')} placeholderTextColor={palette.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('dist.remarks')}</Text>
          <TextInput style={styles.textArea} value={remarks} onChangeText={setRemarks} placeholder={t('dist.remarks')} placeholderTextColor={palette.textMuted} multiline />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.draftButton} onPress={() => void saveDraft()} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.draftButtonText}>{t('dist.saveDraft')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={() => void saveAndSubmit()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('dist.submit')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}