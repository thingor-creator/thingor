import { supabase, isSupabaseConfigured } from './supabase';
import { isR2Configured, uploadFileToR2, getR2FileSignedUrl, deleteFileFromR2 } from './r2';

export interface StorageUploadResult {
  path?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Uploads a file to Cloudflare R2 Object Storage under {user_id}/{folder}/{filename}
 * and returns a signed or public URL for secure viewing.
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

  // 1. Primary: Cloudflare R2 Object Storage
  if (isR2Configured) {
    return await uploadFileToR2(file, folder, userId);
  }

  // 2. Supabase Storage fallback (only if R2 is not configured)
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Cloudflare R2 storage is not configured' };
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

/**
 * Deletes a file from Cloudflare R2 storage (or Supabase fallback).
 */
export async function deleteFileFromStorage(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!filePath) return { success: true };

  if (isR2Configured) {
    return await deleteFileFromR2(filePath);
  }

  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Storage not configured' };

  const { error } = await supabase.storage
    .from('thingor-assets')
    .remove([filePath]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

