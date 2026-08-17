import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { api, errorMessage } from '../src/api/client';
import { tokenStorage } from '../src/api/storage';
import { getRedirectResult } from 'firebase/auth';
import { getFirebaseAuth } from '../src/config/firebase';
import { useTheme } from '../src/config/ThemeContext';
import { useI18n } from '../src/i18n';
import { spacing, radii } from '../src/config/theme';
import { HeaderControls } from '../src/components/HeaderControls';

function GoogleLogo({ size = 18 }: { size?: number }) {
  const w = size;
  const h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 48 48" style={{ marginRight: 8 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.47 0 11.41-2.13 15.19-5.79l-7.73-6c-2.15 1.45-4.92 2.3-8.46 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function OnboardScreen() {
  const { signUpGoogle } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [institutionName, setInstitutionName] = useState('');
  const [institutionCode, setInstitutionCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      const authInst = getFirebaseAuth();
      const cred = await getRedirectResult(authInst);
      if (!cred) return;
      const pendingRaw = await tokenStorage.getItem('pendingOnboard');
      const idToken = await cred.user.getIdToken();
      if (pendingRaw) {
        let pending: { institutionName?: string; institutionCode?: string } = {};
        try {
          pending = JSON.parse(pendingRaw) as { institutionName?: string; institutionCode?: string };
        } catch {
          pending = {};
        }
        if (pending.institutionName && pending.institutionCode) {
          try {
            await api.post('/auth/onboard', { idToken, institutionName: pending.institutionName, institutionCode: pending.institutionCode });
            await tokenStorage.deleteItem('pendingOnboard');
            setDone(true);
            return;
          } catch (err) {
            await tokenStorage.deleteItem('pendingOnboard');
            setError(errorMessage(err));
            return;
          }
        }
      }
      setError(t('onboard.googlePending'));
    })();
  }, [t]);

  async function handleGoogleRegister() {
    if (!institutionName || !institutionCode) {
      setError(t('onboard.required'));
      return;
    }
    setBusy(true);
    setError(null);
    await tokenStorage.setItem('pendingOnboard', JSON.stringify({ institutionName: institutionName.trim(), institutionCode: institutionCode.trim() }));
    try {
      const idToken = await signUpGoogle();
      if (!idToken) return;
      await tokenStorage.deleteItem('pendingOnboard');
      await api.post('/auth/onboard', { idToken, institutionName: institutionName.trim(), institutionCode: institutionCode.trim() });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <KeyboardAvoidingView style={[styles.flex, { backgroundColor: palette.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topControls}>
          <HeaderControls variant="floating" />
        </View>
        <View style={styles.center}>
          <View style={[styles.logo, { backgroundColor: palette.primaryLight }]}>
            <Text style={styles.logoText}>✓</Text>
          </View>
          <Text style={[styles.title, { color: palette.primaryDark }]}>{t('onboard.completeTitle')}</Text>
          <Text style={[styles.body, { color: palette.textMuted }]}>{t('onboard.completeBody')}</Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: palette.primary }]}
            onPress={() => router.replace({ pathname: '/login', params: { registered: '1' } })}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('onboard.goToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: palette.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topControls}>
        <HeaderControls variant="floating" />
      </View>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          <View style={[styles.logo, { backgroundColor: palette.primaryLight }]}>
            <Text style={styles.logoText}>OA</Text>
          </View>
          <Text style={[styles.title, { color: palette.primaryDark }]}>{t('onboard.title')}</Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>{t('onboard.subtitle')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border, shadowColor: palette.primary }]}>
          <View style={[styles.inputWrap, { backgroundColor: palette.backgroundSoft, borderColor: palette.borderSoft }]}>
            <Text style={[styles.inputIcon, { color: palette.textMuted }]}>🏛</Text>
            <TextInput style={[styles.input, { color: palette.text }]} placeholder={t('onboard.institutionName')} placeholderTextColor={palette.textMuted} value={institutionName} onChangeText={setInstitutionName} />
          </View>
          <View style={[styles.inputWrap, { backgroundColor: palette.backgroundSoft, borderColor: palette.borderSoft }]}>
            <Text style={[styles.inputIcon, { color: palette.textMuted }]}>#</Text>
            <TextInput style={[styles.input, { color: palette.text }]} placeholder={t('onboard.institutionCode')} placeholderTextColor={palette.textMuted} autoCapitalize="characters" value={institutionCode} onChangeText={setInstitutionCode} />
          </View>

          <Text style={[styles.hint, { color: palette.textMuted }]}>{t('onboard.googleHint')}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {Platform.OS === 'web' ? (
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={() => void handleGoogleRegister()} disabled={busy} activeOpacity={0.8}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.googleBtnContent}>
                  <GoogleLogo size={18} />
                  <Text style={styles.primaryButtonText}>{t('onboard.register')}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={() => void handleGoogleRegister()} disabled={busy} activeOpacity={0.8}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('onboard.register')}</Text>}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.linksWrap}>
          <Link href="/login" style={[styles.link, { color: palette.primaryDark }]}>
            {t('onboard.backToLogin')}
          </Link>
          <Link href="/portal" style={[styles.link, { color: palette.textMuted }]}>
            {t('login.publicPortal')}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topControls: { position: 'absolute', top: 18, left: 16, zIndex: 10 },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, paddingTop: 80, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  brandWrap: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoText: { fontSize: 24, fontWeight: '800', color: '#1d4ed8' },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 24 },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: spacing.xs, lineHeight: 18 },
  body: { fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21, marginBottom: spacing.lg },
  card: { width: '100%', maxWidth: 420, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15 },
  hint: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: spacing.md },
  error: { color: '#dc2626', marginBottom: spacing.md, fontSize: 13 },
  primaryButton: { borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, minHeight: 48, flexDirection: 'row' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  googleBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  linksWrap: { marginTop: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  link: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
