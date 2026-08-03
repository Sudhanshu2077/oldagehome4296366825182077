import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../config/ThemeContext';
import { spacing, radii } from '../config/theme';

interface PoliteModalProps {
  visible: boolean;
  title: string;
  body: string;
  icon?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export function PoliteModal({ visible, title, body, icon = 'ℹ', primaryLabel, secondaryLabel, onPrimary, onSecondary }: PoliteModalProps) {
  const { palette } = useTheme();
  if (!visible) return null;
  return (
    <Modal transparent visible onRequestClose={onSecondary}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: palette.secondary }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.body, { color: palette.textMuted }]}>{body}</Text>
          {primaryLabel && onPrimary ? (
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={onPrimary} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>
          ) : null}
          {secondaryLabel && onSecondary ? (
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: palette.border, backgroundColor: palette.backgroundSoft }]} onPress={onSecondary} activeOpacity={0.8}>
              <Text style={[styles.secondaryButtonText, { color: palette.textMuted }]}>{secondaryLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: { fontSize: 30 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: spacing.xl },
  primaryButton: { width: '100%', borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm, minHeight: 48 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: { width: '100%', borderRadius: radii.md, borderWidth: 1, paddingVertical: spacing.md, alignItems: 'center', minHeight: 46 },
  secondaryButtonText: { fontWeight: '600', fontSize: 14 },
});
