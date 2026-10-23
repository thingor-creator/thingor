import { supabase } from './supabase';

export const r2BucketName = (import.meta.env.VITE_R2_BUCKET_NAME || 'thingor').trim();
export const r2PhotosBucket = (import.meta.env.VITE_R2_PHOTOS_BUCKET || import.meta.env.VITE_R2_BUCKET_NAME || 'thingor').trim();
export const r2VaultBucket = (import.meta.env.VITE_R2_VAULT_BUCKET || 'thingor-vault').trim();
export const r2PublicDomain = (import.meta.env.VITE_R2_PUBLIC_DOMAIN || '').trim().replace(/\/$/, '');

// R2 is considered configured when either public assets CDN domain or Supabase edge functions are available
export const isR2Configured = Boolean(r2PublicDomain || import.meta.env.VITE_SUPABASE_URL);

/**
 * Safely extracts detailed error messages from Supabase Edge Function invocation failures.
 */
async function extractEdgeFunctionError(error: any, data: any, fallback: string): Promise<string> {
  if (data?.details) return String(data.details);
  if (data?.error) return String(data.error);

  if (error) {
    if (error.context && typeof error.context.json === 'function') {
      try {
        const body = await error.context.json();
        if (body?.details) return String(body.details);
        if (body?.error) return String(body.error);
      } catch {
        // Response body already read or not JSON
      }
    }
    if (error.message && error.message !== 'Edge Function returned a non-2xx status code') {
      return error.message;
    }
  }

  return fallback;
}

/**
 * Ensures user has an active session and refreshes if near expiration.
 */
async function ensureValidSession(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) {
      // Try refresh
      const { data: refreshData } = await supabase.auth.refreshSession();
      return Boolean(refreshData?.session);
    }

    const expiresAt = session.expires_at;
    // If expires within 2 minutes, refresh proactively
    if (expiresAt && expiresAt * 1000 - Date.now() < 120000) {
      await supabase.auth.refreshSession();
    }
    return true;
  } catch {
    return false;
  }
}

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

  // Pre-validate session before initiating upload
  await ensureValidSession();

  try {
    // 1. Request presigned upload URL from Edge Function
    let { data, error } = await supabase.functions.invoke('storage-r2', {
      body: {
        action: 'get-upload-url',
        folder,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      },
    });

    // If 401 Unauthorized, refresh session and retry once
    if (error && (error.status === 401 || String(error.message).includes('401'))) {
      const refreshed = await ensureValidSession();
      if (refreshed) {
        const retryRes = await supabase.functions.invoke('storage-r2', {
          body: {
            action: 'get-upload-url',
            folder,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
          },
        });
        data = retryRes.data;
        error = retryRes.error;
      }
    }

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

    let { data, error } = await supabase.functions.invoke('storage-r2', {
      body: {
        action: 'upload-direct',
        folder,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileData: base64,
      },
    });

    // If 401 Unauthorized, refresh session and retry once
    if (error && (error.status === 401 || String(error.message).includes('401'))) {
      const refreshed = await ensureValidSession();
      if (refreshed) {
        const retryRes = await supabase.functions.invoke('storage-r2', {
          body: {
            action: 'upload-direct',
            folder,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileData: base64,
          },
        });
        data = retryRes.data;
        error = retryRes.error;
      }
    }

    if (error || data?.error) {
      const errMsg = await extractEdgeFunctionError(error, data, 'Edge Function direct upload failed');
      return { error: errMsg };
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
export async function getR2FileSignedUrl(
  pathOrUrl: string,
  options?: { isDownload?: boolean; fileName?: string }
): Promise<string> {
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
  if (!supabase) return '';

  try {
    const { data, error } = await supabase.functions.invoke('storage-r2', {
      body: {
        action: 'get-signed-url',
        path: pathOrUrl,
        isDownload: options?.isDownload ?? false,
        fileName: options?.fileName,
      },
    });
    if (error || !data?.signedUrl) {
      console.warn('Storage-R2 Edge Function signed URL resolution failed:', error || data?.error);
      return '';
    }
    return data.signedUrl;
  } catch (err) {
    console.warn('Network error invoking storage-r2 function:', err);
    return '';
  }
}

/**
 * Safely opens a private document in a new tab by fetching a fresh, authenticated
 * Pre-Signed GET URL from the Edge Function.
 * Pre-allocates window.open to prevent browser popup blockers on asynchronous calls.
 */
export async function openR2DocumentSecurely(pathOrUrl: string): Promise<boolean> {
  if (!pathOrUrl || pathOrUrl === '#' || pathOrUrl.trim() === '') return false;

  // Local data/blob URLs can be opened directly
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:')) {
    window.open(pathOrUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  // Pre-open blank tab during the user-initiated click gesture to avoid popup blockers.
  // CRITICAL: Do NOT pass 'noopener' or 'noreferrer' in the 3rd argument (windowFeatures),
  // because per the WHATWG HTML spec, 'noopener' forces window.open() to return null.
  // When null is returned, the tab cannot be navigated or closed asynchronously, leaving
  // about:blank stuck on the user's screen.
  let newTab: Window | null = null;
  try {
    newTab = window.open('about:blank', '_blank');
  } catch {
    newTab = null;
  }

  try {
    const signedUrl = await getR2FileSignedUrl(pathOrUrl, { isDownload: false });
    if (signedUrl) {
      if (newTab && !newTab.closed) {
        // Use location.replace so about:blank is replaced in history
        if (typeof newTab.location?.replace === 'function') {
          newTab.location.replace(signedUrl);
        } else {
          newTab.location.href = signedUrl;
        }

        // Sever opener reference after setting target to prevent reverse tabnabbing
        try {
          newTab.opener = null;
        } catch {
          // ignore in environments where opener is read-only
        }
        return true;
      }

      // Fallback: If newTab was blocked by popup blocker or closed by user
      const anchor = document.createElement('a');
      anchor.href = signedUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return true;
    }
  } catch (err) {
    console.error('Error opening secure document:', err);
  }

  // If signedUrl resolution failed or was rejected, close the opened blank tab so it does not linger
  if (newTab && !newTab.closed) {
    try {
      newTab.close();
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Securely downloads a private document by requesting an authenticated S3 Pre-Signed URL
 * with Content-Disposition: attachment header and user-specified filename.
 */
export async function downloadR2DocumentSecurely(pathOrUrl: string, fileName?: string): Promise<boolean> {
  if (!pathOrUrl || pathOrUrl === '#' || pathOrUrl.trim() === '') return false;

  const targetName = fileName || pathOrUrl.split('/').pop() || 'document.pdf';

  try {
    const signedUrl = await getR2FileSignedUrl(pathOrUrl, {
      isDownload: true,
      fileName: targetName,
    });

    if (!signedUrl) {
      return false;
    }

    const anchor = document.createElement('a');
    anchor.href = signedUrl;
    anchor.download = targetName;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch (err) {
    console.error('Error downloading secure document:', err);
    return false;
  }
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
