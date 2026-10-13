import { supabase } from './supabase';

export const r2BucketName = (import.meta.env.VITE_R2_BUCKET_NAME || 'thingor').trim();
export const r2PhotosBucket = (import.meta.env.VITE_R2_PHOTOS_BUCKET || import.meta.env.VITE_R2_BUCKET_NAME || 'thingor').trim();
export const r2VaultBucket = (import.meta.env.VITE_R2_VAULT_BUCKET || import.meta.env.VITE_R2_BUCKET_NAME || 'thingor').trim();
export const r2PublicDomain = (import.meta.env.VITE_R2_PUBLIC_DOMAIN || '').trim().replace(/\/$/, '');

// R2 is considered configured when either public assets CDN domain or Supabase edge functions are available
export const isR2Configured = Boolean(r2PublicDomain || import.meta.env.VITE_SUPABASE_URL);

/**
 * Uploads a file securely to Cloudflare R2 via server-side Supabase Edge Function 'storage-r2'.
 * Primary strategy: Presigned PUT URL directly from Edge Function (fast & secure).
 * Fallback strategy: Direct binary upload via Edge Function if presigned PUT encounters network/CORS issues.
 */
export async function uploadFileToR2(
  file: File,
  folder: 'photos' | 'documents',
  _userId: string
): Promise<{ path?: string; signedUrl?: string; error?: string }> {
  if (!supabase) {
    return { error: 'Supabase client is not configured' };
  }

  if (file.size > 15 * 1024 * 1024) {
    return { error: 'File size exceeds 15MB limit' };
  }

  try {
    // 1. Request presigned upload URL from Edge Function
    const { data, error } = await supabase.functions.invoke('storage-r2', {
      body: {
        action: 'get-upload-url',
        folder,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      },
    });

    if (error || !data?.uploadUrl) {
      console.warn('Presigned upload URL generation failed, attempting direct upload fallback:', error);
      return await uploadDirectToEdgeFunction(file, folder);
    }

    // 2. Upload file to presigned PUT URL
    const uploadRes = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!uploadRes.ok) {
      console.warn('Direct PUT to presigned URL failed, attempting direct upload fallback...');
      return await uploadDirectToEdgeFunction(file, folder);
    }

    if (folder === 'photos') {
      const publicUrl = data.publicUrl || (r2PublicDomain ? `${r2PublicDomain}/${data.path}` : data.uploadUrl);
      return { path: data.path, signedUrl: publicUrl };
    }

    // Documents are strictly private: return persistent path for DB storage, NEVER save transient signed URLs
    return { path: data.path, signedUrl: data.path };
  } catch (err: any) {
    console.warn('Upload error, attempting fallback:', err);
    return await uploadDirectToEdgeFunction(file, folder);
  }
}

/**
 * Fallback direct upload through Edge Function for resilience against client CORS restrictions
 */
async function uploadDirectToEdgeFunction(
  file: File,
  folder: 'photos' | 'documents'
): Promise<{ path?: string; signedUrl?: string; error?: string }> {
  if (!supabase) {
    return { error: 'Supabase client is not configured' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    const base64 = btoa(binary);

    const { data, error } = await supabase.functions.invoke('storage-r2', {
      body: {
        action: 'upload-direct',
        folder,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileData: base64,
      },
    });

    if (error || data?.error) {
      return { error: error?.message || data?.error || 'Edge Function direct upload failed' };
    }

    if (folder === 'photos') {
      const publicUrl = data.publicUrl || (r2PublicDomain ? `${r2PublicDomain}/${data.path}` : '');
      return { path: data.path, signedUrl: publicUrl };
    }

    // Return persistent path for DB storage
    return { path: data.path, signedUrl: data.path };
  } catch (err: any) {
    return { error: err.message || 'Direct upload fallback failed' };
  }
}

/**
 * Resolves a public or signed URL for an R2 file path.
 * - Photos: Can be resolved directly via public CDN domain if configured.
 * - Documents: ALWAYS resolved through the authenticated Edge Function using time-limited Pre-Signed URLs.
 */
export async function getR2FileSignedUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:')) {
    return pathOrUrl;
  }

  // Detect whether this is a document path or URL
  const isDocument = pathOrUrl.includes('/documents/');

  // Photos: resolve directly via public CDN domain if configured and not already a full URL
  if (!isDocument && r2PublicDomain && !pathOrUrl.startsWith('http://') && !pathOrUrl.startsWith('https://')) {
    return `${r2PublicDomain}/${pathOrUrl}`;
  }

  // Photos: if already an absolute HTTP/HTTPS URL, return directly
  if (!isDocument && (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://'))) {
    return pathOrUrl;
  }

  // Documents: ALWAYS invoke the Edge Function to authenticate and generate
  // an authorized, time-limited S3 Pre-Signed GET URL.
  // Never resolve a document directly against r2PublicDomain!
  if (!supabase) return pathOrUrl;

  try {
    const { data } = await supabase.functions.invoke('storage-r2', {
      body: { action: 'get-signed-url', path: pathOrUrl },
    });
    return data?.signedUrl || pathOrUrl;
  } catch {
    return pathOrUrl;
  }
}

/**
 * Safely opens a private document in a new tab by fetching a fresh, authenticated
 * Pre-Signed GET URL from the Edge Function.
 * Pre-allocates window.open to prevent browser popup blockers on asynchronous calls.
 */
export async function openR2DocumentSecurely(pathOrUrl: string): Promise<boolean> {
  if (!pathOrUrl) return false;
  if (pathOrUrl === '#' || pathOrUrl.trim() === '') return false;

  // Local data/blob URLs can be opened directly
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:')) {
    window.open(pathOrUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  // Avoid popup blocker by creating window handle before await
  const newTab = window.open('about:blank', '_blank', 'noopener,noreferrer');
  try {
    const signedUrl = await getR2FileSignedUrl(pathOrUrl);
    if (signedUrl && signedUrl !== '#' && newTab) {
      newTab.location.href = signedUrl;
      return true;
    }
  } catch (err) {
    console.error('Error opening secure document:', err);
  }

  if (newTab) {
    newTab.close();
  }
  return false;
}

/**
 * Deletes a file securely from Cloudflare R2 via server-side Edge Function.
 * The server enforces that the user is the owner of the file path or has admin role.
 */
export async function deleteFileFromR2(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !filePath) {
    return { success: false, error: 'Supabase client is not configured or path is empty' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('storage-r2', {
      body: {
        action: 'delete',
        path: filePath,
      },
    });

    if (error || data?.error) {
      return { success: false, error: error?.message || data?.error || 'Cloudflare R2 delete failed' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Cloudflare R2 delete failed' };
  }
}
