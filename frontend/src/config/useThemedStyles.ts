import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Palette, spacing, radii } from './theme';
import { useTheme } from './ThemeContext';

export interface CommonStyles {
  container: { flex: 1; backgroundColor: string };
  center: { flex: 1; alignItems: 'center'; justifyContent: 'center'; backgroundColor: string };
  card: { backgroundColor: string; borderRadius: number; padding: number; marginBottom: number };
  heading: { fontSize: number; fontWeight: '700'; color: string; padding: number; paddingBottom: number };
  screenTitle: { fontSize: number; fontWeight: '700'; color: string };
  addButton: { backgroundColor: string; borderRadius: number; paddingHorizontal: number; paddingVertical: number };
  addButtonText: { color: string; fontWeight: '600'; fontSize: number };
  error: { color: string; padding: number };
  empty: { textAlign: 'center'; color: string; marginTop: number };
  headerRow: { flexDirection: 'row'; justifyContent: 'space-between'; alignItems: 'center'; padding: number };
  modalBackdrop: { flex: number; backgroundColor: string; alignItems: 'center'; justifyContent: 'center'; padding: number };
  modalCard: { backgroundColor: string; borderRadius: number; padding: number; width: string; maxWidth: number };
  modalTitle: { fontSize: number; fontWeight: '700'; color: string; marginBottom: number };
  fieldLabel: { fontSize: number; color: string; marginBottom: number };
  input: { borderWidth: number; borderColor: string; borderRadius: number; paddingHorizontal: number; paddingVertical: number; fontSize: number; color: string };
  textArea: { minHeight: number; textAlignVertical: 'top' };
  modalActions: { flexDirection: 'row'; justifyContent: 'flex-end'; gap: number; marginTop: number };
  cancelButton: { paddingHorizontal: number; paddingVertical: number };
  cancelText: { color: string; fontWeight: '600' };
  saveButton: { backgroundColor: string; borderRadius: number; paddingHorizontal: number; paddingVertical: number };
  saveText: { color: string; fontWeight: '600' };
  section: { marginBottom: number };
  sectionTitle: { fontSize: number; fontWeight: '600'; color: string; marginBottom: number };
  tile: { flex: number; backgroundColor: string; borderRadius: number; padding: number; margin: number; minHeight: number; justifyContent: 'center' };
}

export function useThemedStyles() {
  const { palette } = useTheme();
  return useMemo(() => makeStyles(palette), [palette]);
}

export function makeStyles(p: Palette): CommonStyles {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.background },
    card: { backgroundColor: p.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
    heading: { fontSize: 18, fontWeight: '700', color: p.primaryDark, padding: spacing.md, paddingBottom: 0 },
    screenTitle: { fontSize: 17, fontWeight: '700', color: p.primaryDark },
    addButton: { backgroundColor: p.primary, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    addButtonText: { color: p.textInverse, fontWeight: '600', fontSize: 13 },
    error: { color: p.error, padding: spacing.md },
    empty: { textAlign: 'center', color: p.textMuted, marginTop: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    modalBackdrop: { flex: 1, backgroundColor: p.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: p.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: p.primaryDark, marginBottom: spacing.md },
    fieldLabel: { fontSize: 12, color: p.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: p.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: 14, color: p.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' as 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: p.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: p.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: p.textInverse, fontWeight: '600' },
    section: { marginBottom: spacing.xl },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: p.text, marginBottom: spacing.sm },
    tile: { flex: 1, backgroundColor: p.surface, borderRadius: radii.md, padding: spacing.lg, margin: spacing.xs, minHeight: 96, justifyContent: 'center' },
  }) as unknown as CommonStyles;
}