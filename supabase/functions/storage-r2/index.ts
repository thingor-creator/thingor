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
} from "npm:@aws-sdk/client-s3@^3.500.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@^3.500.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const r2BucketName = (
      Deno.env.get("R2_BUCKET_NAME") ||
      Deno.env.get("VITE_R2_BUCKET_NAME") ||
      "thingor"
    ).trim();
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

      const putCommand = new PutObjectCommand({
        Bucket: r2BucketName,
        Key: filePath,
        ContentType: fileType || "application/octet-stream",
      });

      const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 600 });
      const publicUrl = r2PublicDomain ? `${r2PublicDomain}/${filePath}` : uploadUrl;

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

      const putCommand = new PutObjectCommand({
        Bucket: r2BucketName,
        Key: filePath,
        Body: bytes,
        ContentType: fileType || "application/octet-stream",
      });

      await s3Client.send(putCommand);
      const publicUrl = r2PublicDomain ? `${r2PublicDomain}/${filePath}` : "";

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
      const { path: filePath } = body;

      if (!filePath || typeof filePath !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid file path" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check ownership
      const isOwner = filePath.startsWith(`${user.id}/`);
      let isAdmin = false;

      if (!isOwner) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        isAdmin = profile?.role === "admin";
      }

      if (!isOwner && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden: You are not authorized to delete this file" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: r2BucketName,
        Key: filePath,
      });

      await s3Client.send(deleteCommand);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. ACTION: get-signed-url (Private file download link)
    if (action === "get-signed-url") {
      const { path: filePath } = body;
      if (!filePath) {
        return new Response(
          JSON.stringify({ error: "Missing file path" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (r2PublicDomain) {
        return new Response(
          JSON.stringify({ signedUrl: `${r2PublicDomain}/${filePath}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const getCommand = new GetObjectCommand({
        Bucket: r2BucketName,
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
