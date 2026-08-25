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
  is_deleted: boolean | null;
};

export function displayNameFor(profile?: ChatProfile | null) {
  if (!profile) return 'Unknown';
  return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unknown';
}

export function otherParticipantId(room: ChatRoom, currentUserId: string) {
  if (!room.is_direct_message) return null;
  return room.created_by === currentUserId ? room.direct_message_with : room.created_by;
}

// Plain-language stand-in for message types this first mobile pass doesn't
// render (voice notes, photos, files) -- matches the preview text the web
// chat list already uses, so it reads the same across both apps.
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
