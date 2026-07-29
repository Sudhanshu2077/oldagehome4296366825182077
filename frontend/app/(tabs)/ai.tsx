import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { api, errorMessage } from '../../src/api/client';
import { spacing, radii } from '../../src/config/theme';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function AiScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: t('ai.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    bubble: { maxWidth: '80%', borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
    userBubble: { backgroundColor: palette.primary, alignSelf: 'flex-end' },
    assistantBubble: { backgroundColor: palette.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: palette.border },
    bubbleText: { fontSize: 14, color: palette.text },
    userText: { color: palette.textInverse },
    inputRow: { flexDirection: 'row', padding: spacing.sm, backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border },
    input: { flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14, backgroundColor: palette.background, color: palette.text },
    sendButton: { backgroundColor: palette.primary, borderRadius: radii.sm, paddingHorizontal: spacing.lg, marginLeft: spacing.sm, alignItems: 'center', justifyContent: 'center' },
    sendText: { color: palette.textInverse, fontWeight: '600' },
  }), [palette]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await api.post('/ai/ask', { query: q });
      const reply = (res.data as { data?: { answer?: string } }).data?.answer ?? 'No response';
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Error: ' + errorMessage(err) }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.text}</Text>
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: spacing.md }} color={palette.primary} /> : null}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('ai.placeholder')}
          placeholderTextColor={palette.textMuted}
          onSubmitEditing={() => void send()}
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => void send()} disabled={loading || !input.trim()}>
          <Text style={styles.sendText}>{t('ai.send')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}