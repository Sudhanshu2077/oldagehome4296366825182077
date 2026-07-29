import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { io, type Socket } from 'socket.io-client';
import { api, errorMessage } from '../../src/api/client';
import { API_BASE_URL } from '../../src/config/env';
import { tokenStorage } from '../../src/api/storage';
import { useAuth } from '../../src/auth/AuthContext';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface RegisterEntry {
  id: string;
  register: string;
  entryNumber: string;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const FIELD_DEFS: Record<string, { key: string; label: string }[]> = {
  R1: [{ key: 'date', label: 'Date' }, { key: 'residentName', label: 'Resident Name' }, { key: 'age', label: 'Age' }, { key: 'guardian', label: 'Guardian' }, { key: 'notes', label: 'Notes' }],
  R2: [{ key: 'date', label: 'Date' }, { key: 'residentName', label: 'Resident Name' }, { key: 'reason', label: 'Reason' }, { key: 'notes', label: 'Notes' }],
  R3: [{ key: 'date', label: 'Date' }, { key: 'residentName', label: 'Resident Name' }, { key: 'diagnosis', label: 'Diagnosis' }, { key: 'doctor', label: 'Doctor' }, { key: 'notes', label: 'Notes' }],
  R4: [{ key: 'date', label: 'Date' }, { key: 'medicine', label: 'Medicine' }, { key: 'quantity', label: 'Quantity' }, { key: 'residentName', label: 'Resident' }, { key: 'notes', label: 'Notes' }],
  R5: [{ key: 'date', label: 'Date' }, { key: 'meal', label: 'Meal' }, { key: 'menu', label: 'Menu' }, { key: 'notes', label: 'Notes' }],
  R6: [{ key: 'date', label: 'Date' }, { key: 'visitorName', label: 'Visitor' }, { key: 'residentName', label: 'Resident' }, { key: 'purpose', label: 'Purpose' }],
  R7: [{ key: 'date', label: 'Date' }, { key: 'donor', label: 'Donor' }, { key: 'amount', label: 'Amount' }, { key: 'type', label: 'Type' }, { key: 'notes', label: 'Notes' }],
  R8: [{ key: 'date', label: 'Date' }, { key: 'particulars', label: 'Particulars' }, { key: 'amount', label: 'Amount' }, { key: 'approvedBy', label: 'Approved By' }],
  R9: [{ key: 'date', label: 'Date' }, { key: 'staffName', label: 'Staff' }, { key: 'shift', label: 'Shift' }, { key: 'status', label: 'Status' }],
  R10: [{ key: 'date', label: 'Date' }, { key: 'item', label: 'Item' }, { key: 'quantity', label: 'Qty' }, { key: 'condition', label: 'Condition' }],
  R11: [{ key: 'date', label: 'Date' }, { key: 'complainant', label: 'Complainant' }, { key: 'complaint', label: 'Complaint' }, { key: 'status', label: 'Status' }],
  R12: [{ key: 'date', label: 'Date' }, { key: 'residentName', label: 'Resident' }, { key: 'cause', label: 'Cause' }, { key: 'notes', label: 'Notes' }],
  R13: [{ key: 'date', label: 'Date' }, { key: 'particulars', label: 'Particulars' }, { key: 'notes', label: 'Notes' }],
};

export default function RegisterEntriesScreen() {
  const params = useLocalSearchParams<{ id: string; title?: string }>();
  const registerId = (params.id ?? 'R1').toUpperCase();
  const { user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RegisterEntry | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fields = useMemo(() => FIELD_DEFS[registerId] ?? FIELD_DEFS.R13 ?? [], [registerId]);

  const canWrite = user?.role === 'assistant-manager' || user?.role === 'department-user' || user?.role === 'institution-head';

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    title: { fontSize: 17, fontWeight: '700', color: palette.primaryDark },
    addButton: { backgroundColor: palette.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    addButtonText: { color: palette.textInverse, fontWeight: '600', fontSize: 13 },
    error: { color: palette.error, paddingHorizontal: spacing.md },
    empty: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
    headRow: { backgroundColor: palette.secondary, borderTopWidth: 1, borderTopColor: palette.border },
    cell: { width: 140, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, fontSize: 13, color: palette.text },
    headCell: { fontWeight: '700', color: palette.primaryDark, fontSize: 12 },
    action: { color: palette.primary, fontWeight: '600', fontSize: 13 },
    actionDelete: { color: palette.error, fontWeight: '600', fontSize: 13 },
    modalBackdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 460 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: palette.primaryDark, marginBottom: spacing.md },
    fieldLabel: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14, color: palette.text, backgroundColor: palette.backgroundSoft },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    cancelText: { color: palette.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    saveText: { color: palette.textInverse, fontWeight: '600' },
  }), [palette]);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/registers/${registerId}/entries`, { params: { pageSize: 100 } });
      setEntries((res.data as { data: RegisterEntry[] }).data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [registerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let socket: Socket | null = null;
    void (async () => {
      const token = await tokenStorage.getItem('accessToken');
      if (!token) return;
      socket = io(`${API_BASE_URL}/registers`, { auth: { token }, transports: ['websocket', 'polling'] });
      socket.on('register:changed', (payload: { register?: string }) => {
        if (payload?.register === registerId) void load();
      });
    })();
    return () => {
      socket?.disconnect();
    };
  }, [registerId, load]);

  function openCreate() {
    setEditing(null);
    setForm({});
    setModalOpen(true);
  }

  function openEdit(entry: RegisterEntry) {
    setEditing(entry);
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = String(entry.fields[f.key] ?? '');
    setForm(next);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/registers/entries/${editing.id}`, { fields: form });
      } else {
        await api.post(`/registers/${registerId}/entries`, { fields: form });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: RegisterEntry) {
    try {
      await api.delete(`/registers/entries/${entry.id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{params.title ?? registerId}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>{t('register.newEntry')}</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView horizontal>
        <View>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.cell, styles.headCell, { width: 150 }]}>{t('register.entryNo')}</Text>
            {fields.map((f) => (
              <Text key={f.key} style={[styles.cell, styles.headCell]}>{f.label}</Text>
            ))}
            {canWrite ? <Text style={[styles.cell, styles.headCell, { width: 130 }]}>{t('register.actions')}</Text> : null}
          </View>
          <FlatList
            data={entries}
            keyExtractor={(e) => e.id}
            ListEmptyComponent={<Text style={styles.empty}>{t('register.noEntries')}</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={[styles.cell, { width: 150 }]}>{item.entryNumber}</Text>
                {fields.map((f) => (
                  <Text key={f.key} style={styles.cell}>{String(item.fields[f.key] ?? '')}</Text>
                ))}
                {canWrite ? (
                  <View style={[styles.cell, { width: 130, flexDirection: 'row', gap: 12 }]}>
                    <TouchableOpacity onPress={() => openEdit(item)}><Text style={styles.action}>{t('register.edit')}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => void remove(item)}><Text style={styles.actionDelete}>{t('register.delete')}</Text></TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )}
          />
        </View>
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? t('register.editEntry') : t('register.newEntry')}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {fields.map((f) => (
                <View key={f.key} style={{ marginBottom: spacing.md }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key] ?? ''}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                    placeholder={f.label}
                    placeholderTextColor={palette.textMuted}
                  />
                </View>
              ))}
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