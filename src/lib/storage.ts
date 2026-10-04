import { supabase, isSupabaseConfigured } from './supabase';

export interface StorageUploadResult {
  path?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Uploads a file to the private 'thingor-assets' bucket under {user_id}/{folder}/{filename}
 * and returns a signed URL for secure viewing.
 */
export async function uploadFileToStorage(
  file: File,
  folder: 'photos' | 'documents',
  userId: string
): Promise<StorageUploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase storage is not configured' };
  }

  // Validate size (max 15MB)
  if (file.size > 15 * 1024 * 1024) {
    return { error: 'File size exceeds 15MB limit' };
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${folder}/${Date.now()}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from('thingor-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  // Generate a signed access URL (M13 - Signed Access for private bucket)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('thingor-assets')
    .createSignedUrl(data.path, 31536000); // 1 year expiry

  if (signedError || !signedData?.signedUrl) {
    return { path: data.path, signedUrl: '' };
  }

  return { path: data.path, signedUrl: signedData.signedUrl };
}

/**
 * Generates a signed URL for a file path stored in the 'thingor-assets' bucket.
 */
export async function getFileSignedUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }

  if (!isSupabaseConfigured || !supabase) return pathOrUrl;

  const { data } = await supabase.storage
    .from('thingor-assets')
    .createSignedUrl(pathOrUrl, 3600);

  return data?.signedUrl || pathOrUrl;
}
