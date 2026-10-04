import { supabase, isSupabaseConfigured } from './supabase';
import { isR2Configured, uploadFileToR2, getR2FileSignedUrl } from './r2';

export interface StorageUploadResult {
  path?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Uploads a file to Cloudflare R2 (if configured) or private Supabase Storage 'thingor-assets' bucket
 * under {user_id}/{folder}/{filename} and returns a signed URL for secure viewing.
 */
export async function uploadFileToStorage(
  file: File,
  folder: 'photos' | 'documents',
  userId: string
): Promise<StorageUploadResult> {
  // Validate size (max 15MB)
  if (file.size > 15 * 1024 * 1024) {
    return { error: 'File size exceeds 15MB limit' };
  }

  // 1. Prefer Cloudflare R2 Object Storage if configured
  if (isR2Configured) {
    return await uploadFileToR2(file, folder, userId);
  }

  // 2. Supabase Storage fallback
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Neither Cloudflare R2 nor Supabase storage is configured' };
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

  // Generate a signed access URL (1 year expiry)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('thingor-assets')
    .createSignedUrl(data.path, 31536000);

  if (signedError || !signedData?.signedUrl) {
    return { path: data.path, signedUrl: '' };
  }

  return { path: data.path, signedUrl: signedData.signedUrl };
}

/**
 * Generates a signed URL for a file path stored in Cloudflare R2 or 'thingor-assets' bucket.
 */
export async function getFileSignedUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }

  if (isR2Configured) {
    return await getR2FileSignedUrl(pathOrUrl);
  }

  if (!isSupabaseConfigured || !supabase) return pathOrUrl;

  const { data } = await supabase.storage
    .from('thingor-assets')
    .createSignedUrl(pathOrUrl, 3600);

  return data?.signedUrl || pathOrUrl;
}
