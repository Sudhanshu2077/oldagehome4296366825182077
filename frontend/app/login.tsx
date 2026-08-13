import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { errorMessage } from '../src/api/client';
import { useTheme } from '../src/config/ThemeContext';
import { useI18n } from '../src/i18n';
import { spacing, radii } from '../src/config/theme';
import { HeaderControls } from '../src/components/HeaderControls';
import { PoliteModal } from '../src/components/PoliteModal';

const GOOGLE_LOGIN_ENABLED = false;

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

export default function LoginScreen() {
  const { signInEmail, signInGoogle } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ registered?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotRegistered, setShowNotRegistered] = useState(false);
  const [showRegistered, setShowRegistered] = useState(false);

  useEffect(() => {
    if (params.registered === '1') {
      setShowRegistered(true);
      router.setParams({});
    }
  }, [params.registered]);

  function handleLoginError(err: unknown) {
    const msg = errorMessage(err);
    if (/not registered/i.test(msg)) {
      setError(null);
      setShowNotRegistered(true);
      return;
    }
    setError(msg);
  }

  async function handleEmailLogin() {
    if (!email || !password) {
      setError(t('login.errorRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInEmail(email.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      handleLoginError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setBusy(true);
    setError(null);
    try {
      await signInGoogle();
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      handleLoginError(err);
    } finally {
      setBusy(false);
    }
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
          <Text style={[styles.title, { color: palette.primaryDark }]}>{t('app.title')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border, shadowColor: palette.primary }]}>
          <Text style={[styles.welcome, { color: palette.text }]}>{t('login.button')}</Text>
          <Text style={[styles.welcomeSub, { color: palette.textMuted }]}>IGOHMS</Text>

          <View style={[styles.inputWrap, { backgroundColor: palette.backgroundSoft, borderColor: palette.borderSoft }]}>
            <Text style={[styles.inputIcon, { color: palette.textMuted }]}>✉</Text>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder={t('login.email')}
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={[styles.inputWrap, { backgroundColor: palette.backgroundSoft, borderColor: palette.borderSoft }]}>
            <Text style={[styles.inputIcon, { color: palette.textMuted }]}>⚿</Text>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder={t('login.password')}
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={() => void handleEmailLogin()} disabled={busy} activeOpacity={0.8}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('login.button')}</Text>}
          </TouchableOpacity>

          {GOOGLE_LOGIN_ENABLED && Platform.OS === 'web' ? (
            <TouchableOpacity style={[styles.googleButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => void handleGoogleLogin()} disabled={busy} activeOpacity={0.8}>
              <View style={styles.googleBtnContent}>
                <GoogleLogo size={18} />
                <Text style={[styles.googleButtonText, { color: palette.text }]}>{t('login.google')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.linksWrap}>
          <Link href="/onboard" style={[styles.link, { color: palette.primaryDark }]}>
            {t('login.registerInstitution')}
          </Link>
          <Link href="/portal" style={[styles.link, { color: palette.textMuted }]}>
            {t('login.publicPortal')}
          </Link>
        </View>
      </ScrollView>

      <PoliteModal
        visible={showRegistered}
        icon="✓"
        title={t('login.registeredTitle')}
        body={t('login.registeredBody')}
        primaryLabel={t('common.ok')}
        onPrimary={() => setShowRegistered(false)}
      />
      <PoliteModal
        visible={showNotRegistered}
        icon="🏛"
        title={t('login.notRegisteredTitle')}
        body={t('login.notRegisteredBody')}
        primaryLabel={t('login.goToRegister')}
        secondaryLabel={t('common.cancel')}
        onPrimary={() => {
          setShowNotRegistered(false);
          router.push('/onboard');
        }}
        onSecondary={() => setShowNotRegistered(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topControls: { position: 'absolute', top: 18, left: 16, zIndex: 10 },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, paddingTop: 80, paddingBottom: 40 },
  brandWrap: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoText: { fontSize: 24, fontWeight: '800', color: '#7c2d12' },
  card: { width: '100%', maxWidth: 420, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
  welcome: { fontSize: 24, fontWeight: '800', textAlign: 'left', marginBottom: 2 },
  welcomeSub: { fontSize: 12, fontWeight: '600', marginBottom: spacing.lg, letterSpacing: 2 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15 },
  error: { color: '#dc2626', marginBottom: spacing.md, fontSize: 13 },
  primaryButton: { borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm, minHeight: 48 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  googleButton: { borderWidth: 1, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.md, minHeight: 48 },
  googleBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  googleButtonText: { fontWeight: '600', fontSize: 15 },
  linksWrap: { marginTop: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  link: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
});