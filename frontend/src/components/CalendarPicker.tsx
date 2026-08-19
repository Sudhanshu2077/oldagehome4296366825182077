import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../config/ThemeContext';
import { spacing, radii } from '../config/theme';
import { useI18n } from '../i18n';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseDate(value: string): { y: number; m: number; d: number } | null {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return { y: parts[0] as number, m: (parts[1] as number) - 1, d: parts[2] as number };
}

interface CalendarPickerProps {
  visible: boolean;
  initialDate: string;
  locale: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export function CalendarPicker({ visible, initialDate, locale, onClose, onSelect }: CalendarPickerProps) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const parsed = useMemo(() => parseDate(initialDate), [initialDate]);
  const today = useMemo(() => {
    const now = new Date();
    return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [viewY, setViewY] = useState(parsed?.y ?? new Date().getFullYear());
  const [viewM, setViewM] = useState(parsed?.m ?? new Date().getMonth());
  const [picking, setPicking] = useState<'date' | 'year' | 'month'>('date');

  useEffect(() => {
    if (visible) {
      const p = parseDate(initialDate);
      setViewY(p?.y ?? new Date().getFullYear());
      setViewM(p?.m ?? new Date().getMonth());
      setPicking('date');
    }
  }, [visible, initialDate]);

  const localeTag = locale === 'hi' ? 'hi-IN' : locale === 'mr' ? 'mr-IN' : 'en-IN';
  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag, { weekday: 'short' });
    const base = new Date(2024, 0, 7);
    return DAYS.map((d) => fmt.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + d)));
  }, [localeTag]);
  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag, { month: 'short' });
    return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2024, m, 1)));
  }, [localeTag]);
  const monthFull = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag, { month: 'long' });
    return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2024, m, 1)));
  }, [localeTag]);

  const yearLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag, { year: 'numeric' });
    return fmt.format(new Date(viewY, 0, 1));
  }, [localeTag, viewY]);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' });
    return fmt.format(new Date(viewY, viewM, 1));
  }, [localeTag, viewY, viewM]);

  const cells = useMemo(() => {
    const firstDow = new Date(viewY, viewM, 1).getDay();
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const daysInPrev = new Date(viewY, viewM, 0).getDate();
    const out: { day: number; date: string; current: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) {
      const d = daysInPrev - firstDow + 1 + i;
      const prevM = new Date(viewY, viewM - 1, 1);
      out.push({ day: d, date: toDateString(prevM.getFullYear(), prevM.getMonth(), d), current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, date: toDateString(viewY, viewM, d), current: true });
    }
    let nextDay = 1;
    while (out.length % 7 !== 0) {
      const nextM = new Date(viewY, viewM + 1, 1);
      out.push({ day: nextDay, date: toDateString(nextM.getFullYear(), nextM.getMonth(), nextDay), current: false });
      nextDay++;
    }
    return out;
  }, [viewY, viewM]);

  const select = useCallback(
    (date: string) => {
      onSelect(date);
    },
    [onSelect],
  );

  const styles = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    card: { backgroundColor: palette.surface, borderRadius: radii.lg, width: '100%', maxWidth: 340, overflow: 'hidden', borderWidth: 1, borderColor: palette.border },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    headerTitle: { fontSize: 14, fontWeight: '600', color: palette.text },
    headerBtn: { padding: spacing.xs, borderRadius: radii.sm },
    navBtn: { padding: spacing.sm, borderRadius: radii.md },
    weekdayRow: { flexDirection: 'row' },
    weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
    weekdayText: { fontSize: 11, fontWeight: '600', color: palette.textMuted },
    gridRow: { flexDirection: 'row' },
    dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs },
    dayText: { fontSize: 13, color: palette.text },
    dayTextMuted: { fontSize: 13, color: palette.textMuted, opacity: 0.45 },
    dayTextSelected: { fontSize: 13, color: palette.textInverse, fontWeight: '700' },
    dayHalo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    todayBorder: { borderWidth: 1.5, borderColor: palette.primary },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    monthCell: { width: '25%', alignItems: 'center', paddingVertical: spacing.sm },
    monthText: { fontSize: 13, color: palette.text },
    monthTextSelected: { fontSize: 13, color: palette.textInverse, fontWeight: '700' },
    monthChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: palette.border, padding: spacing.md, gap: spacing.md },
    footerBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.md },
    footerBtnText: { fontSize: 13, fontWeight: '600' },
  }), [palette]);

  function renderDateView() {
    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setPicking('month')} activeOpacity={0.7}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{monthLabel}</Text>
              <Feather name="chevron-down" size={14} color={palette.textMuted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setViewM((m) => (m === 0 ? 11 : m - 1))} activeOpacity={0.6}>
              <Feather name="chevron-left" size={18} color={palette.primaryDark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => setViewM((m) => (m === 11 ? 0 : m + 1))} activeOpacity={0.6}>
              <Feather name="chevron-right" size={18} color={palette.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ paddingHorizontal: spacing.md }}>
          <View style={styles.weekdayRow}>
            {weekdayNames.map((w, i) => (
              <View key={i} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{w}</Text>
              </View>
            ))}
          </View>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <View key={row} style={styles.gridRow}>
              {cells.slice(row * 7, row * 7 + 7).map((c, i) => {
                const isSelected = c.date === initialDate;
                const isToday = c.date === today;
                return (
                  <TouchableOpacity key={i} style={styles.dayCell} onPress={() => select(c.date)} activeOpacity={0.7}>
                    <View style={[styles.dayHalo, isSelected && { backgroundColor: palette.primary }, isToday && !isSelected && styles.todayBorder]}>
                      <Text style={isSelected ? styles.dayTextSelected : c.current ? styles.dayText : styles.dayTextMuted}>{c.day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </>
    );
  }

  function renderYearView() {
    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setViewY((y) => y - 1)} activeOpacity={0.6}>
            <Feather name="chevron-left" size={18} color={palette.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{yearLabel}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => setViewY((y) => y + 1)} activeOpacity={0.6}>
            <Feather name="chevron-right" size={18} color={palette.primaryDark} />
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.gridRow}>
              {[0, 1, 2, 3].map((col) => {
                const y = viewY - 1 + row * 4 + col;
                const isSelected = parsed ? y === parsed.y : false;
                return (
                  <TouchableOpacity key={col} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm }} onPress={() => { setViewY(y); setPicking('month'); }} activeOpacity={0.7}>
                    <View style={[styles.monthChip, isSelected && { backgroundColor: palette.primary }]}>
                      <Text style={isSelected ? styles.monthTextSelected : styles.monthText}>{y}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </>
    );
  }

  function renderMonthView() {
    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setViewY((y) => y - 1)} activeOpacity={0.6}>
            <Feather name="chevron-left" size={18} color={palette.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setPicking('year')} activeOpacity={0.7}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{yearLabel}</Text>
              <Feather name="chevron-down" size={14} color={palette.textMuted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setViewY((y) => y + 1)} activeOpacity={0.6}>
            <Feather name="chevron-right" size={18} color={palette.primaryDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.monthGrid}>
          {monthNames.map((name, m) => {
            const isSelected = parsed ? viewY === parsed.y && m === parsed.m : false;
            return (
              <TouchableOpacity key={m} style={styles.monthCell} onPress={() => { setViewM(m); setPicking('date'); }} activeOpacity={0.7}>
                <View style={[styles.monthChip, isSelected && { backgroundColor: palette.primary }]}>
                  <Text style={isSelected ? styles.monthTextSelected : styles.monthText}>{name}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {picking === 'date' ? renderDateView() : picking === 'year' ? renderYearView() : renderMonthView()}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.footerBtnText, { color: palette.textMuted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            {picking !== 'date' ? (
              <TouchableOpacity style={styles.footerBtn} onPress={() => setPicking('date')} activeOpacity={0.7}>
                <Text style={[styles.footerBtnText, { color: palette.primary }]}>{t('common.ok')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
