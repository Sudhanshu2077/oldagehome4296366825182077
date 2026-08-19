import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n, LANGUAGES } from '../../src/i18n';
import { spacing, radii } from '../../src/config/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { palette, mode, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();

  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [compactMode, setCompactMode] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);

  function clearCache() {
    Alert.alert(t('settings.clearCache'), t('settings.clearCacheHint'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), onPress: () => Alert.alert(t('settings.clearCache'), t('settings.cacheCleared')) },
    ]);
  }

  function RowToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
    return (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.border, true: palette.primary }}
        thumbColor={value ? palette.primaryDark : palette.textMuted}
      />
    );
  }

  function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
      <View style={[styles.settingRow, { borderBottomColor: palette.borderSoft }]}>
        <View style={styles.settingRowText}>
          <Text style={[styles.settingLabel, { color: palette.text }]}>{label}</Text>
          {hint ? <Text style={[styles.settingHint, { color: palette.textMuted }]}>{hint}</Text> : null}
        </View>
        {children}
      </View>
    );
  }

  function ChevronRow({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
    return (
      <TouchableOpacity style={[styles.settingRow, { borderBottomColor: palette.borderSoft }]} onPress={onPress} activeOpacity={0.6}>
        <View style={styles.settingRowText}>
          <Text style={[styles.settingLabel, { color: palette.text }]}>{label}</Text>
          {hint ? <Text style={[styles.settingHint, { color: palette.textMuted }]}>{hint}</Text> : null}
        </View>
        <Text style={[styles.chevron, { color: palette.textMuted }]}>›</Text>
      </TouchableOpacity>
    );
  }

  function SectionHeader({ title, hint }: { title: string; hint?: string }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
        {hint ? <Text style={[styles.sectionHint, { color: palette.textMuted }]}>{hint}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <View style={styles.headerWrap}>
        <View style={[styles.avatar, { backgroundColor: palette.primaryLight }]}>
          <Text style={styles.avatarText}>{(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.name, { color: palette.primaryDark }]}>{user?.displayName || '—'}</Text>
        <Text style={[styles.email, { color: palette.textMuted }]}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{t('settings.account')}</Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.row, { borderBottomColor: palette.borderSoft }]}>
            <Text style={[styles.label, { color: palette.textMuted }]}>{t('common.role')}</Text>
            <Text style={[styles.value, { color: palette.text }]}>{user?.role}</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: palette.borderSoft }]}>
            <Text style={[styles.label, { color: palette.textMuted }]}>{t('common.tier')}</Text>
            <Text style={[styles.value, { color: palette.text }]}>{user?.tier}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: palette.textMuted }]}>{t('common.department')}</Text>
            <Text style={[styles.value, { color: palette.text }]}>{user?.department ?? '—'}</Text>
          </View>
        </View>
      </View>

      <SectionHeader title={t('settings.appearance')} hint={t('settings.languageHint')} />

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.subSectionTitle, { color: palette.text }]}>{t('settings.languageSection')}</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <TouchableOpacity
                key={l.code}
                style={[styles.langButton, { backgroundColor: active ? palette.primary : palette.backgroundSoft, borderColor: active ? palette.primary : palette.border }]}
                onPress={() => setLang(l.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langLabel, { color: active ? palette.textInverse : palette.text }]}>{l.native}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.subSectionTitle, { color: palette.text }]}>{t('settings.themeSection')}</Text>
        <Text style={[styles.subSectionHint, { color: palette.textMuted }]}>{t('settings.themeHint')}</Text>
        <View style={[styles.segmentWrap, { backgroundColor: palette.backgroundSoft, borderColor: palette.border }]}>
          <TouchableOpacity
            style={[styles.segment, { backgroundColor: mode === 'light' ? palette.primary : 'transparent' }]}
            onPress={() => { if (mode !== 'light') toggle(); }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, color: mode === 'light' ? palette.textInverse : palette.textMuted, fontWeight: '700' }}>☼ {t('common.lightMode')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, { backgroundColor: mode === 'dark' ? palette.primary : 'transparent' }]}
            onPress={() => { if (mode !== 'dark') toggle(); }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, color: mode === 'dark' ? palette.textInverse : palette.textMuted, fontWeight: '700' }}>☾ {t('common.darkMode')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionHeader title={t('settings.display')} hint={t('settings.displayHint')} />
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.subSectionTitle, { color: palette.text }]}>{t('settings.fontSize')}</Text>
        <View style={[styles.segmentWrap, { backgroundColor: palette.backgroundSoft, borderColor: palette.border }]}>
          {(['small', 'medium', 'large'] as const).map((fs) => (
            <TouchableOpacity
              key={fs}
              style={[styles.segment, { backgroundColor: fontSize === fs ? palette.primary : 'transparent' }]}
              onPress={() => setFontSize(fs)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: fs === 'large' ? 16 : fs === 'small' ? 12 : 14, color: fontSize === fs ? palette.textInverse : palette.textMuted, fontWeight: '700' }}>
                {fs === 'small' ? t('settings.fontSizeSmall') : fs === 'medium' ? t('settings.fontSizeMedium') : t('settings.fontSizeLarge')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <SettingRow label={t('settings.compactMode')} hint={t('settings.compactModeHint')}>
          <RowToggle value={compactMode} onValueChange={setCompactMode} />
        </SettingRow>
      </View>

      <SectionHeader title={t('settings.notifications')} hint={t('settings.notificationsHint')} />
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <SettingRow label={t('settings.pushNotif')} hint={t('settings.pushNotifHint')}>
          <RowToggle value={pushNotif} onValueChange={setPushNotif} />
        </SettingRow>
        <SettingRow label={t('settings.emailNotif')} hint={t('settings.emailNotifHint')}>
          <RowToggle value={emailNotif} onValueChange={setEmailNotif} />
        </SettingRow>
        <SettingRow label={t('settings.smsNotif')} hint={t('settings.smsNotifHint')}>
          <RowToggle value={smsNotif} onValueChange={setSmsNotif} />
        </SettingRow>
      </View>

      <SectionHeader title={t('settings.security')} hint={t('settings.securityHint')} />
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <ChevronRow label={t('settings.changePassword')} hint={t('settings.changePasswordHint')} onPress={() => Alert.alert(t('settings.changePassword'), t('settings.comingSoon'))} />
        <SettingRow label={t('settings.biometric')} hint={t('settings.biometricHint')}>
          <RowToggle value={biometric} onValueChange={setBiometric} />
        </SettingRow>
        <ChevronRow label={t('settings.sessionTimeout')} hint={t('settings.sessionTimeoutHint')} onPress={() => Alert.alert(t('settings.sessionTimeout'), '30 min')} />
      </View>

      <SectionHeader title={t('settings.dataStorage')} hint={t('settings.dataStorageHint')} />
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <SettingRow label={t('settings.offlineMode')} hint={t('settings.offlineModeHint')}>
          <RowToggle value={offlineMode} onValueChange={setOfflineMode} />
        </SettingRow>
        <ChevronRow label={t('settings.clearCache')} hint={t('settings.clearCacheHint')} onPress={clearCache} />
      </View>

      <SectionHeader title={t('settings.about')} hint={t('settings.aboutHint')} />
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <SettingRow label={t('settings.appVersion')}>
          <Text style={[styles.versionText, { color: palette.textMuted }]}>1.0.0</Text>
        </SettingRow>
        <ChevronRow label={t('settings.termsPrivacy')} onPress={() => Alert.alert(t('settings.termsPrivacy'), t('settings.comingSoon'))} />
        <ChevronRow label={t('settings.support')} hint={t('settings.supportHint')} onPress={() => Linking.openURL('mailto:support@igohms.gov.in')} />
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: palette.error }]}
        onPress={() => { void (async () => { await signOut(); router.replace('/login'); })(); }}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>{t('common.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#1d4ed8' },
  name: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: spacing.xl },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.sm, marginLeft: spacing.xs },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  sectionHint: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '600' },
  subSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  subSectionHint: { fontSize: 12, marginBottom: spacing.md },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  langButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center' },
  langLabel: { fontSize: 14, fontWeight: '600' },
  segmentWrap: { flexDirection: 'row', borderWidth: 1, borderRadius: radii.md, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.sm, alignItems: 'center' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md },
  settingRowText: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingHint: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '300' },
  versionText: { fontSize: 14, fontWeight: '600' },
  logoutButton: { borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', minHeight: 48, marginTop: spacing.lg },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});