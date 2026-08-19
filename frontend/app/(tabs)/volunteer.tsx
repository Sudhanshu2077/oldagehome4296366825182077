import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface VolunteerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  skills: string[];
  availability: string;
}

interface Activity {
  id: string;
  activityDate: string;
  hours: number;
  activityType: string;
  description: string;
  status: string;
}

interface ActivityForm {
  activityDate: string;
  hours: string;
  activityType: string;
  description: string;
}

export default function VolunteerScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityForm>({ activityDate: '', hours: '', activityType: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([
        api.get('/portal/volunteer/profile'),
        api.get('/portal/volunteer/activities'),
      ]);
      setProfile((p.data as { data: VolunteerProfile }).data);
      setActivities((a.data as { data: Activity[] }).data);
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

  async function submitActivity() {
    setSubmitting(true);
    setSuccess(null);
    try {
      await api.post('/portal/volunteer/log-activity', {
        activityDate: form.activityDate,
        hours: Number(form.hours),
        activityType: form.activityType,
        description: form.description,
      });
      setSuccess(t('volunteer.activityLogged'));
      setForm({ activityDate: '', hours: '', activityType: '', description: '' });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
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
      <Text style={styles.heading}>{t('volunteer.title')}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {profile ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{profile.fullName}</Text>
          <Text style={styles.cardBody}>{t('common.phone')}:{profile.phone}</Text>
          <Text style={styles.cardBody}>{t('common.status')}:{profile.status}</Text>
          <Text style={styles.cardBody}>{t('volunteer.availability')}: {profile.availability ?? '—'}</Text>
          <Text style={styles.cardBody}>{t('volunteer.skills')}: {profile.skills?.join(', ') || '—'}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('volunteer.logActivity')}</Text>
        <TextInput style={styles.input} placeholder={t('volunteer.activityDate')} value={form.activityDate} onChangeText={(v) => setForm((p) => ({ ...p, activityDate: v }))} />
        <TextInput style={styles.input} placeholder={t('volunteer.hours')} keyboardType="numeric" value={form.hours} onChangeText={(v) => setForm((p) => ({ ...p, hours: v }))} />
        <TextInput style={styles.input} placeholder={t('volunteer.activityType')} value={form.activityType} onChangeText={(v) => setForm((p) => ({ ...p, activityType: v }))} />
        <TextInput style={styles.input} placeholder={t('common.description')} multiline numberOfLines={3} value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} />
        <TouchableOpacity style={styles.button} onPress={() => void submitActivity()} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? t('common.submitting') : t('volunteer.submitActivity')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('volunteer.yourActivities')}</Text>
        <FlatList
          data={activities}
          keyExtractor={(a) => a.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.empty}>{t('volunteer.noActivities')}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.activityType}</Text>
              <Text style={styles.cardBody}>{t('common.date')}:{item.activityDate}</Text>
              <Text style={styles.cardBody}>{t('volunteer.hoursLabel')}: {item.hours}</Text>
              <Text style={styles.cardBody}>{item.description}</Text>
              <Text style={styles.cardBody}>{t('common.status')}:{item.status}</Text>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}
