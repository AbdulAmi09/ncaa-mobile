import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

// Folder-per-user path so the ownership-scoped storage RLS policies (script
// 068 on the nigarbapp DB -- (storage.foldername(name))[2] = auth.uid())
// actually match, same convention the web app's profile/settings pages use.
export async function pickAndUploadAvatar(userId: string): Promise<{ url: string | null; error: string | null }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { url: null, error: 'Photo access is needed to set a profile picture.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return { url: null, error: null };

  const asset = result.assets[0];
  const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `avatars/${userId}/${Date.now()}.${ext}`;

  try {
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { contentType: asset.mimeType || `image/${ext}`, upsert: true });
    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId);
    if (updateError) return { url: null, error: updateError.message };

    return { url: data.publicUrl, error: null };
  } catch {
    return { url: null, error: 'Could not upload that photo. Please try again.' };
  }
}
