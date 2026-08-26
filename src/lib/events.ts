import { supabase } from '@/lib/supabase';

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  registration_fee: number | null;
  registration_deadline: string | null;
  requires_registration: boolean | null;
};

export async function fetchUpcomingEvents() {
  const today = new Date().toISOString();
  return supabase
    .from('events')
    .select(
      'id, title, description, event_type, start_date, end_date, venue, city, state, registration_fee, registration_deadline, requires_registration',
    )
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(50);
}
