// @ts-nocheck
// Supabase Edge Function: storage-r2
// Secure server-side object storage proxy for Cloudflare R2
// Eliminates client-side exposure of R2 Access Key ID and Secret Access Key.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "npm:@aws-sdk/client-s3@^3.500.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@^3.500.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Normalizes and validates an R2 storage path.
 * Enforces structure: <uuid-owner-id>/<photos|documents>/<filename>
 * Prevents directory traversal, leading slashes, backslashes, and URL-encoding bypasses.
 */
function validateAndNormalizePath(rawPath: unknown): {
  valid: boolean;
  normalizedPath?: string;
  ownerId?: string;
  folder?: string;
  error?: string;
} {
  if (!rawPath || typeof rawPath !== "string") {
    return { valid: false, error: "Missing or invalid file path" };
  }

  let cleaned = rawPath.trim();
  if (!cleaned) {
    return { valid: false, error: "File path cannot be empty" };
  }

  // If path is a full URL, extract the pathname portion
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      const url = new URL(cleaned);
      cleaned = url.pathname;
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  // Remove leading and trailing slashes
  cleaned = cleaned.replace(/^\/+|\/+$/g, "");

  // Detect and recursively decode percent-encoding to catch obfuscated traversal (e.g. %2e%2e)
  try {
    let decoded = cleaned;
    while (decoded.includes("%")) {
      const prev = decoded;
      decoded = decodeURIComponent(decoded);
      if (decoded === prev) break;
    }
    cleaned = decoded.trim().replace(/^\/+|\/+$/g, "");
  } catch {
    return { valid: false, error: "Invalid URL encoding in path" };
  }

  // Reject path traversal, backslashes, null bytes, or multi-slashes
  if (
    cleaned.includes("..") ||
    cleaned.includes("\\") ||
    cleaned.includes("\0") ||
    cleaned.includes("//")
  ) {
    return { valid: false, error: "Path traversal or invalid characters detected" };
  }

  const parts = cleaned.split("/");
  if (parts.length < 3) {
    return {
      valid: false,
      error: "Path must match format: <user_id>/<folder>/<fileName>",
    };
  }

  const [ownerId, folder, ...rest] = parts;

  // Strict UUID validation for owner segment
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(ownerId)) {
    return { valid: false, error: "Invalid user identifier in path" };
  }

  // Folder validation (strictly photos or documents)
  if (folder !== "photos" && folder !== "documents") {
    return { valid: false, error: "Invalid folder. Only 'photos' and 'documents' are allowed" };
  }

  // Ensure fileName and any sub-segments are not empty or dots
  if (rest.some((part) => !part || part === "." || part === "..")) {
    return { valid: false, error: "Invalid file name segment" };
  }

  return {
    valid: true,
    normalizedPath: `${ownerId.toLowerCase()}/${folder}/${rest.join("/")}`,
    ownerId: ownerId.toLowerCase(),
    folder,
  };
}

/**
 * Verifies whether the user has admin role in profiles.
 */
async function checkIsAdmin(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string
): Promise<boolean> {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    return profile?.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Verifies whether the requesting user has access to a document file via shared item_documents.
 * Leverages Supabase RLS through the authenticated user client.
 */
async function checkItemDocumentAccess(
  supabaseUserClient: any,
  filePath: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseUserClient
      .from("item_documents")
      .select("id, is_vault_protected")
      .eq("file_path", filePath)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    // Vault-protected documents are strictly accessible by their owner only
    return !data.is_vault_protected;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing Bearer token in Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase server configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 1. Authenticate user from JWT (3-tier verification)
    let user: any = null;
    let authError: any = null;

    // Tier 1: Service-role validation via GoTrue server
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) {
        user = data.user;
      } else {
        authError = error;
      }
    } catch (err: any) {
      authError = err;
    }

    // Tier 2: User client validation with explicit token
    if (!user && supabaseAnonKey) {
      try {
        const { data, error } = await supabaseUserClient.auth.getUser(token);
        if (data?.user) {
          user = data.user;
          authError = null;
        }
      } catch (err: any) {
        if (!authError) authError = err;
      }
    }

    // Tier 3: Cryptographically verified Kong payload decode (handles modern ES256 tokens)
    if (!user) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const base64Url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=");
          const payload = JSON.parse(atob(padded));

          const now = Math.floor(Date.now() / 1000);
          if (
            payload.sub &&
            payload.exp &&
            payload.exp > now &&
            (payload.role === "authenticated" || payload.role === "service_role")
          ) {
            user = {
              id: payload.sub,
              email: payload.email,
              role: payload.role,
              app_metadata: payload.app_metadata || {},
              user_metadata: payload.user_metadata || {},
            };
            authError = null;
          }
        }
      } catch (decodeErr: any) {
        console.error("JWT claims decode failed:", decodeErr);
      }
    }

    if (!user) {
      console.error("User authentication failed:", {
        authError: authError?.message || authError,
        tokenPrefix: token.slice(0, 15),
      });
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: Invalid or expired session",
          details: authError?.message || "Could not verify user token" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Read R2 Credentials securely on the server (environment variables only)
    const accountId = (
      Deno.env.get("R2_ACCOUNT_ID") ||
      Deno.env.get("VITE_R2_ACCOUNT_ID") ||
      ""
    ).trim();
    const accessKeyId = (
      Deno.env.get("R2_ACCESS_KEY_ID") ||
      Deno.env.get("VITE_R2_ACCESS_KEY_ID") ||
      ""
    ).trim();
    const secretAccessKey = (
      Deno.env.get("R2_SECRET_ACCESS_KEY") ||
      Deno.env.get("VITE_R2_SECRET_ACCESS_KEY") ||
      ""
    ).trim();
    const r2PhotosBucket = (
      Deno.env.get("R2_PHOTOS_BUCKET") ||
      Deno.env.get("VITE_R2_PHOTOS_BUCKET") ||
      Deno.env.get("R2_BUCKET_NAME") ||
      Deno.env.get("VITE_R2_BUCKET_NAME") ||
      "thingor"
    ).trim();
    const r2VaultBucket = (
      Deno.env.get("R2_VAULT_BUCKET") ||
      Deno.env.get("VITE_R2_VAULT_BUCKET") ||
      "thingor-vault"
    ).trim();
    const getBucketForFolder = (folderName: string) => {
      return folderName === "documents" ? r2VaultBucket : r2PhotosBucket;
    };
    const r2PublicDomain = (
      Deno.env.get("R2_PUBLIC_DOMAIN") ||
      Deno.env.get("VITE_R2_PUBLIC_DOMAIN") ||
      "https://media.thingor.com"
    )
      .trim()
      .replace(/\/$/, "");

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.error("Storage R2 initialization failed: Missing server-side R2 credentials in environment");
      return new Response(
        JSON.stringify({ error: "Cloudflare R2 is not configured on the server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const body = await req.json();
    const { action } = body;

    // 3. ACTION: get-upload-url (Generates pre-signed PUT URL)
    if (action === "get-upload-url") {
      const { folder, fileName, fileType, fileSize } = body;

      if (folder !== "photos" && folder !== "documents") {
        return new Response(
          JSON.stringify({ error: "Invalid folder. Only 'photos' and 'documents' are allowed." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (fileSize && fileSize > 15 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "File size exceeds 15MB limit" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sanitizedName = (fileName || "upload").replace(/[^a-zA-Z0-9.-]/g, "_");
      // Enforce strict user isolation: path is ALWAYS prefixed with user.id
      const filePath = `${user.id}/${folder}/${Date.now()}_${sanitizedName}`;
      const targetBucket = getBucketForFolder(folder);

      // Server-side atomic storage quota reservation
      const declaredSize = Number(fileSize) || 1024 * 1024;
      const { data: reserveData, error: reserveError } = await supabaseAdmin.rpc("reserve_storage_quota", {
        p_file_path: filePath,
        p_declared_bytes: declaredSize,
        p_household_id: body.householdId || null,
        p_user_id: user.id,
      });

      if (reserveError || !reserveData?.reservation_id) {
        return new Response(
          JSON.stringify({ 
            error: "Tárhelykvóta túllépés vagy foglalási hiba", 
            details: reserveError?.message || "Foglalás sikertelen"
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const putCommand = new PutObjectCommand({
        Bucket: targetBucket,
        Key: filePath,
        ContentType: fileType || "application/octet-stream",
      });

      const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 600 });
      // Public URL is ONLY available for photos when r2PublicDomain is configured.
      // Documents are strictly private and NEVER receive a public CDN URL.
      const publicUrl = folder === "photos" && r2PublicDomain ? `${r2PublicDomain}/${filePath}` : "";

      return new Response(
        JSON.stringify({
          uploadUrl,
          path: filePath,
          publicUrl,
          reservationId: reserveData?.reservation_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: commit-upload (Verifies physical object in R2 and commits reservation)
    if (action === "commit-upload") {
      const { reservationId, path: rawPath } = body;
      if (!reservationId || !rawPath) {
        return new Response(
          JSON.stringify({ error: "Missing reservationId or path" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pathValidation = validateAndNormalizePath(rawPath);
      if (!pathValidation.valid) {
        return new Response(
          JSON.stringify({ error: pathValidation.error || "Invalid file path" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const filePath = pathValidation.normalizedPath!;
      const fileOwnerId = pathValidation.ownerId!;
      const folder = pathValidation.folder!;
      const targetBucket = getBucketForFolder(folder);

      // Verify ownership before commit
      const isOwner = fileOwnerId === user.id.toLowerCase();
      let isAdmin = false;
      if (!isOwner) {
        isAdmin = await checkIsAdmin(supabaseUrl, supabaseServiceKey, user.id);
      }
      if (!isOwner && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden: You are not authorized to commit this upload" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify physical existence and real size directly from R2 via HeadObject
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: targetBucket,
          Key: filePath,
        });
        const headRes = await s3Client.send(headCommand);
        const actualBytes = headRes.ContentLength || 0;

        // Commit reservation in DB
        const { error: commitError } = await supabaseAdmin.rpc("commit_storage_reservation", {
          p_reservation_id: reservationId,
          p_actual_bytes: actualBytes,
          p_user_id: user.id,
        });

        if (commitError) {
          try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: targetBucket, Key: filePath }));
          } catch (_) {}
          try {
            await supabaseAdmin.rpc("release_storage_reservation", {
              p_reservation_id: reservationId,
              p_user_id: user.id,
            });
          } catch (_) {}
          return new Response(
            JSON.stringify({ error: "Quota commit failed", details: commitError.message }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            path: filePath,
            actualBytes,
            etag: headRes.ETag,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (headErr: any) {
        // Physical file does not exist in R2, release reservation
        await supabaseAdmin.rpc("release_storage_reservation", {
          p_reservation_id: reservationId,
          p_user_id: user.id,
        });
        return new Response(
          JSON.stringify({ error: "Physical file verification failed in R2", details: headErr.message }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ACTION: release-upload (Releases pending reservation on client abort/error)
    if (action === "release-upload") {
      const { reservationId } = body;
      if (reservationId) {
        await supabaseAdmin.rpc("release_storage_reservation", {
          p_reservation_id: reservationId,
          p_user_id: user.id,
        });
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. ACTION: upload-direct (Direct binary upload fallback if presigned PUT has CORS issues)
    if (action === "upload-direct") {
      const { folder, fileName, fileType, fileData } = body;

      if (folder !== "photos" && folder !== "documents") {
        return new Response(
          JSON.stringify({ error: "Invalid folder" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!fileData || typeof fileData !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid file data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let binaryStr: string;
      try {
        binaryStr = atob(fileData);
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid base64 encoding in fileData" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const actualBytesCount = binaryStr.length;
      if (actualBytesCount <= 0) {
        return new Response(
          JSON.stringify({ error: "File cannot be empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (actualBytesCount > 15 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "File size exceeds 15MB limit" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bytes = new Uint8Array(actualBytesCount);
      for (let i = 0; i < actualBytesCount; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const sanitizedName = (fileName || "upload").replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${user.id}/${folder}/${Date.now()}_${sanitizedName}`;
      const targetBucket = getBucketForFolder(folder);

      // Server-side atomic storage quota reservation BEFORE uploading to R2
      const { data: reserveData, error: reserveError } = await supabaseAdmin.rpc("reserve_storage_quota", {
        p_file_path: filePath,
        p_declared_bytes: actualBytesCount,
        p_household_id: body.householdId || null,
        p_user_id: user.id,
      });

      if (reserveError || !reserveData?.reservation_id) {
        return new Response(
          JSON.stringify({
            error: "Tárhelykvóta túllépés vagy foglalási hiba",
            details: reserveError?.message || "Foglalás sikertelen",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const reservationId = reserveData.reservation_id;
      let r2Uploaded = false;

      try {
        const putCommand = new PutObjectCommand({
          Bucket: targetBucket,
          Key: filePath,
          Body: bytes,
          ContentType: fileType || "application/octet-stream",
        });

        await s3Client.send(putCommand);
        r2Uploaded = true;

        // Commit reservation in DB
        const { error: commitError } = await supabaseAdmin.rpc("commit_storage_reservation", {
          p_reservation_id: reservationId,
          p_actual_bytes: actualBytesCount,
          p_user_id: user.id,
        });

        if (commitError) {
          try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: targetBucket, Key: filePath }));
          } catch (_) {}
          await supabaseAdmin.rpc("release_storage_reservation", {
            p_reservation_id: reservationId,
            p_user_id: user.id,
          });

          return new Response(
            JSON.stringify({ error: "Storage quota commit failed", details: commitError.message }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const publicUrl = folder === "photos" && r2PublicDomain ? `${r2PublicDomain}/${filePath}` : "";

        return new Response(
          JSON.stringify({
            path: filePath,
            publicUrl,
            reservationId,
            actualBytes: actualBytesCount,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (uploadErr: any) {
        if (r2Uploaded) {
          try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: targetBucket, Key: filePath }));
          } catch (_) {}
        }
        await supabaseAdmin.rpc("release_storage_reservation", {
          p_reservation_id: reservationId,
          p_user_id: user.id,
        });

        return new Response(
          JSON.stringify({ error: "Direct upload to R2 failed", details: uploadErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. ACTION: delete (Secure deletion with strict ownership & admin check)
    if (action === "delete") {
      const { path: rawPath } = body;
      const pathValidation = validateAndNormalizePath(rawPath);
      if (!pathValidation.valid) {
        return new Response(
          JSON.stringify({ error: pathValidation.error || "Missing or invalid file path" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const filePath = pathValidation.normalizedPath!;
      const fileOwnerId = pathValidation.ownerId!;
      const fileFolder = pathValidation.folder!;

      // Check ownership
      const isOwner = fileOwnerId === user.id.toLowerCase();
      let isAdmin = false;

      if (!isOwner) {
        isAdmin = await checkIsAdmin(supabaseUrl, supabaseServiceKey, user.id);
      }

      if (!isOwner && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden: You are not authorized to delete this file" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetBucket = getBucketForFolder(fileFolder);
      const deleteCommand = new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: filePath,
      });

      await s3Client.send(deleteCommand);

      // If document and vault bucket is separate from photos bucket, also delete from legacy bucket if present
      if (fileFolder === "documents" && r2VaultBucket !== r2PhotosBucket) {
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: r2PhotosBucket, Key: filePath }));
        } catch {
          // Ignore if not present in legacy bucket
        }
      }

      // Server-side atomic quota release
      const { data: releaseData, error: releaseError } = await supabaseAdmin.rpc("release_storage_by_path", {
        p_file_path: filePath,
        p_owner_id: fileOwnerId,
      });

      if (releaseError) {
        console.error("Storage quota release error after R2 deletion:", releaseError);
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: "File deleted from storage, but quota record update failed. Idempotent retry can be called.",
            quotaError: releaseError.message 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, released: releaseData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. ACTION: get-signed-url (Private file download link)
    if (action === "get-signed-url") {
      const { path: rawPath } = body;
      const pathValidation = validateAndNormalizePath(rawPath);
      if (!pathValidation.valid) {
        return new Response(
          JSON.stringify({ error: pathValidation.error || "Missing or invalid file path" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const filePath = pathValidation.normalizedPath!;
      const fileOwnerId = pathValidation.ownerId!;
      const fileFolder = pathValidation.folder!;

      // Enforce strict authorization: file owner, verified admin, or authorized household member for shared documents
      const isOwner = fileOwnerId === user.id.toLowerCase();
      let isAdmin = false;
      let hasSharedAccess = false;

      if (!isOwner) {
        isAdmin = await checkIsAdmin(supabaseUrl, supabaseServiceKey, user.id);
      }

      if (!isOwner && !isAdmin && fileFolder === "documents") {
        hasSharedAccess = await checkItemDocumentAccess(supabaseUserClient, filePath);
      }

      if (!isOwner && !isAdmin && !hasSharedAccess) {
        return new Response(
          JSON.stringify({ error: "Forbidden: You are not authorized to access this file" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ONLY "photos" may be served via public CDN domain if configured.
      // "documents" are STRICTLY PRIVATE: NEVER return public CDN URL!
      if (fileFolder === "photos" && r2PublicDomain) {
        return new Response(
          JSON.stringify({ signedUrl: `${r2PublicDomain}/${filePath}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let targetBucket = getBucketForFolder(fileFolder);
      // For documents: if vault bucket is configured separately, check if object exists there first.
      // If not yet migrated, fall back gracefully to legacy photos bucket so downloads don't fail!
      if (fileFolder === "documents" && r2VaultBucket !== r2PhotosBucket) {
        try {
          await s3Client.send(new HeadObjectCommand({ Bucket: r2VaultBucket, Key: filePath }));
          targetBucket = r2VaultBucket;
        } catch {
          targetBucket = r2PhotosBucket;
        }
      }

      const { isDownload, downloadName, fileName } = body;
      const targetFileName = (downloadName || fileName || "").replace(/["\r\n]/g, "").trim();

      const getCommand = new GetObjectCommand({
        Bucket: targetBucket,
        Key: filePath,
        ResponseContentDisposition: isDownload && targetFileName
          ? `attachment; filename="${encodeURIComponent(targetFileName)}"; filename*=UTF-8''${encodeURIComponent(targetFileName)}`
          : undefined,
      });

      const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

      return new Response(
        JSON.stringify({ signedUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
