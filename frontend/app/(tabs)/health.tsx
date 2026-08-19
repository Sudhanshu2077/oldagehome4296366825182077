import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface Resident {
  id: string;
  fullName: string;
  residentNumber: string;
  gender?: string;
  age?: number;
}

interface Vital {
  id: string;
  residentId: string;
  temperature?: number;
  pulse?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  sugar?: number;
  weight?: number;
  recordedAt: string;
}

interface VitalsSummary {
  residentId: string;
  temperature?: number | undefined;
  pulse?: number | undefined;
  bpSystolic?: number | undefined;
  bpDiastolic?: number | undefined;
  sugar?: number | undefined;
  weight?: number | undefined;
  lastRecordedAt?: string | undefined;
}

export default function HealthMonitoringScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [form, setForm] = useState({
    temperature: '',
    pulse: '',
    bpSystolic: '',
    bpDiastolic: '',
    sugar: '',
    weight: '',
    recordedAt: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    header: { padding: spacing.md, paddingBottom: 0 },
    heading: { fontSize: 18, fontWeight: '700', color: palette.primaryDark },
    subheading: { fontSize: 12, color: palette.textMuted },
    reportBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
    reportChip: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    reportChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    reportChipText: { color: palette.text, fontSize: 13 },
    reportChipTextActive: { color: palette.textInverse, fontWeight: '600' },
    reportButton: { backgroundColor: palette.primaryDark, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginLeft: 'auto' },
    reportButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    card: { backgroundColor: palette.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: palette.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
    cardName: { fontSize: 15, fontWeight: '600', color: palette.text },
    cardMeta: { fontSize: 12, color: palette.textMuted, marginTop: spacing.xs },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 12 },
    vitalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    lastRecorded: { fontSize: 11, color: palette.textMuted, marginTop: spacing.sm },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: spacing.xl },
    error: { color: palette.error, marginHorizontal: spacing.md, marginBottom: spacing.sm },
    success: { color: palette.success, marginHorizontal: spacing.md, marginBottom: spacing.sm },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    fieldLabel: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: 14, color: palette.text, marginBottom: spacing.md },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
  }), [palette]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [residentsRes, vitalsRes] = await Promise.all([
        api.get('/m/residents', { params: { pageSize: 200 } }),
        api.get('/health-monitoring/vitals', { params: { pageSize: 500 } }),
      ]);
      setResidents((residentsRes.data as { data: Resident[] }).data ?? []);
      setVitals((vitalsRes.data as { data: Vital[] }).data ?? []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function summaryFor(residentId: string): VitalsSummary {
    const rows = vitals.filter((v) => v.residentId === residentId).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const latest = rows[0];
    return {
      residentId,
      temperature: latest?.temperature,
      pulse: latest?.pulse,
      bpSystolic: latest?.bpSystolic,
      bpDiastolic: latest?.bpDiastolic,
      sugar: latest?.sugar,
      weight: latest?.weight,
      lastRecordedAt: latest?.recordedAt,
    };
  }

  function openAddVitals(resident: Resident) {
    setSelectedResident(resident);
    setForm({
      temperature: '',
      pulse: '',
      bpSystolic: '',
      bpDiastolic: '',
      sugar: '',
      weight: '',
      recordedAt: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  async function submitVitals() {
    if (!selectedResident) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/health-monitoring/vitals', {
        residentId: selectedResident.id,
        temperature: form.temperature ? Number(form.temperature) : undefined,
        pulse: form.pulse ? Number(form.pulse) : undefined,
        bpSystolic: form.bpSystolic ? Number(form.bpSystolic) : undefined,
        bpDiastolic: form.bpDiastolic ? Number(form.bpDiastolic) : undefined,
        sugar: form.sugar ? Number(form.sugar) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        recordedAt: form.recordedAt,
      });
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function generateReport() {
    setLoading(true);
    setReportMessage(null);
    setError(null);
    try {
      await api.post('/health-monitoring/reports/generate', { type: reportType });
      setReportMessage(t('health.reportGenerated').replace('{type}', reportType === 'weekly' ? t('health.weekly') : t('health.monthly')));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (loading && residents.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>{t('health.title')}</Text>
          <Text style={styles.subheading}>{t('health.subheading')}</Text>
        </View>
      </View>

      <View style={styles.reportBar}>
        <TouchableOpacity
          style={[styles.reportChip, reportType === 'weekly' && styles.reportChipActive]}
          onPress={() => setReportType('weekly')}
        >
          <Text style={[styles.reportChipText, reportType === 'weekly' && styles.reportChipTextActive]}>{t('health.weekly')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reportChip, reportType === 'monthly' && styles.reportChipActive]}
          onPress={() => setReportType('monthly')}
        >
          <Text style={[styles.reportChipText, reportType === 'monthly' && styles.reportChipTextActive]}>{t('health.monthly')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reportButton} onPress={() => void generateReport()} disabled={loading}>
          <Text style={styles.reportButtonText}>{t('health.generateReport')}</Text>
        </TouchableOpacity>
      </View>

      {reportMessage ? <Text style={styles.success}>{reportMessage}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={residents}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        refreshing={loading}
        onRefresh={() => void loadData()}
        ListEmptyComponent={<Text style={styles.empty}>{t('health.noResidents')}</Text>}
        renderItem={({ item }) => {
          const s = summaryFor(item.id);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardName}>{item.fullName}</Text>
                  <Text style={styles.cardMeta}>{item.residentNumber} · {item.gender ?? '—'} · {item.age ?? '—'} {t('health.yrs')}</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => openAddVitals(item)}>
                  <Text style={styles.addButtonText}>{t('health.addVitals')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.vitalsRow}>
                <VitalBadge label={t('health.temp')} value={s.temperature ? `${s.temperature} °C` : '—'} />
                <VitalBadge label={t('health.pulse')} value={s.pulse ? `${s.pulse} bpm` : '—'} />
                <VitalBadge label={t('health.bp')} value={s.bpSystolic && s.bpDiastolic ? `${s.bpSystolic}/${s.bpDiastolic}` : '—'} />
                <VitalBadge label={t('health.sugar')} value={s.sugar ? `${s.sugar} mg/dL` : '—'} />
                <VitalBadge label={t('health.weight')} value={s.weight ? `${s.weight} kg` : '—'} />
              </View>

              {s.lastRecordedAt ? <Text style={styles.lastRecorded}>{t('health.lastRecorded')}: {new Date(s.lastRecordedAt).toLocaleDateString()}</Text> : null}
            </View>
          );
        }}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('health.addVitals')} — {selectedResident?.fullName}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.fieldLabel}>{t('common.date')}</Text>
              <TextInput
                style={styles.input}
                value={form.recordedAt}
                onChangeText={(v) => setForm((p) => ({ ...p, recordedAt: v }))}
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.fieldLabel}>{t('health.temperature')}</Text>
              <TextInput
                style={styles.input}
                value={form.temperature}
                onChangeText={(v) => setForm((p) => ({ ...p, temperature: v }))}
                keyboardType="numeric"
                placeholder="36.6"
              />
              <Text style={styles.fieldLabel}>{t('health.pulseField')}</Text>
              <TextInput
                style={styles.input}
                value={form.pulse}
                onChangeText={(v) => setForm((p) => ({ ...p, pulse: v }))}
                keyboardType="numeric"
                placeholder="72"
              />
              <Text style={styles.fieldLabel}>{t('health.bpSystolic')}</Text>
              <TextInput
                style={styles.input}
                value={form.bpSystolic}
                onChangeText={(v) => setForm((p) => ({ ...p, bpSystolic: v }))}
                keyboardType="numeric"
                placeholder="120"
              />
              <Text style={styles.fieldLabel}>{t('health.bpDiastolic')}</Text>
              <TextInput
                style={styles.input}
                value={form.bpDiastolic}
                onChangeText={(v) => setForm((p) => ({ ...p, bpDiastolic: v }))}
                keyboardType="numeric"
                placeholder="80"
              />
              <Text style={styles.fieldLabel}>{t('health.sugarField')}</Text>
              <TextInput
                style={styles.input}
                value={form.sugar}
                onChangeText={(v) => setForm((p) => ({ ...p, sugar: v }))}
                keyboardType="numeric"
                placeholder="100"
              />
              <Text style={styles.fieldLabel}>{t('health.weightField')}</Text>
              <TextInput
                style={styles.input}
                value={form.weight}
                onChangeText={(v) => setForm((p) => ({ ...p, weight: v }))}
                keyboardType="numeric"
                placeholder="65"
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => void submitVitals()} disabled={saving}>
                {saving ? <ActivityIndicator color={palette.textInverse} /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function VitalBadge({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    vitalBadge: { backgroundColor: palette.secondary, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: 70, alignItems: 'center', marginBottom: spacing.xs },
    vitalValue: { fontSize: 14, fontWeight: '700', color: palette.primaryDark },
    vitalLabel: { fontSize: 10, color: palette.textMuted, marginTop: 2 },
  }), [palette]);
  return (
    <View style={styles.vitalBadge}>
      <Text style={styles.vitalValue}>{value}</Text>
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
  );
}