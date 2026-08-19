import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { api, errorMessage } from '../src/api/client';
import { colors, spacing, radii } from '../src/config/theme';
import { useI18n } from '../src/i18n';

interface Institution {
  id: string;
  name: string;
  nameMr: string;
  code: string;
  addressLine: string;
  capacity: number;
}

type PortalTab = 'search' | 'inquiry' | 'admission' | 'feedback' | 'volunteer' | 'donate';

export default function PublicPortalScreen() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<PortalTab>('search');
  const [q, setQ] = useState('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/portal/search', { params: { q: q.trim() } });
      setInstitutions((res.data as { data: Institution[] }).data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submit(path: string, body: Record<string, unknown>, reset: () => void) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.post(path, body);
      setMessage(t('portal.submitted'));
      reset();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const tabs: PortalTab[] = ['search', 'inquiry', 'admission', 'feedback', 'volunteer', 'donate'];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('portal.title')}</Text>
        <Text style={styles.subtitle}>{t('portal.subtitle')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {tabs.map((tb) => (
            <TouchableOpacity
              key={tb}
              style={[styles.tab, tab === tb && styles.tabActive]}
              onPress={() => { setTab(tb); setError(null); setMessage(null); }}
            >
              <Text style={[styles.tabText, tab === tb && styles.tabTextActive]}>{t(`portal.tab.${tb}`)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        {tab === 'search' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('portal.searchTitle')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('portal.searchPlaceholder')}
              value={q}
              onChangeText={setQ}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={() => void search()} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>{t('portal.search')}</Text>}
            </TouchableOpacity>

            {institutions.map((i) => (
              <View key={i.id} style={styles.resultCard}>
                <Text style={styles.resultName}>{lang === 'mr' ? (i.nameMr || i.name) : i.name}</Text>
                <Text style={styles.resultMeta}>{i.code} · {t('portal.capacity')} {i.capacity}</Text>
                <Text style={styles.resultMeta}>{i.addressLine}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'inquiry' ? (
          <InquiryForm loading={loading} onSubmit={(body, reset) => void submit('/portal/complaints', body, reset)} />
        ) : null}

        {tab === 'admission' ? (
          <AdmissionForm loading={loading} onSubmit={(body, reset) => void submit('/portal/admission-request', body, reset)} />
        ) : null}

        {tab === 'feedback' ? (
          <FeedbackForm loading={loading} onSubmit={(body, reset) => void submit('/portal/feedback', body, reset)} />
        ) : null}

        {tab === 'volunteer' ? (
          <VolunteerForm loading={loading} onSubmit={(body, reset) => void submit('/portal/volunteer-register', body, reset)} />
        ) : null}

        {tab === 'donate' ? (
          <DonationForm loading={loading} onSubmit={(body, reset) => void submit('/portal/donations/pledge', body, reset)} />
        ) : null}

        <Link href="/login" style={styles.link}>{t('portal.backToLogin')}</Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InquiryForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('portal.inquiryTitle')}</Text>
      <TextInput style={styles.input} placeholder={t('portal.yourName')} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.email')} value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.phone')} value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.subject')} value={form.subject} onChangeText={(v) => setForm((p) => ({ ...p, subject: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder={t('portal.message')} multiline value={form.message} onChangeText={(v) => setForm((p) => ({ ...p, message: v }))} />
      <TouchableOpacity style={styles.primaryButton} onPress={() => onSubmit({ ...form, subject: form.subject || t('portal.publicInquiry') }, () => setForm({ name: '', email: '', phone: '', subject: '', message: '' }))} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>{t('portal.submit')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

function AdmissionForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    applicantName: '',
    age: '',
    gender: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    preferredInstitutionCode: '',
    medicalNotes: '',
  });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('portal.admissionTitle')}</Text>
      <TextInput style={styles.input} placeholder={t('portal.applicantName')} value={form.applicantName} onChangeText={(v) => setForm((p) => ({ ...p, applicantName: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.age')} keyboardType="numeric" value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.gender')} value={form.gender} onChangeText={(v) => setForm((p) => ({ ...p, gender: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.contactName')} value={form.contactName} onChangeText={(v) => setForm((p) => ({ ...p, contactName: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.contactPhone')} value={form.contactPhone} onChangeText={(v) => setForm((p) => ({ ...p, contactPhone: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.contactEmail')} value={form.contactEmail} onChangeText={(v) => setForm((p) => ({ ...p, contactEmail: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.preferredCode')} value={form.preferredInstitutionCode} onChangeText={(v) => setForm((p) => ({ ...p, preferredInstitutionCode: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder={t('portal.medicalNotes')} multiline value={form.medicalNotes} onChangeText={(v) => setForm((p) => ({ ...p, medicalNotes: v }))} />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => onSubmit({
          ...form,
          age: form.age ? Number(form.age) : undefined,
        }, () => setForm({
          applicantName: '', age: '', gender: '', contactName: '', contactPhone: '', contactEmail: '', preferredInstitutionCode: '', medicalNotes: '',
        }))}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>{t('portal.requestAdmission')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

function FeedbackForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', phone: '', category: '', message: '' });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('portal.feedbackTitle')}</Text>
      <TextInput style={styles.input} placeholder={t('portal.yourName')} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.email')} value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.phone')} value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.category')} value={form.category} onChangeText={(v) => setForm((p) => ({ ...p, category: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder={t('portal.yourFeedback')} multiline value={form.message} onChangeText={(v) => setForm((p) => ({ ...p, message: v }))} />
      <TouchableOpacity style={styles.primaryButton} onPress={() => onSubmit(form, () => setForm({ name: '', email: '', phone: '', category: '', message: '' }))} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>{t('portal.sendFeedback')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

function VolunteerForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', phone: '', skills: '', availability: '', message: '' });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('portal.volunteerTitle')}</Text>
      <TextInput style={styles.input} placeholder={t('portal.fullName')} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.email')} value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.phone')} value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.skills')} value={form.skills} onChangeText={(v) => setForm((p) => ({ ...p, skills: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.availability')} value={form.availability} onChangeText={(v) => setForm((p) => ({ ...p, availability: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder={t('portal.message')} multiline value={form.message} onChangeText={(v) => setForm((p) => ({ ...p, message: v }))} />
      <TouchableOpacity style={styles.primaryButton} onPress={() => onSubmit(form, () => setForm({ name: '', email: '', phone: '', skills: '', availability: '', message: '' }))} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>{t('portal.register')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

function DonationForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', phone: '', amount: '', purpose: '', message: '' });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('portal.donationTitle')}</Text>
      <TextInput style={styles.input} placeholder={t('portal.name')} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.email')} value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.phone')} value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.amount')} keyboardType="numeric" value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} />
      <TextInput style={styles.input} placeholder={t('portal.purpose')} value={form.purpose} onChangeText={(v) => setForm((p) => ({ ...p, purpose: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder={t('portal.message')} multiline value={form.message} onChangeText={(v) => setForm((p) => ({ ...p, message: v }))} />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => onSubmit({ ...form, amount: form.amount ? Number(form.amount) : undefined }, () => setForm({ name: '', email: '', phone: '', amount: '', purpose: '', message: '' }))}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>{t('portal.pledgeDonation')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.primaryDark, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  tabBar: { flexDirection: 'row', gap: spacing.sm },
  tab: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, color: colors.text, fontWeight: '500', textTransform: 'capitalize' },
  tabTextActive: { color: colors.textInverse, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md, fontSize: 15, backgroundColor: colors.surface },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
  primaryButtonText: { color: colors.textInverse, fontWeight: '600', fontSize: 15 },
  error: { color: colors.error, marginBottom: spacing.md },
  success: { color: colors.success, marginBottom: spacing.md },
  resultCard: { backgroundColor: colors.secondary, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm },
  resultName: { fontSize: 14, fontWeight: '600', color: colors.text },
  resultMeta: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  link: { textAlign: 'center', color: colors.primary, fontSize: 13, marginTop: spacing.sm },
});