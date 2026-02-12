import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const KIARA_INTELLIGENCE_TOKEN = Deno.env.get("KIARA_INTELLIGENCE_TOKEN") ?? "";
const KIARA_ALLOW_LOCALHOST =
  (Deno.env.get("KIARA_ALLOW_LOCALHOST") ?? "true").toLowerCase() !== "false";

const normalizeOrigin = (value: string) =>
  String(value || "").trim().replace(/\/+$/, "").toLowerCase();

const allowedOrigins = (Deno.env.get("KIARA_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => normalizeOrigin(o))
  .filter(Boolean);

const isLocalDevOrigin = (origin: string) =>
  origin.startsWith("http://localhost:") ||
  origin.startsWith("https://localhost:") ||
  origin.startsWith("http://127.0.0.1:") ||
  origin.startsWith("https://127.0.0.1:");

const isOriginAllowed = (origin: string) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;
  if (KIARA_ALLOW_LOCALHOST && isLocalDevOrigin(normalized)) return true;
  return allowedOrigins.length === 0 || allowedOrigins.includes(normalized);
};

const buildCorsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": allowedOrigins.length === 0 ? "*" : origin || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-kiara-memory-strategy, x-kiara-memory-count, x-kiara-memory-debug, x-kiara-server-timing",
});

const RUNWAY_ACTIONS = new Set([
  "text-to-image",
  "image-to-video",
  "character-performance",
  "sound-effect",
  "text-to-speech",
  "speech-to-speech",
  "voice-dubbing",
  "voice-isolation",
  "task-status",
  "cancel-task",
  "organization",
]);
const VISION_ACTIONS = new Set(RUNWAY_ACTIONS);

const json = (status: number, body: Record<string, unknown>, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
  });

const copyUpstreamHeaders = (upstream: Headers, origin: string): Headers => {
  const headers = new Headers(buildCorsHeaders(origin));
  const contentType = upstream.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const cacheControl = upstream.get("cache-control");
  if (cacheControl) headers.set("Cache-Control", cacheControl);

  for (const key of [
    "x-kiara-memory-strategy",
    "x-kiara-memory-count",
    "x-kiara-memory-debug",
    "x-kiara-server-timing",
  ]) {
    const value = upstream.get(key);
    if (value) headers.set(key, value);
  }

  return headers;
};

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) return new Response("Forbidden", { status: 403 });
    return new Response("ok", { headers: buildCorsHeaders(origin) });
  }

  if (!isOriginAllowed(origin)) {
    return new Response("Forbidden", { status: 403, headers: buildCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, origin);
  }

  if (!SUPABASE_URL) {
    return json(500, { error: "SUPABASE_URL is not configured" }, origin);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return json(401, { error: "Unauthorized" }, origin);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json(400, { error: "Invalid JSON body" }, origin);
  }

  const route = String((body as Record<string, unknown>).route || "").toLowerCase();
  const action = String((body as Record<string, unknown>).action || "").toLowerCase();
  const payloadValue = (body as Record<string, unknown>).payload;
  const payload =
    payloadValue && typeof payloadValue === "object" && !Array.isArray(payloadValue)
      ? { ...(payloadValue as Record<string, unknown>) }
      : {};

  let targetFunction = "";
  let targetBody: Record<string, unknown> = payload;

  if (route === "vision") {
    if (!VISION_ACTIONS.has(action)) {
      return json(400, { error: "Unsupported vision action" }, origin);
    }
    targetFunction = "kiara-vision";
    targetBody = { ...payload, action };
  } else if (route === "runway") {
    if (!RUNWAY_ACTIONS.has(action)) {
      return json(400, { error: "Unsupported runway action" }, origin);
    }
    targetFunction = "kiara-runway";
    targetBody = { ...payload, action };
  } else if (route === "assistant") {
    if (action !== "chat") {
      return json(400, { error: "Unsupported assistant action" }, origin);
    }
    targetFunction = "kiara-grok";
    targetBody = { ...payload, action: "chat" };
  } else if (route === "xai") {
    if (!action) {
      return json(400, { error: "Missing xai action" }, origin);
    }
    targetFunction = "kiara-grok";
    targetBody = { ...payload, action };
  } else {
    return json(400, { error: "Unsupported route" }, origin);
  }

  const upstream = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${targetFunction}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
      "x-kiara-intelligence": "1",
      ...(KIARA_INTELLIGENCE_TOKEN
        ? { "x-kiara-intelligence-token": KIARA_INTELLIGENCE_TOKEN }
        : {}),
    },
    body: JSON.stringify(targetBody),
  }).catch((error) => {
    console.error("[kiara-intelligence] upstream request failed:", error);
    return null;
  });

  if (!upstream) {
    return json(502, { error: "Upstream unavailable" }, origin);
  }

  const headers = copyUpstreamHeaders(upstream.headers, origin);
  const contentType = upstream.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  }

  const raw = await upstream.text().catch(() => "");
  return new Response(raw, {
    status: upstream.status,
    headers,
  });
});
