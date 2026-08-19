import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

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
    heading: { fontSize: 18, fontWeight: '700', color: palette.primaryDark, padding: spacing.md, paddingBottom: 0 },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    card: { flex: 1, backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.lg, minHeight: 90 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: palette.primaryDark },
    cardCode: { fontSize: 10, color: palette.textMuted, marginTop: spacing.xs, fontFamily: 'monospace' },
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
      <Text style={styles.heading}>{t('modules.title')}</Text>
      <FlatList
        data={modules}
        keyExtractor={(m) => m.code}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        ListEmptyComponent={<Text style={styles.empty}>{t('modules.empty')}</Text>}
        renderItem={({ item }) => (
          <Link href={`/module/${item.code}`} asChild>
            <TouchableOpacity style={styles.card}>
              <Text style={styles.cardTitle}>{t(`mod.${item.code}`, item.title)}</Text>
              <Text style={styles.cardCode}>{item.code}</Text>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}