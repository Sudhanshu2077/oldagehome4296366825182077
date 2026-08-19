import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface Resident {
  id: string;
  name: string;
  room: string;
  status: string;
}

interface Donation {
  id: string;
  amount: number;
  purpose: string;
  date: string;
}

interface FormState {
  residentId: string;
  visitorName: string;
  visitorPhone: string;
  relation: string;
  proposedDate: string;
  requestedDate: string;
}

const initialForm: FormState = {
  residentId: '',
  visitorName: '',
  visitorPhone: '',
  relation: '',
  proposedDate: '',
  requestedDate: '',
};

export default function FamilyScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState<'visitor' | 'video' | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, don] = await Promise.all([
        api.get('/portal/family/residents'),
        api.get('/portal/family/donations'),
      ]);
      setResidents((res.data as { data: Resident[] }).data);
      setDonations((don.data as { data: Donation[] }).data);
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

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitVisitor() {
    setSubmitting('visitor');
    setSuccess(null);
    try {
      await api.post('/portal/family/visitor-booking', {
        residentId: form.residentId,
        visitorName: form.visitorName,
        visitorPhone: form.visitorPhone,
        relation: form.relation,
        proposedDate: form.proposedDate,
      });
      setSuccess(t('family.visitorBooked'));
      setForm((prev) => ({
        ...prev,
        visitorName: '',
        visitorPhone: '',
        relation: '',
        proposedDate: '',
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(null);
    }
  }

  async function submitVideo() {
    setSubmitting('video');
    setSuccess(null);
    try {
      await api.post('/portal/family/video-call-booking', {
        residentId: form.residentId,
        requestedDate: form.requestedDate,
      });
      setSuccess(t('family.videoBooked'));
      setForm((prev) => ({ ...prev, requestedDate: '' }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(null);
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    heading: { fontSize: 20, fontWeight: '700', color: palette.primaryDark },
    email: { fontSize: 13, color: palette.textMuted, marginBottom: spacing.lg },
    error: { color: palette.error, marginBottom: spacing.md },
    success: { color: palette.success, marginBottom: spacing.md },
    section: { marginBottom: spacing.xl },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: palette.text, marginBottom: spacing.sm },
    empty: { color: palette.textMuted, fontSize: 13 },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
    cardTitle: { fontSize: 14, fontWeight: '600', color: palette.primaryDark },
    cardBody: { fontSize: 12, color: palette.textMuted, marginTop: spacing.xs },
    input: { backgroundColor: palette.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.border, padding: spacing.md, marginBottom: spacing.sm, color: palette.text },
    button: { backgroundColor: palette.primary, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
    buttonText: { color: palette.textInverse, fontWeight: '600' },
  }), [palette]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.heading}>{t('family.title')}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('family.linkedResidents')}</Text>
        {residents.length === 0 ? (
          <Text style={styles.empty}>{t('family.noResidents')}</Text>
        ) : (
          residents.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>{r.name}</Text>
              <Text style={styles.cardBody}>{t('family.room')}:{r.room ?? '—'}</Text>
              <Text style={styles.cardBody}>{t('common.status')}:{r.status}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('family.bookVisit')}</Text>
        <TextInput style={styles.input} placeholder={t('family.residentId')} value={form.residentId} onChangeText={(v) => update('residentId', v)} />
        <TextInput style={styles.input} placeholder={t('family.visitorName')} value={form.visitorName} onChangeText={(v) => update('visitorName', v)} />
        <TextInput style={styles.input} placeholder={t('family.visitorPhone')} value={form.visitorPhone} onChangeText={(v) => update('visitorPhone', v)} />
        <TextInput style={styles.input} placeholder={t('family.relation')} value={form.relation} onChangeText={(v) => update('relation', v)} />
        <TextInput style={styles.input} placeholder={t('family.proposedDate')} value={form.proposedDate} onChangeText={(v) => update('proposedDate', v)} />
        <TouchableOpacity style={styles.button} onPress={() => void submitVisitor()} disabled={submitting === 'visitor'}>
          <Text style={styles.buttonText}>{submitting === 'visitor' ? t('common.submitting') : t('family.submitVisitor')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('family.bookVideoCall')}</Text>
        <TextInput style={styles.input} placeholder={t('family.residentId')} value={form.residentId} onChangeText={(v) => update('residentId', v)} />
        <TextInput style={styles.input} placeholder={t('family.requestedDate')} value={form.requestedDate} onChangeText={(v) => update('requestedDate', v)} />
        <TouchableOpacity style={styles.button} onPress={() => void submitVideo()} disabled={submitting === 'video'}>
          <Text style={styles.buttonText}>{submitting === 'video' ? t('common.submitting') : t('family.submitVideo')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('family.yourDonations')}</Text>
        <FlatList
          data={donations}
          keyExtractor={(d) => d.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.empty}>{t('family.noDonations')}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>₹{item.amount}</Text>
              <Text style={styles.cardBody}>{item.purpose}</Text>
              <Text style={styles.cardBody}>{item.date}</Text>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}
