import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../config/ThemeContext';
import { useI18n, LANGUAGES, langNative } from '../i18n';
import { spacing, radii } from '../config/theme';

interface Props {
  variant?: 'header' | 'floating';
}

export function HeaderControls({ variant = 'header' }: Props) {
  const { palette, mode, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);

  const trigger =
    variant === 'floating' ? (
      <TouchableOpacity style={[styles.trigger, styles.floatingTrigger, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.triggerIcon, { color: palette.primaryDark }]}>♁</Text>
        <Text style={[styles.triggerText, { color: palette.text }]}>{langNative(lang)}</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity style={[styles.trigger, { backgroundColor: palette.surfaceAlt, borderColor: palette.borderSoft }]} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.triggerIcon, { color: palette.primaryDark }]}>♁</Text>
        <Text style={[styles.triggerText, { color: palette.text }]}>{langNative(lang)}</Text>
        <Text style={[styles.chevron, { color: palette.textMuted }]}>▾</Text>
      </TouchableOpacity>
    );

  return (
    <>
      {trigger}
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.popover, { backgroundColor: palette.surface, borderColor: palette.border }, variant === 'floating' && styles.popoverFloating]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{t('common.language').toUpperCase()}</Text>
                {LANGUAGES.map((l) => {
                  const active = l.code === lang;
                  return (
                    <TouchableOpacity
                      key={l.code}
                      style={[styles.optionRow, { backgroundColor: active ? palette.secondary : 'transparent', borderColor: active ? palette.primaryLight : palette.borderSoft }]}
                      onPress={() => {
                        setLang(l.code);
                      }}
                    >
                      <Text style={[styles.optionLabel, { color: palette.text }]}>{l.native}</Text>
                      <Text style={[styles.optionSub, { color: palette.textMuted }]}>{l.label}</Text>
                      {active ? <Text style={[styles.check, { color: palette.primaryDark }]}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{t('common.theme').toUpperCase()}</Text>
                <TouchableOpacity
                  style={[styles.optionRow, { backgroundColor: mode === 'light' ? palette.secondary : 'transparent', borderColor: mode === 'light' ? palette.primaryLight : palette.borderSoft }]}
                  onPress={() => {
                    if (mode !== 'light') toggle();
                  }}
                >
                  <Text style={styles.themeIcon}>☼</Text>
                  <Text style={[styles.optionLabel, { color: palette.text }]}>{t('common.lightMode')}</Text>
                  {mode === 'light' ? <Text style={[styles.check, { color: palette.primaryDark }]}>✓</Text> : null}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionRow, { backgroundColor: mode === 'dark' ? palette.secondary : 'transparent', borderColor: mode === 'dark' ? palette.primaryLight : palette.borderSoft }]}
                  onPress={() => {
                    if (mode !== 'dark') toggle();
                  }}
                >
                  <Text style={styles.themeIcon}>☾</Text>
                  <Text style={[styles.optionLabel, { color: palette.text }]}>{t('common.darkMode')}</Text>
                  {mode === 'dark' ? <Text style={[styles.check, { color: palette.primaryDark }]}>✓</Text> : null}
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  floatingTrigger: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  triggerIcon: { fontSize: 14 },
  triggerText: { fontSize: 13, fontWeight: '600' },
  chevron: { fontSize: 10, marginLeft: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  popover: {
    position: 'absolute',
    top: 56,
    left: 14,
    width: 260,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  popoverFloating: { top: 70 },
  sectionWrap: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  optionLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  optionSub: { fontSize: 12, flex: 2 },
  check: { fontSize: 16, fontWeight: '700' },
  themeIcon: { fontSize: 16 },
  divider: { height: 1, marginVertical: spacing.md },
});