import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface HrModule {
  code: string;
  title: string;
  titleMr: string;
  description: string;
}

const HR_MODULES: HrModule[] = [
  { code: 'recruitments', title: 'Recruitments', titleMr: 'भरती', description: 'Job openings and candidate applications' },
  { code: 'confirmations', title: 'Confirmations', titleMr: 'पुष्टीकरण', description: 'Employee probation confirmation records' },
  { code: 'promotions', title: 'Promotions', titleMr: 'पदोन्नती', description: 'Employee promotion records' },
  { code: 'employee-transfers', title: 'Transfers', titleMr: 'बदल्या', description: 'Inter-department or location transfers' },
  { code: 'resignations', title: 'Resignations', titleMr: 'राजीनामे', description: 'Employee resignation records' },
  { code: 'terminations', title: 'Terminations', titleMr: 'सेवा समाप्ती', description: 'Service termination records' },
  { code: 'performance-reviews', title: 'Performance Reviews', titleMr: 'कामगिरी तपासणी', description: 'Appraisal and review cycles' },
  { code: 'trainings', title: 'Trainings', titleMr: 'प्रशिक्षण', description: 'Training sessions and attendance' },
  { code: 'certificates', title: 'Certificates', titleMr: 'प्रमाणपत्रे', description: 'Employee certificates and documents' },
];

export default function HrLifecycleScreen() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    heading: { fontSize: 18, fontWeight: '700', color: palette.primaryDark, padding: spacing.md, paddingBottom: 0 },
    card: { flex: 1, backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.lg, minHeight: 120, borderWidth: 1, borderColor: palette.border },
    cardTitleMr: { fontSize: 16, fontWeight: '700', color: palette.primaryDark },
    cardTitle: { fontSize: 13, fontWeight: '600', color: palette.text, marginTop: 2 },
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
              <Text style={styles.cardTitleMr}>{item.titleMr}</Text>
              <Text style={styles.cardTitle}>{lang === 'en' ? item.title : (item.titleMr || item.title)}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}