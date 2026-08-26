import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImageLightbox } from '@/components/chat/image-lightbox';
import { MessageActionsSheet } from '@/components/chat/message-actions-sheet';
import { VideoBubble } from '@/components/chat/video-bubble';
import { VoiceBubble } from '@/components/chat/voice-bubble';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  type ChatMessage,
  type ChatRoom,
  type ReactionGroup,
  deleteMessage,
  displayNameFor,
  editMessage,
  fetchProfilesMap,
  fetchReactions,
  markRoomAsRead,
  messagePreview,
  otherParticipantId,
  toggleReaction,
} from '@/lib/chat';
import { pickAndUploadChatMedia, resolveSignedChatMediaUrl, uploadVoiceMessage } from '@/lib/chat-media';
import { supabase } from '@/lib/supabase';
import { useVoiceRecorder } from '@/lib/use-voice-recorder';

const MESSAGE_COLUMNS =
  'id, room_id, content, created_at, sender_id, message_type, file_url, file_name, file_size, duration, is_deleted, is_edited';

function formatRecordingTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ChatThreadScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const recorder = useVoiceRecorder();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [title, setTitle] = useState('Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [errorText, setErrorText] = useState('');
  const [reactions, setReactions] = useState<Record<string, ReactionGroup[]>>({});
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

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
        .select(MESSAGE_COLUMNS)
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
      setReactions(await fetchReactions(ordered.map((m) => m.id)));
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        setMessages((prev) => {
          if (prev.length > 0) fetchReactions(prev.map((m) => m.id)).then(setReactions);
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // senderNames intentionally excluded: re-subscribing on every profile
    // resolution would tear down and recreate the realtime channel constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  // Resolve signed URLs for any media messages, same pattern as the web
  // chat: chat-files/chat-uploads are private buckets, so the stored
  // getPublicUrl() string 404s until swapped for a real signed URL.
  useEffect(() => {
    const targets = messages.filter((m) => m.file_url && !resolvedUrls[m.file_url]);
    if (targets.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        targets.map(async (m) => {
          updates[m.file_url!] = await resolveSignedChatMediaUrl(m.file_url!);
        }),
      );
      if (!cancelled) setResolvedUrls((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, resolvedUrls]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !roomId || !userId) return;

    if (editingMessageId) {
      setSending(true);
      const { error } = await editMessage(editingMessageId, userId, text);
      setSending(false);
      if (!error) {
        setDraft('');
        setEditingMessageId(null);
      }
      return;
    }

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
  }, [draft, roomId, userId, editingMessageId]);

  function cancelEditing() {
    setEditingMessageId(null);
    setDraft('');
  }

  async function handleAttach() {
    if (!roomId || !userId) return;
    setErrorText('');
    setSendingMedia(true);
    const { media, error } = await pickAndUploadChatMedia(userId, roomId);
    setSendingMedia(false);
    if (error) {
      setErrorText(error);
      return;
    }
    if (!media) return;

    const label = media.messageType === 'video' ? `[Video: ${media.fileName}]` : `[Image: ${media.fileName}]`;
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: userId,
      content: label,
      message_type: media.messageType,
      file_url: media.fileUrl,
      file_name: media.fileName,
      file_size: media.fileSize,
    });
  }

  async function handleMicPress() {
    if (recorder.isRecording) {
      const { uri, durationSeconds } = await recorder.stop();
      if (!uri || !roomId || !userId) return;
      setSendingMedia(true);
      const { media, error } = await uploadVoiceMessage(userId, roomId, uri, durationSeconds);
      setSendingMedia(false);
      if (error) {
        setErrorText(error);
        return;
      }
      if (!media) return;
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: userId,
        content: '[Voice Message]',
        message_type: 'voice',
        file_url: media.fileUrl,
        file_name: media.fileName,
        file_size: media.fileSize,
        duration: media.duration,
      });
    } else {
      setErrorText('');
      const started = await recorder.start();
      if (!started && recorder.error) setErrorText(recorder.error);
    }
  }

  async function handleReact(emoji: string) {
    if (!actionsFor || !userId) return;
    const messageId = actionsFor.id;
    setActionsFor(null);
    const existing = reactions[messageId]?.find((r) => r.emoji === emoji);
    const alreadyReacted = existing?.userIds.includes(userId) ?? false;
    await toggleReaction(messageId, userId, emoji, alreadyReacted);
    setReactions(await fetchReactions(messages.map((m) => m.id)));
  }

  function handleEditFromSheet() {
    if (!actionsFor) return;
    setEditingMessageId(actionsFor.id);
    setDraft(actionsFor.content);
    setActionsFor(null);
  }

  function handleDeleteFromSheet() {
    if (!actionsFor || !userId) return;
    const target = actionsFor;
    setActionsFor(null);
    Alert.alert('Delete message?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMessage(target.id, userId);
          setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, is_deleted: true, content: '' } : m)));
        },
      },
    ]);
  }

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
                const resolvedUrl = item.file_url ? resolvedUrls[item.file_url] : null;
                const messageReactions = reactions[item.id] ?? [];

                return (
                  <ThemedView style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
                    <Pressable
                      onLongPress={() => !item.is_deleted && setActionsFor(item)}
                      style={[
                        styles.bubble,
                        item.message_type === 'image' && styles.mediaBubble,
                        { backgroundColor: isOwn ? theme.primary : theme.backgroundElement },
                      ]}>
                      {showSender && (
                        <ThemedText type="small" style={[styles.senderName, { color: theme.primary }]}>
                          {senderNames[item.sender_id] ?? 'Unknown'}
                        </ThemedText>
                      )}
                      <MessageBody
                        item={item}
                        resolvedUrl={resolvedUrl}
                        isOwn={isOwn}
                        theme={theme}
                        onImagePress={() => resolvedUrl && setLightboxUri(resolvedUrl)}
                      />
                      {item.is_edited && !item.is_deleted && (
                        <ThemedText
                          type="small"
                          style={{ color: isOwn ? theme.primaryText : theme.textSecondary, opacity: 0.7 }}>
                          edited
                        </ThemedText>
                      )}
                    </Pressable>
                    {messageReactions.length > 0 && (
                      <ThemedView style={styles.reactionsRow}>
                        {messageReactions.map((r) => (
                          <ThemedView key={r.emoji} type="backgroundElement" style={styles.reactionPill}>
                            <ThemedText type="small">
                              {r.emoji} {r.userIds.length > 1 ? r.userIds.length : ''}
                            </ThemedText>
                          </ThemedView>
                        ))}
                      </ThemedView>
                    )}
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

          {!!errorText && (
            <ThemedView style={styles.errorBanner}>
              <ThemedText themeColor="danger" type="small">
                {errorText}
              </ThemedText>
            </ThemedView>
          )}

          {editingMessageId && (
            <ThemedView style={[styles.editingBanner, { borderTopColor: theme.border }]}>
              <ThemedText type="small" style={{ color: theme.primary, flex: 1 }}>
                Editing message
              </ThemedText>
              <Pressable onPress={cancelEditing} hitSlop={8}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {recorder.isRecording ? (
            <ThemedView style={[styles.inputRow, { borderTopColor: theme.border }]}>
              <ThemedView style={styles.recordingIndicator}>
                <ThemedView style={[styles.recordingDot, { backgroundColor: theme.danger }]} />
                <ThemedText>Recording… {formatRecordingTime(recorder.durationSeconds)}</ThemedText>
              </ThemedView>
              <Pressable onPress={() => recorder.cancel()} style={styles.iconButton} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={handleMicPress}
                style={[styles.sendButton, { backgroundColor: theme.primary }]}
                hitSlop={8}>
                <Ionicons name="send" size={20} color={theme.primaryText} />
              </Pressable>
            </ThemedView>
          ) : (
            <ThemedView style={[styles.inputRow, { borderTopColor: theme.border }]}>
              <Pressable onPress={handleAttach} disabled={sendingMedia || !!editingMessageId} style={styles.iconButton} hitSlop={8}>
                {sendingMedia ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Ionicons name="add-circle-outline" size={26} color={editingMessageId ? theme.border : theme.text} />
                )}
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
              />
              {draft.trim() ? (
                <Pressable
                  onPress={handleSend}
                  disabled={sending}
                  style={[styles.sendButton, { backgroundColor: theme.primary, opacity: sending ? 0.5 : 1 }]}>
                  <Ionicons name={editingMessageId ? 'checkmark' : 'send'} size={20} color={theme.primaryText} />
                </Pressable>
              ) : (
                <Pressable onPress={handleMicPress} disabled={!!editingMessageId} style={styles.iconButton} hitSlop={8}>
                  <Ionicons name="mic-outline" size={24} color={editingMessageId ? theme.border : theme.text} />
                </Pressable>
              )}
            </ThemedView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <MessageActionsSheet
        visible={!!actionsFor}
        onClose={() => setActionsFor(null)}
        onReact={handleReact}
        onEdit={actionsFor?.sender_id === userId && actionsFor?.message_type === 'text' ? handleEditFromSheet : undefined}
        onDelete={actionsFor?.sender_id === userId ? handleDeleteFromSheet : undefined}
        canEdit={actionsFor?.sender_id === userId && actionsFor?.message_type === 'text'}
        canDelete={actionsFor?.sender_id === userId}
      />

      <ImageLightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
    </ThemedView>
  );
}

function MessageBody({
  item,
  resolvedUrl,
  isOwn,
  theme,
  onImagePress,
}: {
  item: ChatMessage;
  resolvedUrl: string | null | undefined;
  isOwn: boolean;
  theme: ReturnType<typeof useTheme>;
  onImagePress: () => void;
}) {
  if (item.is_deleted) {
    return (
      <ThemedText style={{ color: isOwn ? theme.primaryText : theme.textSecondary, fontStyle: 'italic' }}>
        This message was deleted
      </ThemedText>
    );
  }

  if (item.message_type === 'image') {
    if (!resolvedUrl) return <ActivityIndicator size="small" color={isOwn ? theme.primaryText : theme.text} />;
    return (
      <Pressable onPress={onImagePress}>
        <Image source={{ uri: resolvedUrl }} style={styles.image} resizeMode="cover" />
      </Pressable>
    );
  }

  if (item.message_type === 'video') {
    if (!resolvedUrl) return <ActivityIndicator size="small" color={isOwn ? theme.primaryText : theme.text} />;
    return <VideoBubble uri={resolvedUrl} />;
  }

  if (item.message_type === 'voice') {
    if (!resolvedUrl) return <ActivityIndicator size="small" color={isOwn ? theme.primaryText : theme.text} />;
    return <VoiceBubble uri={resolvedUrl} isOwn={isOwn} fallbackDuration={item.duration ?? 0} />;
  }

  if (item.message_type === 'text') {
    return <ThemedText style={{ color: isOwn ? theme.primaryText : theme.text }}>{item.content}</ThemedText>;
  }

  return (
    <ThemedText style={{ color: isOwn ? theme.primaryText : theme.text }}>{messagePreview(item)}</ThemedText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: Spacing.three, gap: Spacing.two },
  emptyThread: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  bubbleRow: { flexDirection: 'column', alignItems: 'flex-start' },
  bubbleRowOwn: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  mediaBubble: { padding: Spacing.one },
  senderName: { marginBottom: 2, fontWeight: '700' },
  image: { width: 220, height: 220, borderRadius: 12 },
  reactionsRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  reactionPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  errorBanner: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.one },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: 1,
  },
  recordingIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  recordingDot: { width: 10, height: 10, borderRadius: 5 },
  iconButton: { width: MinTouchTarget, height: MinTouchTarget, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Radius.input + 4,
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
