import { supabase } from '@/lib/supabase';

export type ChatRoom = {
  id: string;
  name: string;
  room_type: string;
  is_direct_message: boolean;
  direct_message_with: string | null;
  created_by: string | null;
};

export type ChatProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  arbiter_level: string | null;
  role: string | null;
  last_seen_at: string | null;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  content: string;
  created_at: string;
  sender_id: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  duration: number | null;
  is_deleted: boolean | null;
  is_edited: boolean | null;
};

export function displayNameFor(profile?: ChatProfile | null) {
  if (!profile) return 'Unknown';
  return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unknown';
}

export function otherParticipantId(room: ChatRoom, currentUserId: string) {
  if (!room.is_direct_message) return null;
  return room.created_by === currentUserId ? room.direct_message_with : room.created_by;
}

// Plain-text preview for the conversation list row -- matches the preview
// text the web chat list already uses. The thread itself renders the
// actual photo/video/voice bubble; this is only for the one-line summary.
export function messagePreview(message: Pick<ChatMessage, 'content' | 'message_type' | 'is_deleted'> | null) {
  if (!message) return 'No messages yet';
  if (message.is_deleted) return 'This message was deleted';
  switch (message.message_type) {
    case 'image':
      return '📷 Photo';
    case 'video':
      return '🎥 Video';
    case 'voice':
      return '🎤 Voice message';
    case 'file':
      return '📎 File';
    default:
      return message.content;
  }
}

export async function fetchProfilesMap(ids: string[]): Promise<Record<string, ChatProfile>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data } = await supabase.rpc('get_profiles_for_chat', { p_ids: unique });
  const map: Record<string, ChatProfile> = {};
  (data ?? []).forEach((p: ChatProfile) => {
    map[p.id] = p;
  });
  return map;
}

export async function getOrCreateDmRoom(userId: string, otherUserId: string) {
  const { data, error } = await supabase.rpc('get_or_create_dm_room', {
    p_user_id: userId,
    p_other_user_id: otherUserId,
  });
  return { data: data as string | null, error };
}

export async function searchUsersForDm(query: string) {
  return supabase.rpc('search_users_for_dm', { p_search_query: query, p_limit: 15 });
}

export async function markRoomAsRead(userId: string, roomId: string) {
  await supabase.rpc('mark_messages_as_read', { p_user_id: userId, p_room_id: roomId });
}

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export type ReactionGroup = { emoji: string; userIds: string[] };

export async function fetchReactions(messageIds: string[]): Promise<Record<string, ReactionGroup[]>> {
  if (messageIds.length === 0) return {};
  const { data } = await supabase
    .from('message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds);

  const grouped: Record<string, Record<string, string[]>> = {};
  (data ?? []).forEach((r: any) => {
    grouped[r.message_id] = grouped[r.message_id] || {};
    grouped[r.message_id][r.emoji] = grouped[r.message_id][r.emoji] || [];
    grouped[r.message_id][r.emoji].push(r.user_id);
  });

  const result: Record<string, ReactionGroup[]> = {};
  Object.entries(grouped).forEach(([msgId, emojiMap]) => {
    result[msgId] = Object.entries(emojiMap).map(([emoji, userIds]) => ({ emoji, userIds }));
  });
  return result;
}

export async function toggleReaction(messageId: string, userId: string, emoji: string, alreadyReacted: boolean) {
  if (alreadyReacted) {
    return supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji);
  }
  return supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
}

export async function editMessage(messageId: string, senderId: string, content: string) {
  return supabase
    .from('chat_messages')
    .update({ content, is_edited: true, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', senderId);
}

export type MessageSearchResult = { id: string; content: string; message_type: string; created_at: string };

export async function searchMessagesInRoom(roomId: string, query: string): Promise<MessageSearchResult[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select('id, content, message_type, created_at')
    .eq('room_id', roomId)
    .eq('is_deleted', false)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data as MessageSearchResult[]) ?? [];
}

export async function fetchMessagesUpTo(roomId: string, createdAt: string, columns: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select(columns)
    .eq('room_id', roomId)
    .lte('created_at', createdAt)
    .order('created_at', { ascending: false })
    .limit(50);
  return [...((data as unknown as ChatMessage[]) ?? [])].reverse();
}

export async function deleteMessage(messageId: string, senderId: string) {
  return supabase
    .from('chat_messages')
    .update({ is_deleted: true, content: '', file_url: null })
    .eq('id', messageId)
    .eq('sender_id', senderId);
}
