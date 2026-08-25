import { supabase } from '@/lib/supabase';

export type Assignment = {
  id: string;
  tournament_id: string;
  arbiter_id: string;
  role: string | null;
  assignment_status: 'Pending' | 'Accepted' | 'Declined' | 'Completed' | string;
  assigned_by: string | null;
  assigned_by_name: string | null;
  notes: string | null;
  compensation: number | null;
  travel_allowance: number | null;
  accommodation_provided: boolean | null;
  tournament_name: string;
  start_date: string;
  end_date: string;
  venue: string | null;
  city: string | null;
  state: string | null;
};

export async function fetchAssignments(arbiterId: string) {
  return supabase
    .from('assignment_details')
    .select('*')
    .eq('arbiter_id', arbiterId)
    .order('start_date', { ascending: false });
}

// Mirrors the web app's /api/assignments/update-status route exactly (same
// three writes), done directly against Supabase under the user's own RLS
// instead of through a Next.js API route -- there's no server in between on
// mobile, and none is needed since the row-level policies already scope
// every one of these writes to rows the signed-in arbiter owns.
export async function respondToAssignment(
  assignmentId: string,
  userId: string,
  status: 'Accepted' | 'Declined',
) {
  const { error: updateError } = await supabase
    .from('tournament_assignments')
    .update({ assignment_status: status })
    .eq('id', assignmentId);
  if (updateError) return { error: updateError.message };

  await supabase
    .from('notifications')
    .update({ action_required: false })
    .eq('related_id', assignmentId)
    .eq('action_type', 'Tournament_assignment')
    .eq('recipient_id', userId);

  await supabase.from('notifications').insert({
    recipient_id: userId,
    title: `Assignment ${status}`,
    message: `You have ${status.toLowerCase()} the tournament assignment.`,
    notification_type: 'assignment',
  });

  return { error: null };
}
