// @ts-nocheck
// Supabase Edge Function: storage-r2
// Secure server-side object storage proxy for Cloudflare R2
// Eliminates client-side exposure of R2 Access Key ID and Secret Access Key.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase server configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate user from JWT
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Read R2 Credentials securely on the server
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
      ""
    )
      .trim()
      .replace(/\/$/, "");

    if (!accountId || !accessKeyId || !secretAccessKey) {
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
        }),
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

      if (!fileData) {
        return new Response(
          JSON.stringify({ error: "Missing file data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const binaryStr = atob(fileData);
      const len = binaryStr.length;
      if (len > 15 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "File size exceeds 15MB limit" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const sanitizedName = (fileName || "upload").replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${user.id}/${folder}/${Date.now()}_${sanitizedName}`;

      const targetBucket = getBucketForFolder(folder);
      const putCommand = new PutObjectCommand({
        Bucket: targetBucket,
        Key: filePath,
        Body: bytes,
        ContentType: fileType || "application/octet-stream",
      });

      await s3Client.send(putCommand);
      // Public URL is ONLY available for photos when r2PublicDomain is configured.
      const publicUrl = folder === "photos" && r2PublicDomain ? `${r2PublicDomain}/${filePath}` : "";

      return new Response(
        JSON.stringify({
          path: filePath,
          publicUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      return new Response(
        JSON.stringify({ success: true }),
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

      // Enforce strict authorization: file owner or verified admin
      const isOwner = fileOwnerId === user.id.toLowerCase();
      let isAdmin = false;

      if (!isOwner) {
        isAdmin = await checkIsAdmin(supabaseUrl, supabaseServiceKey, user.id);
      }

      if (!isOwner && !isAdmin) {
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

      const getCommand = new GetObjectCommand({
        Bucket: targetBucket,
        Key: filePath,
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
