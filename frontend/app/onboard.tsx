import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { api, errorMessage } from '../src/api/client';
import { colors, spacing, radii } from '../src/config/theme';

export default function OnboardScreen() {
  const { signUpEmail } = useAuth();
  const [institutionName, setInstitutionName] = useState('');
  const [institutionCode, setInstitutionCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleOnboard() {
    if (!institutionName || !institutionCode || !email || !password) {
      setError('All fields are required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const idToken = await signUpEmail(email.trim(), password);
      await api.post('/auth/onboard', {
        idToken,
        institutionName: institutionName.trim(),
        institutionCode: institutionCode.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Registration complete</Text>
        <Text style={styles.body}>Your institution has been registered. You can now log in.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/login')}>
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>संस्था नोंदणी / Institution Registration</Text>
        <TextInput style={styles.input} placeholder="Institution name" value={institutionName} onChangeText={setInstitutionName} />
        <TextInput style={styles.input} placeholder="Institution code (unique)" autoCapitalize="characters" value={institutionCode} onChangeText={setInstitutionCode} />
        <TextInput style={styles.input} placeholder="Head email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} onPress={() => void handleOnboard()} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Register</Text>}
        </TouchableOpacity>
        <Link href="/login" style={styles.link}>Back to login</Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: colors.primaryDark, marginBottom: spacing.md },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md, fontSize: 15, backgroundColor: colors.surface },
  error: { color: colors.error, marginBottom: spacing.md, fontSize: 13 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm, paddingHorizontal: spacing.xl },
  primaryButtonText: { color: colors.textInverse, fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', color: colors.primary, fontSize: 13 },
});
