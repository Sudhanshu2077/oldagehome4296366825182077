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
      setMessage('Submitted successfully.');
      reset();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>सार्वजनिक पोर्टल / Public Portal</Text>
        <Text style={styles.subtitle}>Search institutions, request admission, or get involved</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {(['search', 'inquiry', 'admission', 'feedback', 'volunteer', 'donate'] as PortalTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => { setTab(t); setError(null); setMessage(null); }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        {tab === 'search' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Search Institutions</Text>
            <TextInput
              style={styles.input}
              placeholder="Search by name or code"
              value={q}
              onChangeText={setQ}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={() => void search()} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>Search</Text>}
            </TouchableOpacity>

            {institutions.map((i) => (
              <View key={i.id} style={styles.resultCard}>
                <Text style={styles.resultName}>{i.nameMr || i.name}</Text>
                <Text style={styles.resultMeta}>{i.code} · Capacity {i.capacity}</Text>
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

        <Link href="/login" style={styles.link}>Back to login</Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InquiryForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Submit Inquiry / Complaint</Text>
      <TextInput style={styles.input} placeholder="Your name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
      <TextInput style={styles.input} placeholder="Phone" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
      <TextInput style={styles.input} placeholder="Subject" value={form.subject} onChangeText={(v) => setForm((p) => ({ ...p, subject: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Message" multiline value={form.message} onChangeText={(v) => setForm((p) => ({ ...p, message: v }))} />
      <TouchableOpacity style={styles.primaryButton} onPress={() => onSubmit({ ...form, subject: form.subject || 'Public inquiry' }, () => setForm({ name: '', email: '', phone: '', subject: '', message: '' }))} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>Submit</Text>}
      </TouchableOpacity>
    </View>
  );
}

function AdmissionForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
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
      <Text style={styles.cardTitle}>Admission Request</Text>
      <TextInput style={styles.input} placeholder="Applicant name" value={form.applicantName} onChangeText={(v) => setForm((p) => ({ ...p, applicantName: v }))} />
      <TextInput style={styles.input} placeholder="Age" keyboardType="numeric" value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} />
      <TextInput style={styles.input} placeholder="Gender" value={form.gender} onChangeText={(v) => setForm((p) => ({ ...p, gender: v }))} />
      <TextInput style={styles.input} placeholder="Contact name" value={form.contactName} onChangeText={(v) => setForm((p) => ({ ...p, contactName: v }))} />
      <TextInput style={styles.input} placeholder="Contact phone" value={form.contactPhone} onChangeText={(v) => setForm((p) => ({ ...p, contactPhone: v }))} />
      <TextInput style={styles.input} placeholder="Contact email" value={form.contactEmail} onChangeText={(v) => setForm((p) => ({ ...p, contactEmail: v }))} />
      <TextInput style={styles.input} placeholder="Preferred institution code" value={form.preferredInstitutionCode} onChangeText={(v) => setForm((p) => ({ ...p, preferredInstitutionCode: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Medical notes" multiline value={form.medicalNotes} onChangeText={(v) => setForm((p) => ({ ...p, medicalNotes: v }))} />
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
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>Request Admission</Text>}
      </TouchableOpacity>
    </View>
  );
}

function FeedbackForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', category: '', message: '' });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Feedback</Text>
      <TextInput style={styles.input} placeholder="Your name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
      <TextInput style={styles.input} placeholder="Phone" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
      <TextInput style={styles.input} placeholder="Category" value={form.category} onChangeText={(v) => setForm((p) => ({ ...p, category: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Your feedback" multiline value={form.message} onChangeText={(v) => setForm((p) => ({ ...p, message: v }))} />
      <TouchableOpacity style={styles.primaryButton} onPress={() => onSubmit(form, () => setForm({ name: '', email: '', phone: '', category: '', message: '' }))} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>Send Feedback</Text>}
      </TouchableOpacity>
    </View>
  );
}

function VolunteerForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', skills: '', availability: '', message: '' });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Volunteer Registration</Text>
      <TextInput style={styles.input} placeholder="Full name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
      <TextInput style={styles.input} placeholder="Phone" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
      <TextInput style={styles.input} placeholder="Skills" value={form.skills} onChangeText={(v) => setForm((p) => ({ ...p, skills: v }))} />
      <TextInput style={styles.input} placeholder="Availability" value={form.availability} onChangeText={(v) => setForm((p) => ({ ...p, availability: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Message" multiline value={form.message} onChangeText={(v) => setForm((p) => ({ ...p, message: v }))} />
      <TouchableOpacity style={styles.primaryButton} onPress={() => onSubmit(form, () => setForm({ name: '', email: '', phone: '', skills: '', availability: '', message: '' }))} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>Register</Text>}
      </TouchableOpacity>
    </View>
  );
}

function DonationForm({ loading, onSubmit }: { loading: boolean; onSubmit: (body: Record<string, unknown>, reset: () => void) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', amount: '', purpose: '', message: '' });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Donation Pledge</Text>
      <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
      <TextInput style={styles.input} placeholder="Phone" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
      <TextInput style={styles.input} placeholder="Amount (₹)" keyboardType="numeric" value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} />
      <TextInput style={styles.input} placeholder="Purpose" value={form.purpose} onChangeText={(v) => setForm((p) => ({ ...p, purpose: v }))} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Message" multiline value={form.message} onChangeText={(v) => setForm((p) => ({ ...p, message: v }))} />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => onSubmit({ ...form, amount: form.amount ? Number(form.amount) : undefined }, () => setForm({ name: '', email: '', phone: '', amount: '', purpose: '', message: '' }))}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryButtonText}>Pledge Donation</Text>}
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
