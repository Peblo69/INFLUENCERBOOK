/**
 * kiara-runway Edge Function
 * Full RunwayML API integration: image gen, video gen, character performance,
 * sound effects, TTS, speech-to-speech, voice dubbing, voice isolation
 *
 * All endpoints are task-based: POST to create → poll GET /v1/tasks/{id} → get output
 *
 * Actions:
 *   Fast (polled internally):  text-to-image, sound-effect, text-to-speech, voice-isolation
 *   Slow (returns task_id):    image-to-video, character-performance, speech-to-speech, voice-dubbing
 *   Utility:                   task-status, cancel-task, organization
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ── Environment ──────────────────────────────────────────────────────────────

const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const KIARA_INTELLIGENCE_TOKEN = Deno.env.get("KIARA_INTELLIGENCE_TOKEN") ?? "";
const KIARA_ALLOW_LOCALHOST =
  (Deno.env.get("KIARA_ALLOW_LOCALHOST") ?? "true").toLowerCase() !== "false";

console.log(`[kiara-runway] booted, api_key_configured=${RUNWAY_API_KEY.length > 0}`);

const RUNWAY_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = "2024-11-06";
const POLL_INTERVAL_MS = 5000;           // RunwayML requires >= 5s between polls
const FAST_POLL_TIMEOUT_MS = 120000;     // 2 min for fast actions (images, audio)
const SIGNED_URL_TTL = 86400;            // 24 hours
const STORAGE_BUCKET = "generated-images"; // Reuse existing bucket with subdirs
const DEFAULT_TEXT_IMAGE_RATIO = "1024:1024";
const RUNWAY_MODEL_TO_REGISTRY_MODEL_ID: Record<string, string> = {
  gen4_image_turbo: "kiara-vision",
  gen4_image: "kiara-vision-max",
  "gemini_2.5_flash": "kiara-vision-flash",
};
const RUNWAY_DEFAULT_COST_PER_IMAGE: Record<string, number> = {
  gen4_image_turbo: 18,
  gen4_image: 15,
  "gemini_2.5_flash": 12,
};
const RUNWAY_ALLOWED_TEXT_IMAGE_RATIOS = new Set([
  "1024:1024",
  "1080:1080",
  "1168:880",
  "1360:768",
  "1440:1080",
  "1080:1440",
  "1808:768",
  "1920:1080",
  "1080:1920",
  "2112:912",
  "1280:720",
  "720:1280",
  "720:720",
  "960:720",
  "720:960",
  "1680:720",
]);
const RUNWAY_TEXT_IMAGE_RATIO_ALIASES: Record<string, string> = {
  "1:1": "1024:1024",
  "16:9": "1360:768",
  "9:16": "1080:1920",
  "4:3": "1440:1080",
  "3:4": "1080:1440",
  // Legacy values that were previously sent by the UI.
  "768:1360": "1080:1920",
  "880:1168": "1080:1440",
};

type RehostedMedia = {
  paths: string[];
  signedUrls: string[];
};

// ── CORS ─────────────────────────────────────────────────────────────────────

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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs = 60000
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

/** Authenticated fetch to RunwayML API */
const runwayFetch = async (
  path: string,
  body?: Record<string, unknown> | null,
  method: "GET" | "POST" | "DELETE" = "POST",
  timeoutMs = 30000
): Promise<Response> => {
  const url = `${RUNWAY_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${RUNWAY_API_KEY}`,
    "X-Runway-Version": RUNWAY_VERSION,
  };
  const init: RequestInit = { method, headers };

  if (body && method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  console.log(`[kiara-runway] ${method} ${path}`);
  return withTimeout(url, init, timeoutMs);
};

/** Poll a RunwayML task until SUCCEEDED/FAILED or timeout */
const pollRunwayTask = async (
  taskId: string,
  maxWaitMs = FAST_POLL_TIMEOUT_MS
): Promise<Record<string, any>> => {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await delay(POLL_INTERVAL_MS);

    const res = await runwayFetch(`/tasks/${taskId}`, null, "GET", 15000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Task poll failed (${res.status}): ${err.error || res.statusText}`
      );
    }

    const task = await res.json();
    const status = String(task.status || "").toUpperCase();

    console.log(`[kiara-runway] task ${taskId} → ${status}`);

    if (status === "SUCCEEDED") return task;
    if (status === "FAILED") {
      throw new Error(task.failure || task.failureCode || "Task failed");
    }
    // PENDING, RUNNING, THROTTLED → keep polling
  }

  throw new Error(`Task ${taskId} timed out after ${maxWaitMs / 1000}s`);
};

/** Determine file extension from content-type */
const extFromContentType = (ct: string | null, fallback = "jpg"): string => {
  if (!ct) return fallback;
  if (ct.includes("mp4") || ct.includes("video")) return "mp4";
  if (ct.includes("mp3")) return "mp3";
  if (ct.includes("wav")) return "wav";
  if (ct.includes("ogg")) return "ogg";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  return fallback;
};

/** Download RunwayML outputs and rehost to Supabase storage, return signed URLs */
const rehostToSupabase = async (
  supabase: any,
  userId: string,
  taskId: string,
  urls: string[],
  prefix: string // "runway-image" | "runway-video" | "runway-audio"
): Promise<RehostedMedia> => {
  const paths: string[] = [];
  const signedUrls: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (!url) continue;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[kiara-runway] Failed to fetch output: ${res.status}`);
      // If rehosting fails, return the original URL as fallback
      paths.push(url);
      signedUrls.push(url);
      continue;
    }

    const contentType = res.headers.get("content-type");
    const ext = extFromContentType(contentType);
    const arrayBuffer = await res.arrayBuffer();
    const filePath = `${userId}/${prefix}/${taskId}/${Date.now()}-${i}.${ext}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, new Uint8Array(arrayBuffer), {
        contentType: contentType || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (error || !data?.path) {
      console.error(`[kiara-runway] Storage upload failed:`, error);
      paths.push(url);
      signedUrls.push(url); // Fallback to original
      continue;
    }

    const { data: signed, error: signedErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(data.path, SIGNED_URL_TTL);

    paths.push(data.path);
    signedUrls.push(signedErr || !signed?.signedUrl ? url : signed.signedUrl);
  }

  return { paths, signedUrls };
};

/** Extract output URLs from a succeeded RunwayML task */
const extractOutputUrls = (task: Record<string, any>): string[] => {
  // RunwayML returns output as array of objects with url field, or as array of strings
  const output = task.output;
  if (!output) return [];
  if (Array.isArray(output)) {
    return output
      .map((item: any) => (typeof item === "string" ? item : item?.url))
      .filter(Boolean);
  }
  if (typeof output === "string") return [output];
  if (output.url) return [output.url];
  return [];
};

const extractStoragePathFromSupabaseUrl = (uri: string, bucket: string): string | null => {
  try {
    const url = new URL(uri);
    const patterns = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
    ];

    for (const pattern of patterns) {
      const idx = url.pathname.indexOf(pattern);
      if (idx >= 0) {
        const rawPath = url.pathname.slice(idx + pattern.length);
        return decodeURIComponent(rawPath);
      }
    }
    return null;
  } catch {
    return null;
  }
};

const toSignedRunwayInputUri = async (supabase: any, inputUri: string): Promise<string> => {
  const uri = String(inputUri || "").trim();
  if (!uri) return uri;

  const isHttpUrl = uri.startsWith("http://") || uri.startsWith("https://");
  const storagePath = isHttpUrl
    ? extractStoragePathFromSupabaseUrl(uri, STORAGE_BUCKET)
    : uri.replace(/^\/+/, "");

  if (!storagePath) return uri;

  const { data: signed, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (!error && signed?.signedUrl) return signed.signedUrl;
  return uri;
};

const sanitizeRefTag = (value: unknown, idx: number): string => {
  const raw = typeof value === "string" ? value : `ref_${idx + 1}`;
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+/, "");
  if (!normalized) return `ref_${idx + 1}`;
  if (!/^[a-z]/.test(normalized)) return `ref_${idx + 1}`;
  return normalized.slice(0, 32);
};

const normalizeRunwayTextImageRatio = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_TEXT_IMAGE_RATIO;
  if (RUNWAY_ALLOWED_TEXT_IMAGE_RATIOS.has(raw)) return raw;
  const mapped = RUNWAY_TEXT_IMAGE_RATIO_ALIASES[raw.toLowerCase()];
  return mapped && RUNWAY_ALLOWED_TEXT_IMAGE_RATIOS.has(mapped)
    ? mapped
    : DEFAULT_TEXT_IMAGE_RATIO;
};

const isSupportedRunwayReferenceUri = (value: string): boolean => {
  const uri = String(value || "").trim();
  return (
    uri.startsWith("https://") ||
    uri.startsWith("runway://") ||
    uri.startsWith("data:image/")
  );
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveRegistryModelId = (runwayModel: unknown): string => {
  const model = String(runwayModel || "");
  return RUNWAY_MODEL_TO_REGISTRY_MODEL_ID[model] || RUNWAY_MODEL_TO_REGISTRY_MODEL_ID.gen4_image;
};

const getRunwayCostPerImage = async (
  supabase: any,
  modelId: string,
  runwayModel: string
): Promise<number> => {
  const fallback = RUNWAY_DEFAULT_COST_PER_IMAGE[runwayModel] ?? 0;
  const { data, error } = await supabase
    .from("ai_model_registry")
    .select("cost_per_image")
    .eq("model_id", modelId)
    .maybeSingle();

  if (error) return fallback;
  const parsed = toFiniteNumber(data?.cost_per_image);
  return parsed ?? fallback;
};

const createRunwayImageJob = async (
  supabase: any,
  userId: string,
  modelId: string,
  promptText: string,
  params: Record<string, unknown>,
  referenceImageUrls: string[],
): Promise<string | null> => {
  const { data, error } = await supabase
    .from("ai_generation_jobs")
    .insert({
      user_id: userId,
      model_id: modelId,
      prompt: promptText,
      enhanced_prompt: promptText,
      params,
      reference_image_urls: referenceImageUrls,
      status: "processing",
      processing_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.warn("[kiara-runway] Failed to create ai_generation_jobs row:", error);
    return null;
  }
  return data.id;
};

const markRunwayImageJobFailed = async (
  supabase: any,
  jobId: string,
  message: string,
  durationMs: number
) => {
  await supabase
    .from("ai_generation_jobs")
    .update({
      status: "failed",
      error: message,
      total_duration_ms: durationMs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
};

const completeRunwayImageJob = async (
  supabase: any,
  jobId: string,
  model: string,
  ratio: string,
  seed: number | null,
  taskId: string,
  originalUrls: string[],
  storedPaths: string[],
  durationMs: number,
  costPerImage: number
) => {
  const creditsCharged = Number((Math.max(0, costPerImage) * storedPaths.length).toFixed(4));

  await supabase
    .from("ai_generation_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_duration_ms: durationMs,
      credits_charged: creditsCharged,
      fal_request_id: taskId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (storedPaths.length > 0) {
    const outputs = storedPaths.map((path, index) => ({
      job_id: jobId,
      image_url: path,
      original_url: originalUrls[index] || null,
      seed,
      meta: {
        provider: "runway",
        task_id: taskId,
        model,
        ratio,
      },
    }));

    const { error } = await supabase.from("ai_generation_outputs").insert(outputs);
    if (error) {
      console.warn("[kiara-runway] Failed to store ai_generation_outputs rows:", error);
    }
  }
};

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  // CORS preflight
  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin))
      return new Response("Forbidden", { status: 403 });
    return new Response("ok", { headers: buildCorsHeaders(origin) });
  }

  if (!isOriginAllowed(origin)) {
    return new Response("Forbidden", {
      status: 403,
      headers: buildCorsHeaders(origin),
    });
  }

  // Optional gateway-only lock: set KIARA_INTELLIGENCE_TOKEN in secrets to enforce.
  if (KIARA_INTELLIGENCE_TOKEN) {
    const token = req.headers.get("x-kiara-intelligence-token") ?? "";
    if (token !== KIARA_INTELLIGENCE_TOKEN) {
      return new Response("Forbidden", {
        status: 403,
        headers: buildCorsHeaders(origin),
      });
    }
  }

  const cors = buildCorsHeaders(origin);
  const jsonHeaders = { ...cors, "Content-Type": "application/json" };

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  if (!RUNWAY_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RUNWAY_API_KEY is not configured" }),
      { status: 500, headers: jsonHeaders }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const jwt = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(jwt);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("is_suspended, suspension_reason")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return new Response(JSON.stringify({ error: "Failed to validate account status" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (userProfile?.is_suspended) {
    return new Response(
      JSON.stringify({
        error: "Account suspended",
        reason: userProfile?.suspension_reason || null,
      }),
      {
        status: 403,
        headers: jsonHeaders,
      }
    );
  }

  const body = await req.json();
  const action = String(body.action || "").toLowerCase();

  if (!action) {
    return new Response(
      JSON.stringify({ error: "Missing required field: action" }),
      { status: 400, headers: jsonHeaders }
    );
  }

  try {
    // ════════════════════════════════════════════════════════════════════════
    // TEXT TO IMAGE (fast — polls internally)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "text-to-image") {
      const startedAt = Date.now();
      const promptText = String(body.promptText || "").trim();
      if (!promptText) throw new Error("Missing required field: promptText");

      const model = String(body.model || "gen4_image");
      const registryModelId = resolveRegistryModelId(model);
      const costPerImage = await getRunwayCostPerImage(supabase, registryModelId, model);
      const requestedRatio = String(body.ratio || DEFAULT_TEXT_IMAGE_RATIO).trim();
      const ratio = normalizeRunwayTextImageRatio(requestedRatio);
      if (ratio !== requestedRatio) {
        console.warn(`[kiara-runway] normalized unsupported ratio ${requestedRatio} -> ${ratio}`);
      }
      const payload: Record<string, unknown> = {
        model,
        promptText,
        ratio,
      };

      // referenceImages: required for gen4_image_turbo (min 1), optional for gen4_image/gemini
      const rawReferences = Array.isArray(body.referenceImages)
        ? body.referenceImages.slice(0, 3)
        : [];
      const sourceReferenceUris = rawReferences
        .map((item) =>
          typeof item === "string"
            ? item
            : typeof item?.uri === "string"
            ? item.uri
            : ""
        )
        .filter((value) => Boolean(String(value).trim()));

      const resolvedReferences = (
        await Promise.all(
          rawReferences.map(async (item, idx) => {
            const rawUri =
              typeof item === "string"
                ? item
                : typeof item?.uri === "string"
                ? item.uri
                : "";
            if (!rawUri) return null;
            const uri = String(await toSignedRunwayInputUri(supabase, rawUri)).trim();
            if (!isSupportedRunwayReferenceUri(uri)) {
              console.warn(`[kiara-runway] dropped unsupported reference URI at index=${idx}`);
              return null;
            }
            return {
              uri,
              tag: sanitizeRefTag(
                typeof item === "object" && item ? (item as Record<string, unknown>).tag : undefined,
                idx
              ),
            };
          })
        )
      ).filter(Boolean);

      if (resolvedReferences.length > 0) {
        payload.referenceImages = resolvedReferences;
      } else if (model === "gen4_image_turbo") {
        throw new Error("gen4_image_turbo requires at least 1 reference image. Use gen4_image for text-only generation.");
      }

      if (body.seed != null) payload.seed = Number(body.seed);
      if (body.contentModeration) {
        payload.contentModeration = body.contentModeration;
      }

      console.log(`[kiara-runway] text-to-image model=${model} ratio=${payload.ratio}`);

      const jobId = await createRunwayImageJob(
        supabase,
        user.id,
        registryModelId,
        promptText,
        {
          provider: "runway",
          runway_model: model,
          ratio,
          seed: body.seed ?? null,
          reference_count: resolvedReferences.length,
        },
        sourceReferenceUris
      );

      try {
        const res = await runwayFetch("/text_to_image", payload, "POST", 30000);
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          let errMsg = `RunwayML API error (${res.status})`;
          try {
            const errJson = JSON.parse(errText);
            const detailItems = Array.isArray(errJson?.errors)
              ? errJson.errors
              : Array.isArray(errJson?.details)
              ? errJson.details
              : [];
            const detailText = detailItems
              .map((item: any) => {
                if (typeof item === "string") return item;
                const path = Array.isArray(item?.path) ? item.path.join(".") : "";
                const msg = item?.message || item?.error || "";
                return path && msg ? `${path}: ${msg}` : msg || "";
              })
              .filter(Boolean)
              .join("; ");

            errMsg = errJson.error || errJson.message || errJson.detail || errText || errMsg;
            if (detailText) errMsg = `${errMsg} (${detailText})`;
          } catch { errMsg = errText || errMsg; }
          console.error(`[kiara-runway] text-to-image error ${res.status}:`, errText);
          throw new Error(errMsg);
        }

        const { id: taskId } = await res.json();
        console.log(`[kiara-runway] text-to-image task created: ${taskId}`);

        if (jobId) {
          await supabase
            .from("ai_generation_jobs")
            .update({ fal_request_id: taskId, updated_at: new Date().toISOString() })
            .eq("id", jobId);
        }

        // Poll until done (images are fast, ~10-30s)
        const task = await pollRunwayTask(taskId, FAST_POLL_TIMEOUT_MS);
        const outputUrls = extractOutputUrls(task);

        if (outputUrls.length === 0) throw new Error("No images in task output");

        // Rehost to Supabase
        const rehosted = await rehostToSupabase(
          supabase, user.id, taskId, outputUrls, "runway-image"
        );
        const seed = toFiniteNumber(payload.seed);
        const durationMs = Date.now() - startedAt;

        if (jobId) {
          await completeRunwayImageJob(
            supabase,
            jobId,
            model,
            ratio,
            seed,
            taskId,
            outputUrls,
            rehosted.paths,
            durationMs,
            costPerImage
          );
        }

        const creditsCharged = Number((Math.max(0, costPerImage) * rehosted.paths.length).toFixed(4));
        return new Response(
          JSON.stringify({
            success: true,
            model_id: registryModelId,
            job_id: jobId,
            images: rehosted.signedUrls,
            task_id: taskId,
            credits_charged: creditsCharged,
          }),
          { status: 200, headers: jsonHeaders }
        );
      } catch (error: any) {
        if (jobId) {
          await markRunwayImageJobFailed(
            supabase,
            jobId,
            String(error?.message || "Runway text-to-image failed"),
            Date.now() - startedAt
          );
        }
        throw error;
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // IMAGE TO VIDEO (slow — returns task_id, frontend polls)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "image-to-video") {
      const promptImage = body.promptImage;
      if (!promptImage) throw new Error("Missing required field: promptImage");

      const payload: Record<string, unknown> = {
        model: "gen4_turbo",
        promptImage,
      };

      if (body.promptText) payload.promptText = String(body.promptText).slice(0, 1000);
      if (body.duration) payload.duration = Number(body.duration) === 10 ? 10 : 5;
      if (body.ratio) payload.ratio = body.ratio;
      if (body.seed != null) payload.seed = Number(body.seed);

      console.log(`[kiara-runway] image-to-video duration=${payload.duration || 5}`);

      const res = await runwayFetch("/image_to_video", payload, "POST", 30000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `RunwayML API error (${res.status})`);
      }

      const { id: taskId } = await res.json();
      console.log(`[kiara-runway] image-to-video task created: ${taskId}`);

      // Return immediately — frontend polls via task-status
      return new Response(
        JSON.stringify({
          success: true,
          task_id: taskId,
          status: "PENDING",
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHARACTER PERFORMANCE (slow — returns task_id)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "character-performance") {
      if (!body.character) throw new Error("Missing required field: character");
      if (!body.reference) throw new Error("Missing required field: reference");

      // Build character object
      const character: Record<string, unknown> = typeof body.character === "string"
        ? { type: "image", uri: body.character }
        : body.character;

      // Build reference object
      const reference: Record<string, unknown> = typeof body.reference === "string"
        ? { type: "video", uri: body.reference }
        : body.reference;

      const payload: Record<string, unknown> = {
        model: "act_two",
        character,
        reference,
      };

      if (body.seed != null) payload.seed = Number(body.seed);
      if (body.bodyControl != null) payload.bodyControl = Boolean(body.bodyControl);
      if (body.expressionIntensity != null) {
        payload.expressionIntensity = Math.min(5, Math.max(1, Number(body.expressionIntensity)));
      }
      if (body.ratio) payload.ratio = body.ratio;
      if (body.contentModeration) payload.contentModeration = body.contentModeration;

      console.log(`[kiara-runway] character-performance`);

      const res = await runwayFetch("/character_performance", payload, "POST", 30000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `RunwayML API error (${res.status})`);
      }

      const { id: taskId } = await res.json();
      return new Response(
        JSON.stringify({ success: true, task_id: taskId, status: "PENDING" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // SOUND EFFECT (fast — polls internally)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "sound-effect") {
      const promptText = String(body.promptText || "").trim();
      if (!promptText) throw new Error("Missing required field: promptText");

      const payload: Record<string, unknown> = {
        model: "eleven_text_to_sound_v2",
        promptText,
      };

      if (body.duration != null) {
        payload.duration = Math.min(30, Math.max(0.5, Number(body.duration)));
      }
      if (body.loop != null) payload.loop = Boolean(body.loop);

      console.log(`[kiara-runway] sound-effect`);

      const res = await runwayFetch("/sound_effect", payload, "POST", 30000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `RunwayML API error (${res.status})`);
      }

      const { id: taskId } = await res.json();
      const task = await pollRunwayTask(taskId, FAST_POLL_TIMEOUT_MS);
      const urls = extractOutputUrls(task);
      if (urls.length === 0) throw new Error("No audio in task output");

      const rehosted = await rehostToSupabase(
        supabase, user.id, taskId, urls, "runway-audio"
      );

      return new Response(
        JSON.stringify({ success: true, audio: rehosted.signedUrls[0], task_id: taskId }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEXT TO SPEECH (fast — polls internally)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "text-to-speech") {
      const promptText = String(body.promptText || "").trim();
      if (!promptText) throw new Error("Missing required field: promptText");

      const payload: Record<string, unknown> = {
        model: "eleven_multilingual_v2",
        promptText,
        voice: {
          type: "runway-preset",
          presetId: body.voice || "Maya",
        },
      };

      console.log(`[kiara-runway] text-to-speech voice=${body.voice || "Maya"}`);

      const res = await runwayFetch("/text_to_speech", payload, "POST", 30000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `RunwayML API error (${res.status})`);
      }

      const { id: taskId } = await res.json();
      const task = await pollRunwayTask(taskId, FAST_POLL_TIMEOUT_MS);
      const urls = extractOutputUrls(task);
      if (urls.length === 0) throw new Error("No audio in task output");

      const rehosted = await rehostToSupabase(
        supabase, user.id, taskId, urls, "runway-audio"
      );

      return new Response(
        JSON.stringify({ success: true, audio: rehosted.signedUrls[0], task_id: taskId }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // SPEECH TO SPEECH (slow — returns task_id)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "speech-to-speech") {
      if (!body.media) throw new Error("Missing required field: media");

      // Build media object
      const media: Record<string, unknown> = typeof body.media === "string"
        ? { type: "audio", uri: body.media }
        : body.media;

      const payload: Record<string, unknown> = {
        model: "eleven_multilingual_sts_v2",
        media,
        voice: {
          type: "runway-preset",
          presetId: body.voice || "Maya",
        },
      };

      if (body.removeBackgroundNoise != null) {
        payload.removeBackgroundNoise = Boolean(body.removeBackgroundNoise);
      }

      console.log(`[kiara-runway] speech-to-speech`);

      const res = await runwayFetch("/speech_to_speech", payload, "POST", 30000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `RunwayML API error (${res.status})`);
      }

      const { id: taskId } = await res.json();
      return new Response(
        JSON.stringify({ success: true, task_id: taskId, status: "PENDING" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // VOICE DUBBING (slow — returns task_id)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "voice-dubbing") {
      if (!body.audioUri) throw new Error("Missing required field: audioUri");
      if (!body.targetLang) throw new Error("Missing required field: targetLang");

      const payload: Record<string, unknown> = {
        model: "eleven_voice_dubbing",
        audioUri: body.audioUri,
        targetLang: body.targetLang,
      };

      if (body.disableVoiceCloning != null) {
        payload.disableVoiceCloning = Boolean(body.disableVoiceCloning);
      }
      if (body.dropBackgroundAudio != null) {
        payload.dropBackgroundAudio = Boolean(body.dropBackgroundAudio);
      }
      if (body.numSpeakers != null) {
        payload.numSpeakers = Number(body.numSpeakers);
      }

      console.log(`[kiara-runway] voice-dubbing → ${body.targetLang}`);

      const res = await runwayFetch("/voice_dubbing", payload, "POST", 30000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `RunwayML API error (${res.status})`);
      }

      const { id: taskId } = await res.json();
      return new Response(
        JSON.stringify({ success: true, task_id: taskId, status: "PENDING" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // VOICE ISOLATION (fast — polls internally)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "voice-isolation") {
      if (!body.audioUri) throw new Error("Missing required field: audioUri");

      const payload: Record<string, unknown> = {
        model: "eleven_voice_isolation",
        audioUri: body.audioUri,
      };

      console.log(`[kiara-runway] voice-isolation`);

      const res = await runwayFetch("/voice_isolation", payload, "POST", 30000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `RunwayML API error (${res.status})`);
      }

      const { id: taskId } = await res.json();
      const task = await pollRunwayTask(taskId, FAST_POLL_TIMEOUT_MS);
      const urls = extractOutputUrls(task);
      if (urls.length === 0) throw new Error("No audio in task output");

      const rehosted = await rehostToSupabase(
        supabase, user.id, taskId, urls, "runway-audio"
      );

      return new Response(
        JSON.stringify({ success: true, audio: rehosted.signedUrls[0], task_id: taskId }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // TASK STATUS (for frontend polling of slow actions)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "task-status") {
      const taskId = body.task_id;
      if (!taskId) throw new Error("Missing required field: task_id");

      const res = await runwayFetch(`/tasks/${taskId}`, null, "GET", 15000);
      if (!res.ok) {
        if (res.status === 404) {
          return new Response(
            JSON.stringify({ success: false, error: "Task not found" }),
            { status: 404, headers: jsonHeaders }
          );
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Task status failed (${res.status})`);
      }

      const task = await res.json();
      const status = String(task.status || "").toUpperCase();

      const result: Record<string, unknown> = {
        success: true,
        task_id: taskId,
        status,
        progress: task.progress ?? null,
        createdAt: task.createdAt ?? null,
      };

      // If succeeded, rehost outputs and include URLs
      if (status === "SUCCEEDED") {
        const outputUrls = extractOutputUrls(task);
        if (outputUrls.length > 0) {
          // Detect media type from first URL or content
          const firstUrl = outputUrls[0];
          const isVideo =
            firstUrl.includes(".mp4") ||
            firstUrl.includes("video") ||
            firstUrl.includes("/v1/image_to_video") ||
            firstUrl.includes("/v1/character_performance");
          const isAudio =
            firstUrl.includes(".mp3") ||
            firstUrl.includes(".wav") ||
            firstUrl.includes("audio") ||
            firstUrl.includes("sound") ||
            firstUrl.includes("speech") ||
            firstUrl.includes("voice");

          const prefix = isVideo
            ? "runway-video"
            : isAudio
            ? "runway-audio"
            : "runway-image";

          const rehosted = await rehostToSupabase(
            supabase, user.id, taskId, outputUrls, prefix
          );

          if (isVideo) {
            result.video = rehosted.signedUrls[0];
          } else if (isAudio) {
            result.audio = rehosted.signedUrls[0];
          } else {
            result.images = rehosted.signedUrls;
          }
          result.output = rehosted.signedUrls;
        }
      }

      if (status === "FAILED") {
        result.error = task.failure || task.failureCode || "Task failed";
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CANCEL TASK
    // ════════════════════════════════════════════════════════════════════════
    if (action === "cancel-task") {
      const taskId = body.task_id;
      if (!taskId) throw new Error("Missing required field: task_id");

      console.log(`[kiara-runway] cancel-task ${taskId}`);

      const res = await runwayFetch(`/tasks/${taskId}`, null, "DELETE", 15000);
      // 204 = success, 404 = already deleted (both fine)
      if (!res.ok && res.status !== 204 && res.status !== 404) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Cancel failed (${res.status})`);
      }

      return new Response(
        JSON.stringify({ success: true, task_id: taskId }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // ORGANIZATION (check credits & usage)
    // ════════════════════════════════════════════════════════════════════════
    if (action === "organization") {
      const res = await runwayFetch("/organization", null, "GET", 15000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Organization fetch failed (${res.status})`);
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ success: true, ...data }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // UNKNOWN ACTION
    // ════════════════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({ error: `Unsupported action: ${action}` }),
      { status: 400, headers: jsonHeaders }
    );
  } catch (error: any) {
    console.error(`[kiara-runway] Error in action=${action}:`, error);
    return new Response(
      JSON.stringify({ error: error?.message || "Request failed" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
