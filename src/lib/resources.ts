import { supabase } from '@/lib/supabase';

export type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
};

export async function fetchResources() {
  return supabase
    .from('resources')
    .select('id, title, description, category, file_url, file_type, file_size')
    .order('created_at', { ascending: false });
}

export function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
