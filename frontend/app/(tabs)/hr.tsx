import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

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
    heading: { fontSize: 18, fontWeight: '700', color: palette.primaryDark, padding: spacing.md, paddingBottom: 0 },
    card: { flex: 1, backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.lg, minHeight: 120, borderWidth: 1, borderColor: palette.border },
    cardTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark },
    cardDescription: { fontSize: 11, color: palette.textMuted, marginTop: spacing.sm },
  }), [palette]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('hr.title')}</Text>
      <FlatList
        data={HR_MODULES}
        keyExtractor={(m) => m.code}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        renderItem={({ item }) => (
          <Link href={`/module/${item.code}`} asChild>
            <TouchableOpacity style={styles.card}>
              <Text style={styles.cardTitle}>{t(item.titleKey)}</Text>
              <Text style={styles.cardDescription}>{t(`${item.titleKey}.desc`)}</Text>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}