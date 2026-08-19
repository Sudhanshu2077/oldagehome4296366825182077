import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface Donation {
  id: string;
  amount: number;
  purpose: string;
  date: string;
}

interface PledgeForm {
  amount: string;
  frequency: string;
  notes: string;
}

export default function DonorScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [history, setHistory] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [residentForm, setResidentForm] = useState<PledgeForm>({ amount: '', frequency: '', notes: '' });
  const [mealsForm, setMealsForm] = useState<PledgeForm>({ amount: '', frequency: '', notes: '' });
  const [submitting, setSubmitting] = useState<'resident' | 'meals' | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/portal/donor/history');
      setHistory((res.data as { data: Donation[] }).data);
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

  async function submitSponsorResident() {
    setSubmitting('resident');
    setSuccess(null);
    try {
      await api.post('/portal/donor/sponsor-resident', {
        amount: Number(residentForm.amount),
        frequency: residentForm.frequency,
        notes: residentForm.notes,
      });
      setSuccess(t('donor.residentPledge'));
      setResidentForm({ amount: '', frequency: '', notes: '' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(null);
    }
  }

  async function submitSponsorMeals() {
    setSubmitting('meals');
    setSuccess(null);
    try {
      await api.post('/portal/donor/sponsor-meals', {
        amount: Number(mealsForm.amount),
        frequency: mealsForm.frequency,
        notes: mealsForm.notes,
      });
      setSuccess(t('donor.mealsPledge'));
      setMealsForm({ amount: '', frequency: '', notes: '' });
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
      <Text style={styles.heading}>{t('donor.title')}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('donor.history')}</Text>
        <FlatList
          data={history}
          keyExtractor={(d) => d.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.empty}>{t('donor.noDonations')}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>₹{item.amount}</Text>
              <Text style={styles.cardBody}>{item.purpose}</Text>
              <Text style={styles.cardBody}>{item.date}</Text>
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('donor.sponsorResident')}</Text>
        <TextInput style={styles.input} placeholder={t('donor.amountINR')} keyboardType="numeric" value={residentForm.amount} onChangeText={(v) => setResidentForm((p) => ({ ...p, amount: v }))} />
        <TextInput style={styles.input} placeholder={t('donor.frequency')} value={residentForm.frequency} onChangeText={(v) => setResidentForm((p) => ({ ...p, frequency: v }))} />
        <TextInput style={styles.input} placeholder={t('donor.notes')} value={residentForm.notes} onChangeText={(v) => setResidentForm((p) => ({ ...p, notes: v }))} />
        <TouchableOpacity style={styles.button} onPress={() => void submitSponsorResident()} disabled={submitting === 'resident'}>
          <Text style={styles.buttonText}>{submitting === 'resident' ? t('common.saving') : t('donor.pledgeResident')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('donor.sponsorMeals')}</Text>
        <TextInput style={styles.input} placeholder={t('donor.amountINR')} keyboardType="numeric" value={mealsForm.amount} onChangeText={(v) => setMealsForm((p) => ({ ...p, amount: v }))} />
        <TextInput style={styles.input} placeholder={t('donor.frequency')} value={mealsForm.frequency} onChangeText={(v) => setMealsForm((p) => ({ ...p, frequency: v }))} />
        <TextInput style={styles.input} placeholder={t('donor.notes')} value={mealsForm.notes} onChangeText={(v) => setMealsForm((p) => ({ ...p, notes: v }))} />
        <TouchableOpacity style={styles.button} onPress={() => void submitSponsorMeals()} disabled={submitting === 'meals'}>
          <Text style={styles.buttonText}>{submitting === 'meals' ? t('common.saving') : t('donor.pledgeMeals')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
