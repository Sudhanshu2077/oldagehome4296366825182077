import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { ScreenHeader } from '../../src/components/ui';

interface HrModule {
  code: string;
  titleKey: string;
}

const HR_MODULES: HrModule[] = [
  { code: 'recruitments', titleKey: 'hr.recruitments' },
  { code: 'confirmations', titleKey: 'hr.confirmations' },
  { code: 'promotions', titleKey: 'hr.promotions' },
  { code: 'employee-transfers', titleKey: 'hr.transfers' },
  { code: 'resignations', titleKey: 'hr.resignations' },
  { code: 'terminations', titleKey: 'hr.terminations' },
  { code: 'performance-reviews', titleKey: 'hr.performanceReviews' },
  { code: 'trainings', titleKey: 'hr.trainings' },
  { code: 'certificates', titleKey: 'hr.certificates' },
];

export default function HrLifecycleScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    card: { flex: 1, backgroundColor: palette.surface, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, minHeight: 112 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    monogram: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    monogramText: { fontSize: 16, fontWeight: '800', color: palette.textInverse },
    cardTitle: { fontSize: 15, fontWeight: '700', color: palette.primaryDark, flex: 1 },
    cardDescription: { fontSize: 11, color: palette.textMuted, marginTop: spacing.sm },
    code: { fontSize: 10, color: palette.textMuted, marginTop: spacing.xs, fontFamily: 'monospace' },
  }), [palette]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('hr.title')} subtitle={t('hr.subtitle')} />
      <FlatList
        data={HR_MODULES}
        keyExtractor={(m) => m.code}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
        renderItem={({ item }) => {
          const label = t(item.titleKey);
          return (
            <Link href={`/module/${item.code}`} asChild>
              <TouchableOpacity style={[styles.card, { flexBasis: '47%', flexGrow: 1 }]} activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <View style={[styles.monogram, { backgroundColor: palette.primary }]}>
                    <Text style={styles.monogramText}>{label.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{label}</Text>
                </View>
                <Text style={styles.cardDescription}>{t(`${item.titleKey}.desc`)}</Text>
                <Text style={styles.code}>{item.code}</Text>
              </TouchableOpacity>
            </Link>
          );
        }}
      />
    </View>
  );
}