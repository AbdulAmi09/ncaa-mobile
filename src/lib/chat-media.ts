import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type PendingChatMedia = {
  messageType: 'image' | 'video';
  fileUrl: string;
  fileName: string;
  fileSize: number;
};

// Same path convention and bucket as the web chat
// (${userId}/${roomId}/${images|videos}/${timestamp}-${name}), and the same
// "public" URL shape stored on the message row even though chat-files is a
// private bucket -- resolveSignedChatMediaUrl() below turns that into a
// real signed URL at render time, exactly like the web app's
// resolveMediaUrl(). Keeping both apps on one convention means a photo sent
// from web renders fine on mobile and vice versa.
export async function pickAndUploadChatMedia(
  userId: string,
  roomId: string,
): Promise<{ media: PendingChatMedia | null; error: string | null }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { media: null, error: 'Photo access is needed to share images or videos.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.8,
    videoMaxDuration: 60,
  });
  if (result.canceled || !result.assets[0]) return { media: null, error: null };

  const asset = result.assets[0];
  const isVideo = asset.type === 'video';
  const folder = isVideo ? 'videos' : 'images';
  const fileName = asset.fileName || `${Date.now()}.${asset.uri.split('.').pop() || (isVideo ? 'mp4' : 'jpg')}`;
  const path = `${userId}/${roomId}/${folder}/${Date.now()}-${fileName}`;

  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
  if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
    return { media: null, error: 'That file is too large. Max size is 50MB.' };
  }

  try {
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(path, blob, { contentType: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg') });
    if (uploadError) return { media: null, error: uploadError.message };

    const { data } = supabase.storage.from('chat-files').getPublicUrl(path);
    return {
      media: {
        messageType: isVideo ? 'video' : 'image',
        fileUrl: data.publicUrl,
        fileName,
        fileSize: blob.size,
      },
      error: null,
    };
  } catch {
    return { media: null, error: 'Could not send that file. Please try again.' };
  }
}

export async function uploadVoiceMessage(
  userId: string,
  roomId: string,
  uri: string,
  durationSeconds: number,
): Promise<{ media: (PendingChatMedia & { duration: number }) | null; error: string | null }> {
  const path = `${userId}/${roomId}/${Date.now()}-voice.m4a`;

  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('chat-uploads')
      .upload(path, blob, { contentType: 'audio/m4a' });
    if (uploadError) return { media: null, error: uploadError.message };

    const { data } = supabase.storage.from('chat-uploads').getPublicUrl(path);
    return {
      media: {
        messageType: 'image', // unused; caller sets message_type: 'voice' explicitly
        fileUrl: data.publicUrl,
        fileName: 'voice.m4a',
        fileSize: blob.size,
        duration: Math.round(durationSeconds),
      },
      error: null,
    };
  } catch {
    return { media: null, error: 'Could not send that voice message. Please try again.' };
  }
}

const signedUrlCache: Record<string, string> = {};

// chat-files/chat-uploads are private buckets (same as the web app), so the
// getPublicUrl() string stashed on the message at send time 404s if hit
// directly. Swap it for a signed URL at render time instead.
export async function resolveSignedChatMediaUrl(fileUrl: string): Promise<string> {
  if (signedUrlCache[fileUrl]) return signedUrlCache[fileUrl];

  const match = fileUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return fileUrl;

  const bucket = match[1];
  const path = decodeURIComponent(match[2]);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 21600);
  if (error || !data?.signedUrl) return fileUrl;

  signedUrlCache[fileUrl] = data.signedUrl;
  return data.signedUrl;
}
