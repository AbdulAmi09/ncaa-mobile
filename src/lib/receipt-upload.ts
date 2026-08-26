import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type PickedReceipt = { uri: string; name: string; mimeType: string | null };

export async function pickReceiptImage(): Promise<{ receipt: PickedReceipt | null; error: string | null }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { receipt: null, error: 'Photo access is needed to attach a receipt.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets[0]) return { receipt: null, error: null };
  const asset = result.assets[0];
  return {
    receipt: { uri: asset.uri, name: asset.fileName || `receipt-${Date.now()}.jpg`, mimeType: asset.mimeType ?? null },
    error: null,
  };
}

// Same bucket + path convention as the web app's bank-transfer receipt
// upload ((storage.foldername(name))[1] = auth.uid() RLS on the receipts
// bucket, script 017).
export async function uploadReceipt(userId: string, receipt: PickedReceipt): Promise<{ path: string | null; error: string | null }> {
  const path = `${userId}/${Date.now()}-${receipt.name}`;
  try {
    const response = await fetch(receipt.uri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, blob, { contentType: receipt.mimeType || 'image/jpeg' });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch {
    return { path: null, error: 'Could not upload that receipt. Please try again.' };
  }
}
