import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { spacing, radii } from '../../src/config/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();

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
        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{'ACCOUNT'}</Text>
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
  avatarText: { fontSize: 28, fontWeight: '800', color: '#7c2d12' },
  name: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: spacing.xl },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '600' },
  logoutButton: { borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', minHeight: 48 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});