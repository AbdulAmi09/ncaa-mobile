import { supabase } from '@/lib/supabase';

export type ReportReason = 'spam' | 'harassment' | 'inappropriate_content' | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'inappropriate_content', label: 'Inappropriate content' },
  { id: 'other', label: 'Other' },
];

export async function fetchBlockedUserIds(): Promise<Set<string>> {
  const { data } = await supabase.from('blocked_users').select('blocked_id');
  return new Set((data ?? []).map((r: any) => r.blocked_id));
}

export async function blockUser(blockedId: string) {
  return supabase.from('blocked_users').insert({ blocked_id: blockedId });
}

export async function unblockUser(blockedId: string) {
  return supabase.from('blocked_users').delete().eq('blocked_id', blockedId);
}

export async function submitReport(params: {
  reportedUserId: string;
  roomId: string;
  messageId?: string;
  reason: ReportReason;
  details?: string;
}) {
  return supabase.from('chat_reports').insert({
    reported_user_id: params.reportedUserId,
    room_id: params.roomId,
    message_id: params.messageId ?? null,
    reason: params.reason,
    details: params.details?.trim() || null,
  });
}
