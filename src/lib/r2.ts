import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = (import.meta.env.VITE_R2_ACCOUNT_ID || '').trim();
const accessKeyId = (import.meta.env.VITE_R2_ACCESS_KEY_ID || '').trim();
const secretAccessKey = (import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '').trim();
export const r2BucketName = (import.meta.env.VITE_R2_BUCKET_NAME || 'thingor').trim();
export const r2PublicDomain = (import.meta.env.VITE_R2_PUBLIC_DOMAIN || '').trim().replace(/\/$/, '');

export const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey && r2BucketName);

export const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

export async function uploadFileToR2(
  file: File,
  folder: 'photos' | 'documents',
  userId: string
): Promise<{ path?: string; signedUrl?: string; error?: string }> {
  if (!isR2Configured || !r2Client) {
    return { error: 'Cloudflare R2 is not configured' };
  }

  if (file.size > 15 * 1024 * 1024) {
    return { error: 'File size exceeds 15MB limit' };
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${folder}/${Date.now()}_${sanitizedName}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: filePath,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'application/octet-stream',
    });

    await r2Client.send(command);

    let fileUrl = '';
    if (r2PublicDomain) {
      fileUrl = `${r2PublicDomain}/${filePath}`;
    } else {
      const getCommand = new GetObjectCommand({
        Bucket: r2BucketName,
        Key: filePath,
      });
      fileUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 31536000 });
    }

    return { path: filePath, signedUrl: fileUrl };
  } catch (err: any) {
    return { error: err.message || 'Cloudflare R2 upload failed' };
  }
}

export async function getR2FileSignedUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }

  if (!isR2Configured || !r2Client) return pathOrUrl;

  if (r2PublicDomain) {
    return `${r2PublicDomain}/${pathOrUrl}`;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: pathOrUrl,
    });
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  } catch (e) {
    return pathOrUrl;
  }
}

export async function deleteFileFromR2(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!isR2Configured || !r2Client || !filePath) {
    return { success: false, error: 'Cloudflare R2 is not configured or path is empty' };
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: filePath,
    });
    await r2Client.send(command);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Cloudflare R2 delete failed' };
  }
}
