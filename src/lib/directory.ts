import { supabase } from '@/lib/supabase';

export type Zone = { id: string; name: string; description: string | null };

export type DirectoryMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  zone: string | null;
  arbiter_level: string | null;
};

export async function fetchZones() {
  return supabase.from('zones').select('id, name, description').order('name');
}

// Same SECURITY DEFINER RPC the "new chat" search screen and the web
// app's zone directory already use -- every active member, scoped
// server-side to is_active = true, no separate profiles read needed.
export async function fetchZoneDirectory() {
  return supabase.rpc('get_zone_directory');
}
