import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, MinTouchTarget, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  type ChatRoom,
  displayNameFor,
  fetchProfilesMap,
  messagePreview,
  otherParticipantId,
} from '@/lib/chat';
import { supabase } from '@/lib/supabase';

type RoomListItem = ChatRoom & {
  displayName: string;
  avatarInitials: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') .concat(parts[1]?.[0] ?? '').toUpperCase() || '?';
}

function formatTime(dateString: string | null) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export default function ChatListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    const { data: memberRooms } = await supabase
      .from('group_members')
      .select('group_id, chat_rooms!inner (id, name, room_type, is_direct_message, direct_message_with, created_by)')
      .eq('user_id', userId)
      .eq('is_hidden', false);

    const baseRooms: ChatRoom[] = (memberRooms ?? []).map((m: any) => m.chat_rooms);
    if (baseRooms.length === 0) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomIds = baseRooms.map((r) => r.id);

    const [{ data: unread }, { data: recentMessages }] = await Promise.all([
      supabase.from('unread_messages').select('room_id, unread_count').eq('user_id', userId),
      supabase
        .from('chat_messages')
        .select('room_id, content, message_type, created_at, is_deleted')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(300),
    ]);

    const unreadByRoom: Record<string, number> = {};
    (unread ?? []).forEach((u: any) => {
      unreadByRoom[u.room_id] = u.unread_count;
    });

    const lastByRoom: Record<string, any> = {};
    (recentMessages ?? []).forEach((m: any) => {
      if (!lastByRoom[m.room_id]) lastByRoom[m.room_id] = m;
    });

    const otherIds = baseRooms
      .map((r) => otherParticipantId(r, userId))
      .filter((id): id is string => !!id);
    const profileMap = await fetchProfilesMap(otherIds);

    const items: RoomListItem[] = baseRooms.map((r) => {
      const otherId = otherParticipantId(r, userId);
      const otherProfile = otherId ? profileMap[otherId] : null;
      const displayName = r.is_direct_message ? displayNameFor(otherProfile) : r.name;
      const last = lastByRoom[r.id];
      return {
        ...r,
        displayName,
        avatarInitials: initials(displayName),
        avatarUrl: r.is_direct_message ? (otherProfile?.avatar_url ?? null) : null,
        lastMessage: messagePreview(last ?? null),
        lastMessageAt: last?.created_at ?? null,
        unreadCount: unreadByRoom[r.id] ?? 0,
      };
    });

    items.sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime());

    setRooms(items);
    setLoading(false);
  }, [userId]);

  // Refetch every time this tab regains focus so a message someone sent
  // while you were elsewhere shows up without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="title">Chat</ThemedText>
          <Pressable
            onPress={() => router.push('/chat/new')}
            style={[styles.newButton, { backgroundColor: theme.primary }]}
            hitSlop={8}>
            <Ionicons name="add" size={26} color={theme.primaryText} />
          </Pressable>
        </ThemedView>

        {loading ? (
          <ActivityIndicator style={styles.flex} size="large" />
        ) : rooms.length === 0 ? (
          <ThemedView style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={44} color={theme.textSecondary} />
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No conversations yet. Tap + to message another arbiter or committee member.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/chat/${item.id}`)}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
                <ThemedView type="backgroundElement" style={styles.avatar}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText type="smallBold">{item.avatarInitials}</ThemedText>
                  )}
                </ThemedView>
                <ThemedView style={styles.rowBody}>
                  <ThemedView style={styles.rowTopLine}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.roomName}>
                      {item.displayName}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatTime(item.lastMessageAt)}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.rowBottomLine}>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                      style={styles.preview}>
                      {item.lastMessage}
                    </ThemedText>
                    {item.unreadCount > 0 && (
                      <ThemedView style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                        <ThemedText type="small" style={{ color: theme.primaryText }}>
                          {item.unreadCount}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                </ThemedView>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  newButton: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    borderRadius: MinTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.five },
  emptyText: { textAlign: 'center' },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  rowBody: { flex: 1, gap: Spacing.half },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  roomName: { flex: 1 },
  rowBottomLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  preview: { flex: 1 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
