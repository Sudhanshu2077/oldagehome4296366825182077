import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { spacing, radii } from '../config/theme';
import { useTheme } from '../config/ThemeContext';
import { useI18n } from '../i18n';

export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.headerRow, { backgroundColor: palette.background }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: palette.primaryDark }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function PrimaryButton({ label, onPress, icon, disabled, loading, style }: { label: string; onPress: () => void; icon?: React.ReactNode; disabled?: boolean; loading?: boolean; style?: object }) {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.primaryButton, { backgroundColor: palette.primary }, disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator size="small" color={palette.textInverse} /> : icon ? icon : null}
      <Text style={[styles.primaryButtonText, { color: palette.textInverse }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({ label, onPress, style, disabled }: { label: string; onPress: () => void; style?: object; disabled?: boolean }) {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.ghostButton, { borderColor: palette.border }, disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.ghostButtonText, { color: palette.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Card({ children, onPress, sample, style }: { children: React.ReactNode; onPress?: () => void; sample?: boolean; style?: object }) {
  const { palette } = useTheme();
  const inner = (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: sample ? palette.warning : palette.border }, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const { palette } = useTheme();
  const bg = active ? color ?? palette.primary : palette.surface;
  const fg = active ? palette.textInverse : palette.text;
  const content = (
    <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
  );
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: bg, borderColor: active ? color ?? palette.primary : palette.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.chip, { backgroundColor: bg, borderColor: active ? color ?? palette.primary : palette.border }]}>{content}</View>;
}

export function StatusBadge({ label, color }: { label: string; color?: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.statusBadge, { backgroundColor: color ?? palette.primary }]}>
      <Text style={[styles.statusText, { color: palette.textInverse }]}>{label}</Text>
    </View>
  );
}

export function SampleBadge() {
  const { t } = useI18n();
  const { palette } = useTheme();
  return (
    <View style={[styles.sampleBadge, { backgroundColor: palette.warning }]}>
      <Text style={[styles.sampleBadgeText, { color: palette.textInverse }]}>{t('sample.badge')}</Text>
    </View>
  );
}

export function SampleBanner() {
  const { palette } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.sampleBanner, { backgroundColor: palette.secondary, borderColor: palette.warning }]}>
      <Text style={[styles.sampleBannerText, { color: palette.textMuted }]}>{t('sample.banner')}</Text>
    </View>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={styles.emptyState}>
      {icon}
      <Text style={[styles.emptyText, { color: palette.textMuted }]}>{message}</Text>
    </View>
  );
}

export function KpiCard({ label, value, sub, valueColor, icon }: { label: string; value: string | number; sub?: string; valueColor?: string; icon?: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.kpiTop}>
        <Text style={[styles.kpiLabel, { color: palette.textMuted }]}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.kpiValue, { color: valueColor ?? palette.primaryDark }]}>{value}</Text>
      {sub ? <Text style={[styles.kpiSub, { color: palette.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
        {hint ? <Text style={[styles.sectionHint, { color: palette.textMuted }]}>{hint}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function KeyValueRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.kvRow, { borderBottomColor: palette.borderSoft }, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.kvLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.kvValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryButtonText: { fontWeight: '600', fontSize: 13 },
  ghostButton: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  ghostButtonText: { fontWeight: '600', fontSize: 13 },
  card: { borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
  chip: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6, marginRight: spacing.xs, marginBottom: spacing.xs },
  chipText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  sampleBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  sampleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  sampleBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm },
  sampleBannerText: { fontSize: 11 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { fontSize: 13, textAlign: 'center' },
  kpiCard: { borderRadius: radii.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  kpiValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  kpiSub: { fontSize: 11, marginTop: 2 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  sectionHint: { fontSize: 12, marginTop: 2 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1 },
  kvLabel: { fontSize: 12, flex: 1 },
  kvValue: { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
});

export function Scrollable({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <ScrollView style={style} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
      {children}
    </ScrollView>
  );
}