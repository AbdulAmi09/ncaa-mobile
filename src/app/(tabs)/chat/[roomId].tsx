import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinTouchTarget, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  type ChatMessage,
  type ChatRoom,
  displayNameFor,
  fetchProfilesMap,
  markRoomAsRead,
  messagePreview,
  otherParticipantId,
} from '@/lib/chat';
import { supabase } from '@/lib/supabase';

export default function ChatThreadScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [title, setTitle] = useState('Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!roomId || !userId) return;
    let cancelled = false;

    (async () => {
      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select('id, name, room_type, is_direct_message, direct_message_with, created_by')
        .eq('id', roomId)
        .single<ChatRoom>();
      if (!roomData || cancelled) return;
      setRoom(roomData);

      const { data: messageRows } = await supabase
        .from('chat_messages')
        .select('id, room_id, content, created_at, sender_id, message_type, is_deleted')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(50);
      const ordered = [...(messageRows ?? [])].reverse() as ChatMessage[];

      const senderIds = Array.from(new Set(ordered.map((m) => m.sender_id)));
      const otherId = otherParticipantId(roomData, userId);
      const profileMap = await fetchProfilesMap(otherId ? [...senderIds, otherId] : senderIds);

      if (cancelled) return;
      setTitle(roomData.is_direct_message ? displayNameFor(profileMap[otherId ?? '']) : roomData.name);
      const names: Record<string, string> = {};
      Object.values(profileMap).forEach((p) => {
        names[p.id] = displayNameFor(p);
      });
      setSenderNames(names);
      setMessages(ordered);
      setLoading(false);
      markRoomAsRead(userId, roomId);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, userId]);

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (!senderNames[newMsg.sender_id] && newMsg.sender_id !== userId) {
            const map = await fetchProfilesMap([newMsg.sender_id]);
            setSenderNames((prev) => ({ ...prev, [newMsg.sender_id]: displayNameFor(map[newMsg.sender_id]) }));
          }
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          if (newMsg.sender_id !== userId) markRoomAsRead(userId, roomId);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // senderNames intentionally excluded: re-subscribing on every profile
    // resolution would tear down and recreate the realtime channel constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !roomId || !userId) return;
    setSending(true);
    setDraft('');
    const { error } = await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: userId,
      content: text,
      message_type: 'text',
    });
    setSending(false);
    if (error) setDraft(text);
  }, [draft, roomId, userId]);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          {loading ? (
            <ActivityIndicator style={styles.flex} size="large" />
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messages}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item, index }) => {
                const isOwn = item.sender_id === userId;
                const showSender =
                  !isOwn && room?.is_direct_message === false && (index === 0 || messages[index - 1].sender_id !== item.sender_id);
                const isPlainText = item.message_type === 'text' && !item.is_deleted;
                return (
                  <ThemedView style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
                    <ThemedView
                      style={[
                        styles.bubble,
                        { backgroundColor: isOwn ? theme.primary : theme.backgroundElement },
                      ]}>
                      {showSender && (
                        <ThemedText type="small" style={[styles.senderName, { color: theme.primary }]}>
                          {senderNames[item.sender_id] ?? 'Unknown'}
                        </ThemedText>
                      )}
                      <ThemedText style={{ color: isOwn ? theme.primaryText : theme.text }}>
                        {isPlainText ? item.content : messagePreview(item)}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                );
              }}
              ListEmptyComponent={
                <ThemedView style={styles.emptyThread}>
                  <ThemedText themeColor="textSecondary">Say hello — no messages here yet.</ThemedText>
                </ThemedView>
              }
            />
          )}

          <ThemedView style={[styles.inputRow, { borderTopColor: theme.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            />
            <Pressable
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              style={[
                styles.sendButton,
                { backgroundColor: theme.primary, opacity: !draft.trim() || sending ? 0.5 : 1 },
              ]}>
              <Ionicons name="send" size={20} color={theme.primaryText} />
            </Pressable>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: Spacing.three, gap: Spacing.two },
  emptyThread: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  senderName: { marginBottom: 2, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 18,
    maxHeight: 120,
  },
  sendButton: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    borderRadius: MinTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
