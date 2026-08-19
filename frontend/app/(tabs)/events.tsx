import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Modal, Platform, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api, errorMessage } from '../../src/api/client';
import { tokenStorage } from '../../src/api/storage';
import { API_BASE_URL } from '../../src/config/env';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { CalendarPicker } from '../../src/components/CalendarPicker';

interface EventItem {
  id: string;
  title: string;
  titleMr: string;
  description: string;
  eventDate: string;
  photoUrl: string;
  photos: string[];
}

const HOURS_MIN = 1;
const HOURS_MAX = 12;
const MINUTE_STEP = 5;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function istNow(): Date {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute') % 60);
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export default function EventsScreen() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [view, setView] = useState<'options' | 'past'>('options');
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = istNow();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [time, setTime] = useState({ hour: 9, minute: 0, period: 'AM' as 'AM' | 'PM' });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const canCreate = user?.tier === 'institution' && (user?.role === 'institution-head' || user?.role === 'assistant-manager');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    screenTitle: { fontSize: 17, fontWeight: '700', color: palette.primaryDark },
    error: { color: palette.error, padding: spacing.md },
    scroll: { padding: spacing.md, paddingBottom: spacing.xl },
    optionCard: { backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.xl, marginBottom: spacing.lg, alignItems: 'center' },
    optionTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginTop: spacing.sm, textAlign: 'center' },
    optionSub: { fontSize: 12, color: palette.textMuted, marginTop: 4, textAlign: 'center' },
    optionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.backgroundSoft, alignItems: 'center', justifyContent: 'center' },
    optionIconText: { fontSize: 22, fontWeight: '700', color: palette.primary },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.sm, marginTop: spacing.sm },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: palette.border },
    title: { fontSize: 15, fontWeight: '700', color: palette.primaryDark },
    date: { fontSize: 11, color: palette.textMuted, marginTop: spacing.xs },
    body: { fontSize: 13, color: palette.text, marginTop: spacing.md },

    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 520 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    fieldLabel: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14, color: palette.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 9 : 12, backgroundColor: palette.surfaceAlt },
    dateButtonText: { fontSize: 14, color: palette.text },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },

    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    stepperColumn: { flex: 1, alignItems: 'center' },
    stepperLabel: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    stepperControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, backgroundColor: palette.surfaceAlt },
    stepperBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    stepperBtnText: { fontSize: 18, fontWeight: '700', color: palette.primary },
    stepperValue: { minWidth: 52, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
    periodRow: { flexDirection: 'row', gap: spacing.sm },
    periodBtn: { flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
    periodBtnActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    periodText: { fontSize: 13, color: palette.text },
    periodTextActive: { color: palette.textInverse, fontWeight: '700' },

    attachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    attachBtn: { flex: 1, borderWidth: 1, borderColor: palette.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: palette.backgroundSoft },
    attachText: { color: palette.primary, fontWeight: '600', fontSize: 13 },
    imagePreview: { width: 64, height: 64, borderRadius: radii.sm, marginTop: spacing.sm, marginRight: spacing.sm },

    chatContainer: { flex: 1 },
    chatScroll: { padding: spacing.md },
    dateDivider: { alignSelf: 'center', backgroundColor: palette.surfaceAlt, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4, marginVertical: spacing.sm },
    dateDividerText: { fontSize: 11, color: palette.textMuted },
    chatBubble: { backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '100%' },
    chatTitle: { fontSize: 15, fontWeight: '700', color: palette.primaryDark },
    chatHeld: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
    chatBody: { fontSize: 13, color: palette.text, marginTop: spacing.md },
    chatImages: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
    chatImage: { width: 72, height: 72, borderRadius: radii.sm },
    backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
    backText: { color: palette.primary, fontWeight: '600', fontSize: 13 },
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

  const upcoming = useMemo(() => {
    const now = Date.now() - IST_OFFSET_MS;
    return items.filter((ev) => new Date(ev.eventDate).getTime() > now).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [items]);

  const past = useMemo(() => {
    const now = Date.now() - IST_OFFSET_MS;
    return items.filter((ev) => new Date(ev.eventDate).getTime() <= now).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }, [items]);

  function openCreate() {
    setForm({ title: '', titleMr: '', description: '' });
    setTime({ hour: 9, minute: 0, period: 'AM' });
    setPendingFiles([]);
    const d = istNow();
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setModalOpen(true);
  }

  function stepHour(dir: 1 | -1) {
    setTime((prev) => {
      let h = prev.hour + dir;
      if (h < HOURS_MIN) h = HOURS_MAX;
      if (h > HOURS_MAX) h = HOURS_MIN;
      return { ...prev, hour: h };
    });
  }

  function stepMinute(dir: 1 | -1) {
    setTime((prev) => {
      let m = prev.minute + dir * MINUTE_STEP;
      if (m < 0) m = 60 - MINUTE_STEP;
      if (m >= 60) m = 0;
      return { ...prev, minute: m };
    });
  }

  function pickImages() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.multiple = true;
    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : [];
      setPendingFiles((prev) => [...prev, ...files]);
    };
    input.click();
  }

  async function uploadImages(eventId: string) {
    const token = await tokenStorage.getItem('accessToken');
    for (const file of pendingFiles) {
      const fd = new FormData();
      fd.append('file', file);
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/events/${eventId}/images`, { method: 'POST', headers, body: fd });
      if (!res.ok) throw new Error('image upload failed');
    }
  }

  async function save() {
    if (!form.title?.trim()) {
      setError(t('events.titleRequired'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      setError(t('events.dateFormat'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const hour24 = time.period === 'PM'
        ? (time.hour === 12 ? 12 : time.hour + 12)
        : (time.hour === 12 ? 0 : time.hour);
      const parts = selectedDate.split('-').map(Number);
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) throw new Error('invalid date');
      const y = parts[0] as number;
      const m = parts[1] as number;
      const d = parts[2] as number;
      const eventDate = new Date(Date.UTC(y, m - 1, d, hour24, time.minute) - IST_OFFSET_MS).toISOString();
      const created = (await api.post('/events', { ...form, eventDate })).data as { data: { id: string } };
      if (pendingFiles.length > 0) {
        await uploadImages(created.data.id);
      }
      setModalOpen(false);
      setPendingFiles([]);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function formatEventDate(iso: string): string {
    const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
    return d.toLocaleString(lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function formatHeldDate(iso: string): string {
    const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
    return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  if (view === 'past') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>{t('events.pastEvents')}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <ScrollView style={styles.chatContainer} contentContainerStyle={styles.chatScroll}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setView('options')}>
            <Text style={styles.backText}>{t('events.backToOptions')} ‹</Text>
          </TouchableOpacity>
          {past.length === 0 ? <Text style={styles.empty}>{t('events.noPastEvents')}</Text> : null}
          {past.map((ev) => (
            <View key={ev.id}>
              <View style={styles.dateDivider}>
                <Text style={styles.dateDividerText}>{formatHeldDate(ev.eventDate)}</Text>
              </View>
              <View style={styles.chatBubble}>
                <Text style={styles.chatTitle}>{lang === 'mr' ? (ev.titleMr || ev.title) : ev.title}</Text>
                <Text style={styles.chatHeld}>{t('events.heldOn')}: {formatEventDate(ev.eventDate)}</Text>
                {ev.description ? <Text style={styles.chatBody}>{ev.description}</Text> : null}
                {ev.photos.length > 0 ? (
                  <View style={styles.chatImages}>
                    {ev.photos.map((p, i) => (
                      <EventImage key={i} url={p} />
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{t('events.title')}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView style={styles.scroll}>
        <TouchableOpacity style={styles.optionCard} onPress={openCreate} activeOpacity={0.8}>
          <View style={styles.optionIcon}><Text style={styles.optionIconText}>+</Text></View>
          <Text style={styles.optionTitle}>{t('events.addUpcoming')}</Text>
          <Text style={styles.optionSub}>{t('events.eventTime')} · {t('events.attachImages')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setView('past')} activeOpacity={0.8}>
          <View style={styles.optionIcon}><Text style={styles.optionIconText}>≡</Text></View>
          <Text style={styles.optionTitle}>{t('events.checkPast')}</Text>
          <Text style={styles.optionSub}>{t('events.heldOn')} · {t('events.pastEvents')}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>{t('events.upcomingEvents')}</Text>
        {upcoming.length === 0 ? <Text style={styles.empty}>{t('events.empty')}</Text> : null}
        {upcoming.map((ev) => (
          <View key={ev.id} style={styles.card}>
            <Text style={styles.title}>{lang === 'mr' ? (ev.titleMr || ev.title) : ev.title}</Text>
            <Text style={styles.date}>{formatEventDate(ev.eventDate)}</Text>
            {ev.description ? <Text style={styles.body}>{ev.description}</Text> : null}
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('events.addUpcoming')}</Text>
            <ScrollView style={{ maxHeight: 520 }}>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.fieldLabel}>{t('events.eventDate')} *</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
                  <Text style={styles.dateButtonText}>{selectedDate}</Text>
                  <Feather name="calendar" size={16} color={palette.primary} />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.fieldLabel}>{t('events.eventTime')} *</Text>
                <View style={styles.stepperRow}>
                  <View style={styles.stepperColumn}>
                    <Text style={styles.stepperLabel}>{t('events.hour')}</Text>
                    <View style={styles.stepperControl}>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => stepHour(-1)} activeOpacity={0.7}>
                        <Text style={styles.stepperBtnText}>‹</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{pad(time.hour)}</Text>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => stepHour(1)} activeOpacity={0.7}>
                        <Text style={styles.stepperBtnText}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.stepperColumn}>
                    <Text style={styles.stepperLabel}>{t('events.minute')}</Text>
                    <View style={styles.stepperControl}>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => stepMinute(-1)} activeOpacity={0.7}>
                        <Text style={styles.stepperBtnText}>‹</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{pad(time.minute)}</Text>
                      <TouchableOpacity style={styles.stepperBtn} onPress={() => stepMinute(1)} activeOpacity={0.7}>
                        <Text style={styles.stepperBtnText}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={styles.periodRow}>
                  {((['AM', 'PM'] as const).map((p) => ({ p, label: p === 'AM' ? t('events.am') : t('events.pm') }))).map(({ p, label }) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.periodBtn, time.period === p && styles.periodBtnActive]}
                      onPress={() => setTime((prev) => ({ ...prev, period: p }))}
                      activeOpacity={0.7}
                    >
                      <Text style={time.period === p ? styles.periodTextActive : styles.periodText}>{label}</Text>
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

              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.fieldLabel}>{t('events.attachImages')}</Text>
                <View style={styles.attachRow}>
                  <TouchableOpacity style={styles.attachBtn} onPress={pickImages} activeOpacity={0.7}>
                    <Text style={styles.attachText}>{t('events.attachImages')}</Text>
                  </TouchableOpacity>
                </View>
                {pendingFiles.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
                    {pendingFiles.map((f, i) => (
                      <Image key={i} source={{ uri: URL.createObjectURL(f) }} style={styles.imagePreview} />
                    ))}
                  </View>
                ) : null}
                {saving && pendingFiles.length > 0 ? <Text style={styles.fieldLabel}>{t('events.uploadingImages')}</Text> : null}
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
      <CalendarPicker
        visible={pickerOpen}
        initialDate={selectedDate}
        locale={lang}
        onClose={() => setPickerOpen(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

function EventImage({ url }: { url: string }) {
  const { palette } = useTheme();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await tokenStorage.getItem('accessToken');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}${url}`, { headers });
        if (!res.ok) throw new Error('image fetch failed');
        const blob = await res.blob();
        if (cancelled) return;
        setSrc(URL.createObjectURL(blob));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) return null;
  if (!src) {
    return (
      <View style={[stylesPlaceholder.image, { backgroundColor: palette.surfaceAlt }]}>
        <ActivityIndicator size="small" color={palette.primary} />
      </View>
    );
  }
  return <Image source={{ uri: src }} style={stylesPlaceholder.image} />;
}

const stylesPlaceholder = StyleSheet.create({
  image: { width: 72, height: 72, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});