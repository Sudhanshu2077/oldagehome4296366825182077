import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal, ScrollView, Platform } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface EventItem {
  id: string;
  title: string;
  titleMr: string;
  description: string;
  eventDate: string;
  photoUrl: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function istToday(): Date {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(get('year'), get('month') - 1, get('day'));
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export default function EventsScreen() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const today = useMemo(() => istToday(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [time, setTime] = useState({ hour: 9, minute: 0, period: 'AM' as 'AM' | 'PM' });

  const canCreate = user?.tier === 'institution' && (user?.role === 'institution-head' || user?.role === 'assistant-manager');

  const eventDateOnly = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of items) {
      const k = dayKey(new Date(ev.eventDate));
      const list = map.get(k) ?? [];
      list.push(ev);
      map.set(k, list);
    }
    return map;
  }, [items]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    screenTitle: { fontSize: 17, fontWeight: '700', color: palette.primaryDark },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    error: { color: palette.error, padding: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
    title: { fontSize: 15, fontWeight: '700', color: palette.primaryDark },
    date: { fontSize: 11, color: palette.textMuted, marginTop: spacing.xs },
    body: { fontSize: 13, color: palette.text, marginTop: spacing.md },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    fieldLabel: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14, color: palette.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },

    calendarCard: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md },
    calNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    calNavBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radii.sm, backgroundColor: palette.surfaceAlt },
    calNavBtnText: { fontSize: 16, fontWeight: '700', color: palette.primaryDark },
    calMonthLabel: { fontSize: 14, fontWeight: '700', color: palette.text },
    todayBtn: { alignSelf: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: palette.secondary, borderWidth: 1, borderColor: palette.primaryLight },
    todayBtnText: { fontSize: 12, fontWeight: '600', color: palette.primary },
    weekdayRow: { flexDirection: 'row' },
    weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
    weekdayLabel: { fontSize: 10, fontWeight: '600', color: palette.textMuted },
    dayRow: { flexDirection: 'row' },
    dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40, marginVertical: 1 },
    dayCellBlank: { flex: 1 },
    dayInner: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dayNumber: { fontSize: 13, color: palette.text },
    dayNumberMuted: { fontSize: 13, color: palette.textMuted },
    dayNumberToday: { fontSize: 13, fontWeight: '700', color: palette.textInverse },
    daySelected: { backgroundColor: palette.primary },
    dayToday: { backgroundColor: palette.secondary, borderWidth: 1, borderColor: palette.primaryLight },
    eventDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: palette.primary, marginTop: 2 },

    selectedDayTitle: { fontSize: 13, fontWeight: '700', color: palette.text, marginBottom: spacing.sm, marginTop: spacing.sm },

    timeSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
    timeColumn: { flex: 1 },
    timePickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 6, minWidth: 44, alignItems: 'center' },
    chipActive: { backgroundColor: palette.secondary, borderColor: palette.primaryLight },
    chipText: { fontSize: 13, color: palette.text },
    chipTextActive: { fontSize: 13, fontWeight: '700', color: palette.primary },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/events');
      setItems((res.data as { data: EventItem[] }).data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDayEvents = useMemo(() => {
    const k = dayKey(selectedDate);
    return eventDateOnly.get(k) ?? [];
  }, [selectedDate, eventDateOnly]);

  function openCreate(date: Date) {
    setSelectedDate(date);
    setForm({ title: '', titleMr: '', description: '' });
    setTime({ hour: 9, minute: 0, period: 'AM' });
    setModalOpen(true);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function prevYear() {
    setViewYear(viewYear - 1);
  }

  function nextYear() {
    setViewYear(viewYear + 1);
  }

  function goToday() {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    setSelectedDate(today);
  }

  function buildDays(): (number | null)[] {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  async function save() {
    if (!form.title?.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const hour24 = time.period === 'PM'
        ? (time.hour === 12 ? 12 : time.hour + 12)
        : (time.hour === 12 ? 0 : time.hour);
      const eventDate = new Date(Date.UTC(viewYear, viewMonth, selectedDate.getDate(), hour24, time.minute) - IST_OFFSET_MS).toISOString();
      await api.post('/events', { ...form, eventDate });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const days = buildDays();
  const weekRows: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weekRows.push(days.slice(i, i + 7));

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString(lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN', { month: 'long', year: 'numeric' });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{t('events.title')}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={{ padding: spacing.md }}
        data={selectedDayEvents}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <View>
            <View style={styles.calendarCard}>
              <View style={styles.calNavRow}>
                <TouchableOpacity style={styles.calNavBtn} onPress={prevYear} activeOpacity={0.7}>
                  <Text style={styles.calNavBtnText}>«</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.calNavBtn} onPress={prevMonth} activeOpacity={0.7}>
                  <Text style={styles.calNavBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.calMonthLabel}>{monthName}</Text>
                <TouchableOpacity style={styles.calNavBtn} onPress={nextMonth} activeOpacity={0.7}>
                  <Text style={styles.calNavBtnText}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.calNavBtn} onPress={nextYear} activeOpacity={0.7}>
                  <Text style={styles.calNavBtnText}>»</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.todayBtn} onPress={goToday} activeOpacity={0.7}>
                <Text style={styles.todayBtnText}>{t('events.today')}</Text>
              </TouchableOpacity>

              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((w) => (
                  <View key={w} style={styles.weekdayCell}>
                    <Text style={styles.weekdayLabel}>{w}</Text>
                  </View>
                ))}
              </View>

              {weekRows.map((row, ri) => (
                <View key={ri} style={styles.dayRow}>
                  {row.map((day, ci) => {
                    if (day === null) return <View key={ci} style={styles.dayCellBlank} />;
                    const d = new Date(viewYear, viewMonth, day);
                    const isToday = dayKey(d) === dayKey(today);
                    const isSelected = dayKey(d) === dayKey(selectedDate);
                    const hasEvents = eventDateOnly.has(dayKey(d));
                    return (
                      <TouchableOpacity
                        key={ci}
                        style={styles.dayCell}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedDate(d);
                          if (canCreate) openCreate(d);
                        }}
                      >
                        <View style={[styles.dayInner, isSelected ? styles.daySelected : isToday ? styles.dayToday : null]}>
                          <Text style={isSelected ? styles.dayNumberToday : isToday ? styles.dayNumberToday : styles.dayNumber}>{day}</Text>
                        </View>
                        <View style={[styles.eventDot, !hasEvents && { opacity: 0 }]} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <Text style={styles.selectedDayTitle}>
              {selectedDate.toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{t('events.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{lang === 'en' ? item.title : (item.titleMr || item.title)}</Text>
            <Text style={styles.date}>{new Date(item.eventDate).toLocaleString()}</Text>
            {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t('events.addFor')} {selectedDate.toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <ScrollView style={{ maxHeight: 480 }}>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.fieldLabel}>{t('events.eventTime')} *</Text>
                <View style={styles.timeSection}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.fieldLabel}>{t('events.hour')}</Text>
                    <View style={styles.timePickerRow}>
                      {HOURS.map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.chip, time.hour === h && styles.chipActive]}
                          onPress={() => setTime((prev) => ({ ...prev, hour: h }))}
                          activeOpacity={0.7}
                        >
                          <Text style={time.hour === h ? styles.chipTextActive : styles.chipText}>{h}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={[styles.timeColumn, { marginLeft: spacing.sm }]}>
                    <Text style={styles.fieldLabel}>{t('events.minute')}</Text>
                    <View style={styles.timePickerRow}>
                      {MINUTES.map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.chip, time.minute === m && styles.chipActive]}
                          onPress={() => setTime((prev) => ({ ...prev, minute: m }))}
                          activeOpacity={0.7}
                        >
                          <Text style={time.minute === m ? styles.chipTextActive : styles.chipText}>{pad(m)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.timePickerRow}>
                  {(['AM', 'PM'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.chip, time.period === p && styles.chipActive]}
                      onPress={() => setTime((prev) => ({ ...prev, period: p }))}
                      activeOpacity={0.7}
                    >
                      <Text style={time.period === p ? styles.chipTextActive : styles.chipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.fieldLabel}>{t('common.title')} *</Text>
                <TextInput
                  style={styles.input}
                  value={form.title ?? ''}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, title: v }))}
                  placeholder={t('common.title')}
                  placeholderTextColor={palette.textMuted}
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.fieldLabel}>{t('common.description')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description ?? ''}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, description: v }))}
                  placeholder={t('common.description')}
                  placeholderTextColor={palette.textMuted}
                  multiline
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void save()} disabled={saving}>
                {saving ? <ActivityIndicator color={palette.textInverse} /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}