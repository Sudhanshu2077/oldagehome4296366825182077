import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { ScreenHeader, EmptyState } from '../../src/components/ui';

interface ModuleMeta {
  code: string;
  title: string;
  titleMr: string;
  category: string;
}

export default function ModulesScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [modules, setModules] = useState<ModuleMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    error: { color: palette.error },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, minHeight: 96 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    monogram: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    monogramText: { fontSize: 14, fontWeight: '800', color: palette.textInverse },
    cardTitle: { fontSize: 14, fontWeight: '700', color: palette.primaryDark, flex: 1 },
    cardCode: { fontSize: 10, color: palette.textMuted, marginTop: spacing.sm, fontFamily: 'monospace' },
  }), [palette]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/modules');
        setModules((res.data as { data: ModuleMeta[] }).data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('modules.title')} subtitle={t('modules.subtitle')} />
      <FlatList
        data={modules}
        keyExtractor={(m) => m.code}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
        ListEmptyComponent={<EmptyState message={t('modules.empty')} />}
        renderItem={({ item }) => {
          const label = t(`mod.${item.code}`, item.title);
          return (
            <Link href={`/module/${item.code}`} asChild>
              <TouchableOpacity style={[styles.card, { flexBasis: '47%', flexGrow: 1 }]} activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <View style={[styles.monogram, { backgroundColor: palette.primary }]}>
                    <Text style={styles.monogramText}>{label.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{label}</Text>
                </View>
                <Text style={styles.cardCode}>{item.code}</Text>
              </TouchableOpacity>
            </Link>
          );
        }}
      />
    </View>
  );
}