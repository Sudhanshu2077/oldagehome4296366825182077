import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface RegisterInfo {
  id: string;
  title: string;
  titleMr: string;
}

export default function RegistersScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [registers, setRegisters] = useState<RegisterInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    error: { color: palette.error },
    tile: {
      flex: 1,
      backgroundColor: palette.surface,
      borderRadius: radii.md,
      padding: spacing.lg,
      margin: spacing.xs,
      minHeight: 96,
      justifyContent: 'center',
    },
    tileId: { fontSize: 12, fontWeight: '700', color: palette.textMuted },
    tileTitle: { fontSize: 14, fontWeight: '600', color: palette.primaryDark, marginTop: spacing.xs },
    tileTitleMr: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  }), [palette]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/registers');
        setRegisters((res.data as { data: RegisterInfo[] }).data);
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
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md }}
      data={registers}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.tile}
          onPress={() => {
            if (item.id === 'R1') {
              router.push('/admission/list');
            } else if (item.id === 'R6') {
              router.push('/visit-book/list');
            } else {
              router.push({ pathname: '/register/[id]', params: { id: item.id, title: item.title } });
            }
          }}
        >
          <Text style={styles.tileId}>{item.id}</Text>
          <Text style={styles.tileTitle}>{item.title || 'Register details pending'}</Text>
          <Text style={styles.tileTitleMr}>{item.titleMr || ''}</Text>
        </TouchableOpacity>
      )}
    />
  );
}