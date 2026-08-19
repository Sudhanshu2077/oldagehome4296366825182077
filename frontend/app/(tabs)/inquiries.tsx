import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView, Platform } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { useSamples } from '../../src/sample/SampleContext';
import { SampleBadge, SampleBanner } from '../../src/components/ui';

interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  __sample?: boolean;
}

const STATUSES = ['open', 'in-progress', 'resolved', 'closed'];

export default function InquiriesScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { withSamples, samplesFor } = useSamples();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const canCreate = user?.tier === 'institution';

  const STATUS_COLORS: Record<string, string> = {
    open: palette.warning,
    'in-progress': palette.info,
    resolved: palette.success,
    closed: palette.textMuted,
  };

  const FORM_FIELDS = [
    { key: 'name', label: t('common.name'), required: true },
    { key: 'phone', label: t('common.phone'), required: false },
    { key: 'email', label: t('common.email'), required: false },
    { key: 'subject', label: t('common.subject'), required: false },
    { key: 'message', label: t('common.message'), required: true },
  ];

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    screenTitle: { fontSize: 17, fontWeight: '700', color: palette.primaryDark },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    error: { color: palette.error, padding: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 15, fontWeight: '600', color: palette.primaryDark },
    status: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    subject: { fontSize: 13, fontWeight: '600', color: palette.text, marginTop: spacing.xs },
    message: { fontSize: 13, color: palette.text, marginTop: spacing.xs },
    advance: { fontSize: 12, color: palette.primary, marginTop: spacing.md, fontWeight: '600' },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    fieldLabel: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14, color: palette.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/inquiries');
      setItems((res.data as { data: Inquiry[] }).data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm({});
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/inquiries', form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function advance(item: Inquiry) {
    const idx = STATUSES.indexOf(item.status);
    const next = STATUSES[Math.min(idx + 1, STATUSES.length - 1)];
    try {
      await api.patch(`/inquiries/${item.id}/status`, { status: next });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  const shown = withSamples(items, 'inquiries', 3);
  const showBanner = items.length === 0 && samplesFor('inquiries', 1).length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{t('inquiries.title')}</Text>
        {canCreate ? (
          <TouchableOpacity style={styles.addButton} onPress={openCreate}>
            <Text style={styles.addButtonText}>{t('inquiries.new')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {showBanner ? <SampleBanner /> : null}
      <FlatList
        contentContainerStyle={{ padding: spacing.md }}
        data={shown}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={styles.empty}>{t('inquiries.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.__sample ? <SampleBadge /> : null}
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.status, { color: STATUS_COLORS[item.status] ?? palette.textMuted }]}>{item.status}</Text>
            </View>
            {item.subject ? <Text style={styles.subject}>{item.subject}</Text> : null}
            <Text style={styles.message}>{item.message}</Text>
            <TouchableOpacity onPress={() => void advance(item)}>
              <Text style={styles.advance}>{t('common.advance')} →</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('inquiries.title')}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {FORM_FIELDS.map((f) => (
                <View key={f.key} style={{ marginBottom: spacing.md }}>
                  <Text style={styles.fieldLabel}>{f.label}{f.required ? ' *' : ''}</Text>
                  <TextInput
                    style={[styles.input, f.key === 'message' && styles.textArea]}
                    value={form[f.key] ?? ''}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                    placeholder={f.label}
                    placeholderTextColor={palette.textMuted}
                    multiline={f.key === 'message'}
                    keyboardType={f.key === 'phone' ? 'phone-pad' : f.key === 'email' ? 'email-address' : 'default'}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void save()} disabled={saving}>
                {saving ? <ActivityIndicator color={palette.textInverse} /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}