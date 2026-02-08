import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET_NAME = "training-images";
const DEFAULT_EXPIRES_IN = 60 * 60; // 1 hour

const allowedOrigins = (Deno.env.get("KIARA_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin: string) =>
  allowedOrigins.length === 0 || allowedOrigins.includes(origin);

const buildCorsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": allowedOrigins.length === 0 ? "*" : origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const extractPath = (rawPath: string): string => {
  if (!rawPath) return "";

  if (rawPath.startsWith("http")) {
    try {
      const url = new URL(rawPath);
      const parts = url.pathname.split("/").filter(Boolean);
      const bucketIndex = parts.indexOf(BUCKET_NAME);
      if (bucketIndex >= 0) {
        return parts.slice(bucketIndex + 1).join("/");
      }
    } catch {
      return "";
    }
  }

  if (rawPath.startsWith(`${BUCKET_NAME}/`)) {
    return rawPath.slice(`${BUCKET_NAME}/`.length);
  }

  return rawPath;
};

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) {
      return new Response("Forbidden", { status: 403 });
    }
    return new Response("ok", { headers: buildCorsHeaders(origin) });
  }

  if (!isOriginAllowed(origin)) {
    return new Response("Forbidden", { status: 403, headers: buildCorsHeaders(origin) });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const expiresIn = Math.max(60, Math.min(Number(body.expiresIn) || DEFAULT_EXPIRES_IN, 60 * 60 * 24));

  if (body.path) {
    const normalizedPath = extractPath(String(body.path));

    if (!normalizedPath || !normalizedPath.startsWith(`${user.id}/`)) {
      return new Response(
        JSON.stringify({ error: "Invalid path" }),
        { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(normalizedPath, expiresIn);

    if (error || !data?.signedUrl) {
      return new Response(
        JSON.stringify({ error: error?.message || "Failed to create signed URL" }),
        { status: 500, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ path: normalizedPath, url: data.signedUrl, expires_in: expiresIn }),
      { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  if (Array.isArray(body.paths)) {
    const normalizedPaths = body.paths
      .map((value: unknown) => extractPath(String(value)))
      .filter((value: string) => value && value.startsWith(`${user.id}/`));

    if (normalizedPaths.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid paths provided" }),
        { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .createSignedUrls(normalizedPaths, expiresIn);

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message || "Failed to create signed URLs" }),
        { status: 500, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const urls = data
      .filter((item) => item.signedUrl)
      .map((item) => ({ path: item.path, url: item.signedUrl, expires_in: expiresIn }));

    return new Response(
      JSON.stringify({ urls }),
      { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Missing required field: path or paths" }),
    { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
  );
});
