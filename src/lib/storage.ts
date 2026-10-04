import { supabase, isSupabaseConfigured } from './supabase';
import { isR2Configured, uploadFileToR2, getR2FileSignedUrl, deleteFileFromR2 } from './r2';

export interface StorageUploadResult {
  path?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Helper to load an HTMLImageElement from a File as fallback.
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load error'));
    };
    img.src = url;
  });
}

/**
 * Optimizes an image file in browser before upload to Cloudflare R2:
 * - Max dimensions: 1600 x 1600 px (preserves aspect ratio, no upscaling)
 * - Format: WebP (quality 0.80)
 * - Auto EXIF orientation via createImageBitmap (from-image)
 * - Error handling: throws error on failure, preventing raw upload
 */
export async function optimizeImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    let width = 0;
    let height = 0;
    let imageSource: CanvasImageSource;

    // Use createImageBitmap if available for auto EXIF orientation
    if (typeof createImageBitmap !== 'undefined') {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        width = bitmap.width;
        height = bitmap.height;
        imageSource = bitmap;
      } catch (e) {
        const img = await loadImageElement(file);
        width = img.width;
        height = img.height;
        imageSource = img;
      }
    } else {
      const img = await loadImageElement(file);
      width = img.width;
      height = img.height;
      imageSource = img;
    }

    // Calculate target size (max 1600x1600 px, no upscaling)
    const MAX_DIM = 1600;
    let targetWidth = width;
    let targetHeight = height;

    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        targetWidth = MAX_DIM;
        targetHeight = Math.round((height * MAX_DIM) / width);
      } else {
        targetHeight = MAX_DIM;
        targetWidth = Math.round((width * MAX_DIM) / height);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context creation failed');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

    if ('close' in imageSource && typeof (imageSource as ImageBitmap).close === 'function') {
      (imageSource as ImageBitmap).close();
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.80);
    });

    if (!blob) {
      throw new Error('WebP blob creation failed');
    }

    // Build filename with .webp extension
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const webpFileName = `${nameWithoutExt}.webp`;

    return new File([blob], webpFileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (err: any) {
    throw new Error('A kép feldolgozása nem sikerült. Próbálj meg egy másik képet.');
  }
}

/**
 * Uploads a file to Cloudflare R2 Object Storage under {user_id}/{folder}/{filename}
 * and returns a signed or public URL for secure viewing.
 * Images are automatically compressed & converted to WebP on the client before upload.
 */
export async function uploadFileToStorage(
  file: File,
  folder: 'photos' | 'documents',
  userId: string
): Promise<StorageUploadResult> {
  // Validate initial file size (max 15MB)
  if (file.size > 15 * 1024 * 1024) {
    return { error: 'File size exceeds 15MB limit' };
  }

  let fileToUpload = file;

  // 1. Perform client-side image compression for images
  if (folder === 'photos' || file.type.startsWith('image/')) {
    try {
      fileToUpload = await optimizeImageFile(file);
    } catch (optError: any) {
      // Golden Rule: DO NOT upload raw original image if optimization fails!
      return { error: optError.message || 'A kép feldolgozása nem sikerült. Próbálj meg egy másik képet.' };
    }
  }

  // 2. Primary: Cloudflare R2 Object Storage
  if (isR2Configured) {
    return await uploadFileToR2(fileToUpload, folder, userId);
  }

  // 3. Supabase Storage fallback (only if R2 is not configured)
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Cloudflare R2 storage is not configured' };
  }

  const sanitizedName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${folder}/${Date.now()}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from('thingor-assets')
    .upload(filePath, fileToUpload, {
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


