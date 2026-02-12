import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const XAI_API_KEY =
  Deno.env.get("XAI_API_KEY") ??
  Deno.env.get("GROK_API_KEY") ??
  "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const KIARA_INTELLIGENCE_TOKEN = Deno.env.get("KIARA_INTELLIGENCE_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-kiara-memory-strategy, x-kiara-memory-count, x-kiara-memory-debug, x-kiara-server-timing",
};

type MemoryItem = {
  type?: string;
  category?: string;
  content?: string;
  importance?: number;
};

type ProfileMemorySections = {
  likes?: string[];
  dislikes?: string[];
  goals?: string[];
  capabilities?: string[];
  tone?: string[];
};

type MemoryTelemetry = {
  enabled: boolean;
  strategy: string;
  retrievedCount: number;
  usedInPrompt: boolean;
  toneHints: string[];
  memories: Array<{
    id?: string;
    type?: string;
    category?: string;
    content?: string;
    importance?: number;
    confidence?: number;
    reason?: string;
  }>;
};

const extractText = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") {
        return (item as { text: string }).text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
};

const getLatestUserMessage = (messages: unknown): string => {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i] as { role?: string; content?: unknown };
    if (msg?.role === "user") {
      return extractText(msg.content).trim();
    }
  }
  return "";
};

const normalizeStringList = (value: unknown, limit = 6): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().replace(/\s+/g, " ").slice(0, 180);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
    if (output.length >= limit) break;
  }
  return output;
};

const encodeTelemetryHeader = (value: MemoryTelemetry): string => {
  try {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return btoa(binary);
  } catch {
    return "";
  }
};

const buildMemoryBlock = (
  memories: MemoryItem[],
  profileSections: ProfileMemorySections = {},
  toneHints: string[] = [],
): string => {
  const likes = normalizeStringList(profileSections.likes, 4);
  const dislikes = normalizeStringList(profileSections.dislikes, 4);
  const goals = normalizeStringList(profileSections.goals, 4);
  const capabilities = normalizeStringList(profileSections.capabilities, 4);
  const tone = normalizeStringList(profileSections.tone, 4);
  const toneHintsNormalized = normalizeStringList(toneHints, 4);
  const tones = toneHintsNormalized.length ? toneHintsNormalized : tone;

  if (
    memories.length === 0 &&
    likes.length === 0 &&
    dislikes.length === 0 &&
    goals.length === 0 &&
    capabilities.length === 0 &&
    tones.length === 0
  ) {
    return "";
  }

  const sectionMap = new Map<string, string[]>();
  for (const memory of memories) {
    const content = (memory.content ?? "").trim();
    if (!content) continue;

    const key = (memory.category || memory.type || "general").toLowerCase();
    const existing = sectionMap.get(key) ?? [];
    existing.push(content);
    sectionMap.set(key, existing);
  }

  const sections: string[] = [];
  if (likes.length > 0) sections.push(`Likes:\n${likes.map((v) => `- ${v}`).join("\n")}`);
  if (dislikes.length > 0) sections.push(`Dislikes:\n${dislikes.map((v) => `- ${v}`).join("\n")}`);
  if (goals.length > 0) sections.push(`Goals:\n${goals.map((v) => `- ${v}`).join("\n")}`);
  if (capabilities.length > 0) sections.push(`Capabilities:\n${capabilities.map((v) => `- ${v}`).join("\n")}`);
  if (tones.length > 0) sections.push(`Tone Preferences:\n${tones.map((v) => `- ${v}`).join("\n")}`);

  for (const [key, entries] of sectionMap.entries()) {
    const title = key
      .split("_")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    sections.push(`${title}:\n${entries.slice(0, 3).map((v) => `- ${v}`).join("\n")}`);
  }

  return [
    "MEMORY PROFILE (internal, high priority):",
    "Use these as user-specific facts/preferences. If any memory conflicts with a newer user message, prefer the newer message.",
    "Adapt wording and response structure to the user's tone preferences while staying accurate.",
    "",
    ...sections.slice(0, 8),
  ].join("\n");
};

const injectMemoryIntoMessages = (messages: unknown, memoryBlock: string): unknown => {
  if (!memoryBlock || !Array.isArray(messages) || messages.length === 0) return messages;

  const cloned = messages.map((m) => ({ ...(m as Record<string, unknown>) }));
  const systemIndex = cloned.findIndex((m) => m.role === "system");

  if (systemIndex >= 0) {
    const existingContent = cloned[systemIndex].content;
    const systemText = extractText(existingContent);
    cloned[systemIndex].content = `${systemText}\n\n---\n\n${memoryBlock}`.trim();
    return cloned;
  }

  return [{ role: "system", content: memoryBlock }, ...cloned];
};

const filterMessagesForExtraction = (messages: unknown): Array<{ role: string; content: string }> => {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((msg) => {
      const m = msg as { role?: string; content?: unknown };
      return {
        role: typeof m.role === "string" ? m.role : "",
        content: extractText(m.content).trim(),
      };
    })
    .filter((m) => m.role === "user" && m.content.length > 0)
    .slice(-20);
};

const DEFAULT_NON_THINKING_MODEL = "grok-4-1-fast-non-reasoning";
const MEMORY_RETRIEVAL_TIMEOUT_MS = 450;
const CASUAL_USER_MESSAGE_PATTERN =
  /^(?:hi|hello|hey|yo|sup|what'?s up|thanks|thank you|thx|ok|okay|cool|nice|great|got it|understood|lol|lmao|bye|goodbye)[.!?\s]*$/i;

const nowMs = (): number => performance.now();

const toTimingPart = (label: string, value: number): string =>
  `${label}=${Math.max(0, Math.round(value))}`;

const normalizeModel = (value: unknown): string => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return DEFAULT_NON_THINKING_MODEL;
  if (raw.includes("reason")) return DEFAULT_NON_THINKING_MODEL;
  if (raw === "grok-4-fast" || raw === "grok-4.1" || raw === "grok-4-1") {
    return DEFAULT_NON_THINKING_MODEL;
  }
  return raw.startsWith("grok-4") ? DEFAULT_NON_THINKING_MODEL : DEFAULT_NON_THINKING_MODEL;
};

const shouldRetrieveMemory = (message: string): boolean => {
  const trimmed = String(message || "").trim();
  if (!trimmed) return false;
  if (trimmed.length < 18) return false;
  if (CASUAL_USER_MESSAGE_PATTERN.test(trimmed)) return false;
  return true;
};

/**
 * Convert a Responses API SSE event block into chat completions SSE format.
 * Handles both the Responses API format (response.output_text.delta) and
 * the chat completions format (choices[0].delta.content) for compatibility.
 */
const convertResponsesEvent = (eventBlock: string): string | null => {
  const lines = eventBlock.split("\n");
  let dataPayload = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) {
      dataPayload += trimmed.slice(5).trim();
    }
  }

  if (!dataPayload || dataPayload === "[DONE]") {
    return "data: [DONE]\n\n";
  }

  try {
    const parsed = JSON.parse(dataPayload);

    // Already in chat completions format? Pass through.
    if (parsed.choices) {
      return `data: ${dataPayload}\n\n`;
    }

    // Responses API: text delta
    if (parsed.type === "response.output_text.delta" && typeof parsed.delta === "string") {
      const ccChunk = {
        choices: [{ index: 0, delta: { content: parsed.delta, role: "assistant" } }],
      };
      return `data: ${JSON.stringify(ccChunk)}\n\n`;
    }

    // Responses API: completed / done
    if (parsed.type === "response.completed" || parsed.type === "response.done") {
      return "data: [DONE]\n\n";
    }

    // Responses API: content part delta (alternative format)
    if (parsed.type === "response.content_part.delta" && typeof parsed.delta?.text === "string") {
      const ccChunk = {
        choices: [{ index: 0, delta: { content: parsed.delta.text, role: "assistant" } }],
      };
      return `data: ${JSON.stringify(ccChunk)}\n\n`;
    }

    // Other event types (response.created, response.in_progress, etc.) — skip
    if (typeof parsed.type === "string" && parsed.type.startsWith("response.")) {
      return null;
    }

    // Unknown format — pass through raw
    return `data: ${dataPayload}\n\n`;
  } catch {
    // Not JSON — pass through
    return `data: ${dataPayload}\n\n`;
  }
};

type XaiProxySpec = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
};

const XAI_BASE_URL = "https://api.x.ai";

const getRequiredString = (
  payload: Record<string, unknown>,
  key: string,
  action: string,
): string => {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required field '${key}' for action '${action}'`);
  }
  return value.trim();
};

const toQueryString = (query?: Record<string, unknown>) => {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
};

const buildXaiProxySpec = (
  action: string,
  payload: Record<string, unknown>,
): XaiProxySpec => {
  switch (action) {
    case "chat-completions":
      return { method: "POST", path: "/v1/chat/completions", body: payload };
    case "messages-create":
      return { method: "POST", path: "/v1/messages", body: payload };
    case "completions-legacy":
      return { method: "POST", path: "/v1/completions", body: payload };
    case "complete-legacy":
      return { method: "POST", path: "/v1/complete", body: payload };
    case "chat-deferred-get": {
      const requestId = getRequiredString(payload, "request_id", action);
      return { method: "GET", path: `/v1/chat/deferred-completion/${encodeURIComponent(requestId)}` };
    }
    case "responses-create":
      return { method: "POST", path: "/v1/responses", body: payload };
    case "responses-get": {
      const responseId = getRequiredString(payload, "response_id", action);
      return { method: "GET", path: `/v1/responses/${encodeURIComponent(responseId)}` };
    }
    case "responses-delete": {
      const responseId = getRequiredString(payload, "response_id", action);
      return { method: "DELETE", path: `/v1/responses/${encodeURIComponent(responseId)}` };
    }
    case "images-generate":
      return { method: "POST", path: "/v1/images/generations", body: payload };
    case "images-edit":
      return { method: "POST", path: "/v1/images/edits", body: payload };
    case "videos-generate":
      return { method: "POST", path: "/v1/videos/generations", body: payload };
    case "videos-edit":
      return { method: "POST", path: "/v1/videos/edits", body: payload };
    case "videos-get": {
      const requestId = getRequiredString(payload, "request_id", action);
      return { method: "GET", path: `/v1/videos/${encodeURIComponent(requestId)}` };
    }
    case "api-key":
      return { method: "GET", path: "/v1/api-key" };
    case "models-list":
      return { method: "GET", path: "/v1/models" };
    case "models-get": {
      const modelId = getRequiredString(payload, "model_id", action);
      return { method: "GET", path: `/v1/models/${encodeURIComponent(modelId)}` };
    }
    case "language-models-list":
      return { method: "GET", path: "/v1/language-models" };
    case "language-models-get": {
      const modelId = getRequiredString(payload, "model_id", action);
      return { method: "GET", path: `/v1/language-models/${encodeURIComponent(modelId)}` };
    }
    case "image-generation-models-list":
      return { method: "GET", path: "/v1/image-generation-models" };
    case "image-generation-models-get": {
      const modelId = getRequiredString(payload, "model_id", action);
      return { method: "GET", path: `/v1/image-generation-models/${encodeURIComponent(modelId)}` };
    }
    case "tokenize-text":
      return { method: "POST", path: "/v1/tokenize-text", body: payload };
    case "batches-create":
      return { method: "POST", path: "/v1/batches", body: { name: payload.name } };
    case "batches-list":
      return {
        method: "GET",
        path: "/v1/batches",
        query: {
          limit: payload.limit,
          pagination_token: payload.pagination_token,
        },
      };
    case "batches-get": {
      const batchId = getRequiredString(payload, "batch_id", action);
      return { method: "GET", path: `/v1/batches/${encodeURIComponent(batchId)}` };
    }
    case "batches-list-requests": {
      const batchId = getRequiredString(payload, "batch_id", action);
      return {
        method: "GET",
        path: `/v1/batches/${encodeURIComponent(batchId)}/requests`,
        query: {
          limit: payload.limit,
          pagination_token: payload.pagination_token,
        },
      };
    }
    case "batches-add-requests": {
      const batchId = getRequiredString(payload, "batch_id", action);
      return {
        method: "POST",
        path: `/v1/batches/${encodeURIComponent(batchId)}/requests`,
        body: { batch_requests: payload.batch_requests },
      };
    }
    case "batches-results": {
      const batchId = getRequiredString(payload, "batch_id", action);
      return {
        method: "GET",
        path: `/v1/batches/${encodeURIComponent(batchId)}/results`,
        query: {
          limit: payload.limit,
          pagination_token: payload.pagination_token,
        },
      };
    }
    case "batches-cancel": {
      const batchId = getRequiredString(payload, "batch_id", action);
      return {
        method: "POST",
        path: `/v1/batches/${encodeURIComponent(batchId)}:cancel`,
        body: {},
      };
    }
    default:
      throw new Error(`Unsupported xAI action '${action}'`);
  }
};

const GENERATED_MEDIA_BUCKET = "generated-images";
const GENERATED_MEDIA_SIGNED_URL_TTL_SECONDS = 86400;

const toDisplayName = (modelId: string) =>
  modelId
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const truncateForStorage = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return value;
  if (depth > 4) return "[omitted:depth]";

  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > 120) {
      return `[omitted:data_uri:${value.length}]`;
    }
    if (value.length > 1000) return `${value.slice(0, 500)}...[truncated:${value.length}]`;
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => truncateForStorage(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      output[key] = truncateForStorage(nested, depth + 1);
    }
    return output;
  }

  return String(value);
};

const getPromptFromPayload = (payload: Record<string, unknown>): string => {
  const directPrompt =
    typeof payload.prompt === "string"
      ? payload.prompt.trim()
      : typeof payload.promptText === "string"
      ? payload.promptText.trim()
      : "";
  if (directPrompt) return directPrompt;

  const input = payload.input;
  if (typeof input === "string" && input.trim()) return input.trim();
  if (Array.isArray(input)) {
    for (let i = input.length - 1; i >= 0; i -= 1) {
      const item = input[i] as Record<string, unknown>;
      if (item?.role === "user") {
        const text = extractText(item?.content);
        if (text.trim()) return text.trim();
      }
    }
  }

  return "xAI generation";
};

const getReferenceUrls = (payload: Record<string, unknown>): string[] => {
  const urls: string[] = [];

  const push = (value: unknown) => {
    if (typeof value !== "string") return;
    const normalized = value.trim();
    if (!normalized) return;
    if (!urls.includes(normalized)) urls.push(normalized);
  };

  push(payload.image);
  push((payload.image as Record<string, unknown> | undefined)?.url);
  push(payload.video);
  push((payload.video as Record<string, unknown> | undefined)?.url);

  if (Array.isArray(payload.referenceImages)) {
    for (const item of payload.referenceImages.slice(0, 8)) {
      if (typeof item === "string") push(item);
      if (item && typeof item === "object") push((item as Record<string, unknown>).uri);
    }
  }

  if (Array.isArray(payload.images)) {
    for (const item of payload.images.slice(0, 8)) {
      if (typeof item === "string") push(item);
      if (item && typeof item === "object") push((item as Record<string, unknown>).url);
    }
  }

  return urls.slice(0, 12);
};

const extFromContentType = (contentType: string | null, fallback = "bin"): string => {
  if (!contentType) return fallback;
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("quicktime") || contentType.includes("mov")) return "mov";
  return fallback;
};

const extFromUrl = (url: string, fallback = "bin"): string => {
  const clean = url.split("?")[0];
  const match = clean.match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() || fallback;
};

const safeBase64ToBytes = (value: string): Uint8Array | null => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
};

const createSignedUrlForPath = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  storagePath: string,
): Promise<string> => {
  const { data, error } = await supabaseAdmin.storage
    .from(GENERATED_MEDIA_BUCKET)
    .createSignedUrl(storagePath, GENERATED_MEDIA_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return storagePath;
  return data.signedUrl;
};

const uploadRemoteAsset = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  jobId: string,
  category: "xai-image" | "xai-video",
  sourceUrl: string,
  index: number,
): Promise<{ storagePath: string | null; signedUrl: string; originalUrl: string }> => {
  const fallbackUrl = String(sourceUrl || "").trim();
  if (!fallbackUrl) return { storagePath: null, signedUrl: "", originalUrl: "" };

  try {
    const response = await fetch(fallbackUrl);
    if (!response.ok) {
      return { storagePath: null, signedUrl: fallbackUrl, originalUrl: fallbackUrl };
    }
    const contentType = response.headers.get("content-type");
    const ext = extFromContentType(contentType, extFromUrl(fallbackUrl, category === "xai-video" ? "mp4" : "jpg"));
    const filePath = `${userId}/${category}/${jobId}/${Date.now()}-${index}.${ext}`;
    const bytes = new Uint8Array(await response.arrayBuffer());

    const { data, error } = await supabaseAdmin.storage
      .from(GENERATED_MEDIA_BUCKET)
      .upload(filePath, bytes, {
        contentType: contentType || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (error || !data?.path) {
      return { storagePath: null, signedUrl: fallbackUrl, originalUrl: fallbackUrl };
    }

    const signedUrl = await createSignedUrlForPath(supabaseAdmin, data.path);
    return {
      storagePath: data.path,
      signedUrl,
      originalUrl: fallbackUrl,
    };
  } catch {
    return { storagePath: null, signedUrl: fallbackUrl, originalUrl: fallbackUrl };
  }
};

const uploadBase64Image = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  jobId: string,
  base64Data: string,
  index: number,
): Promise<{ storagePath: string | null; signedUrl: string; originalUrl: string | null }> => {
  const bytes = safeBase64ToBytes(base64Data);
  if (!bytes) return { storagePath: null, signedUrl: "", originalUrl: null };

  const filePath = `${userId}/xai-image/${jobId}/${Date.now()}-${index}.png`;
  const { data, error } = await supabaseAdmin.storage
    .from(GENERATED_MEDIA_BUCKET)
    .upload(filePath, bytes, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: false,
    });

  if (error || !data?.path) {
    return { storagePath: null, signedUrl: "", originalUrl: null };
  }

  const signedUrl = await createSignedUrlForPath(supabaseAdmin, data.path);
  return {
    storagePath: data.path,
    signedUrl,
    originalUrl: null,
  };
};

const ensureModelRegistryEntry = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  modelId: string,
  capabilities: string[],
  defaultCost: number,
): Promise<number> => {
  const normalizedModelId = modelId.trim() || "xai-unknown-model";

  const { data: existing } = await supabaseAdmin
    .from("ai_model_registry")
    .select("cost_per_image")
    .eq("model_id", normalizedModelId)
    .maybeSingle();

  const existingCost = toFiniteNumber(existing?.cost_per_image);
  if (existingCost !== null) return existingCost;

  await supabaseAdmin.from("ai_model_registry").upsert(
    {
      model_id: normalizedModelId,
      display_name: toDisplayName(normalizedModelId),
      description: `xAI model ${normalizedModelId}`,
      provider: "xai",
      provider_model_id: normalizedModelId,
      capabilities,
      default_params: {},
      supports_reference_images: capabilities.includes("image-to-image") || capabilities.includes("video-edit"),
      max_reference_images: 8,
      cost_per_image: defaultCost,
      priority: 50,
      active: true,
      notes: "Auto-registered by kiara-grok xAI proxy",
    },
    { onConflict: "model_id" },
  );

  const { data: created } = await supabaseAdmin
    .from("ai_model_registry")
    .select("cost_per_image")
    .eq("model_id", normalizedModelId)
    .maybeSingle();

  return toFiniteNumber(created?.cost_per_image) ?? defaultCost;
};

const createGenerationJob = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    userId: string;
    modelId: string;
    prompt: string;
    action: string;
    payload: Record<string, unknown>;
    referenceUrls?: string[];
  },
): Promise<string | null> => {
  const { data, error } = await supabaseAdmin
    .from("ai_generation_jobs")
    .insert({
      user_id: params.userId,
      model_id: params.modelId,
      prompt: params.prompt || "xAI generation",
      enhanced_prompt: params.prompt || "xAI generation",
      params: {
        provider: "xai",
        action: params.action,
        payload: truncateForStorage(params.payload),
      },
      reference_image_urls: params.referenceUrls || [],
      status: "processing",
      processing_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.warn("[kiara-grok] failed to create ai_generation_jobs row:", error);
    return null;
  }
  return data.id;
};

const updateGenerationJob = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  jobId: string,
  values: Record<string, unknown>,
) => {
  await supabaseAdmin
    .from("ai_generation_jobs")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", jobId);
};

const estimateMessagesChars = (messages: unknown): number => {
  if (!Array.isArray(messages)) return 0;
  let total = 0;
  for (const item of messages) {
    const msg = item as { content?: unknown };
    total += extractText(msg.content).length;
    if (total > 1_000_000) return 1_000_000;
  }
  return total;
};

type AssistantMetricStatus = "success" | "upstream_error" | "error";

type AssistantMetricParams = {
  userId: string;
  conversationId: string | null;
  requestMode: "stream" | "non_stream";
  apiMode: "chat_completions" | "responses";
  model: string;
  webSearchEnabled: boolean;
  memoryEnabled: boolean;
  memoryStrategy: string;
  memoryRetrievedCount: number;
  usedResponsesApi: boolean;
  requestChars: number;
  responseChars: number | null;
  toolCount: number;
  authMs: number;
  profileMs: number;
  memoryMs: number;
  upstreamMs: number;
  totalMs: number;
  status: AssistantMetricStatus;
  httpStatus: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

const enqueueBackgroundTask = (task: Promise<unknown>) => {
  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (typeof edgeRuntime?.waitUntil === "function") {
    edgeRuntime.waitUntil(task);
    return;
  }
  task.catch((error) => console.warn("[kiara-grok] background task failed:", error));
};

const persistAssistantMetric = (
  supabaseAdmin: ReturnType<typeof createClient>,
  params: AssistantMetricParams,
) => {
  const task = supabaseAdmin
    .from("ai_assistant_request_metrics")
    .insert({
      user_id: params.userId,
      conversation_id: params.conversationId,
      request_mode: params.requestMode,
      api_mode: params.apiMode,
      model: params.model || "grok-4",
      web_search_enabled: params.webSearchEnabled,
      memory_enabled: params.memoryEnabled,
      memory_strategy: params.memoryStrategy || null,
      memory_retrieved_count: Math.max(0, Math.trunc(params.memoryRetrievedCount)),
      used_responses_api: params.usedResponsesApi,
      request_chars: Math.max(0, Math.trunc(params.requestChars)),
      response_chars: params.responseChars === null ? null : Math.max(0, Math.trunc(params.responseChars)),
      tool_count: Math.max(0, Math.trunc(params.toolCount)),
      auth_ms: Math.max(0, Math.trunc(params.authMs)),
      profile_ms: Math.max(0, Math.trunc(params.profileMs)),
      memory_ms: Math.max(0, Math.trunc(params.memoryMs)),
      upstream_ms: Math.max(0, Math.trunc(params.upstreamMs)),
      total_ms: Math.max(0, Math.trunc(params.totalMs)),
      status: params.status,
      http_status: params.httpStatus,
      error_message: params.errorMessage ? String(params.errorMessage).slice(0, 1200) : null,
      metadata: params.metadata || {},
    })
    .then(({ error }) => {
      if (error) {
        console.warn("[kiara-grok] failed to store assistant metric:", error);
      }
    })
    .catch((error) => {
      console.warn("[kiara-grok] failed to store assistant metric:", error);
    });

  enqueueBackgroundTask(task);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestStartedAt = nowMs();
  let authMs = 0;
  let profileMs = 0;
  let memoryMs = 0;
  let upstreamMs = 0;
  const buildServerTiming = () =>
    [
      toTimingPart("auth", authMs),
      toTimingPart("profile", profileMs),
      toTimingPart("memory", memoryMs),
      toTimingPart("upstream", upstreamMs),
      toTimingPart("total", nowMs() - requestStartedAt),
    ].join(",");

  // Optional gateway-only lock: set KIARA_INTELLIGENCE_TOKEN in secrets to enforce.
  if (KIARA_INTELLIGENCE_TOKEN) {
    const token = req.headers.get("x-kiara-intelligence-token") ?? "";
    if (token !== KIARA_INTELLIGENCE_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  if (!XAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "XAI_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const jwt = authHeader.replace("Bearer ", "");
  const authStartedAt = nowMs();
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(jwt);
  authMs = nowMs() - authStartedAt;

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const requestBody = await req.json().catch(() => null);
  if (!requestBody || typeof requestBody !== "object") {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const profileGateStartedAt = nowMs();
  const { data: accountProfile } = await supabaseAdmin
    .from("profiles")
    .select("preferences, is_suspended, suspension_reason")
    .eq("id", user.id)
    .maybeSingle();
  profileMs = nowMs() - profileGateStartedAt;

  if (accountProfile?.is_suspended) {
    return new Response(
      JSON.stringify({
        error: "Account suspended",
        reason: accountProfile?.suspension_reason || null,
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = { ...(requestBody as Record<string, unknown>) };
  const action = String(body.action || "chat").trim().toLowerCase();

  if (action !== "chat") {
    const proxyPayload = { ...body };
    delete proxyPayload.action;
    delete proxyPayload.conversation_id;
    delete proxyPayload.memory_enabled;
    delete proxyPayload.memory_debug;
    delete proxyPayload.web_search;
    delete proxyPayload.web_search_mode;
    delete proxyPayload.web_search_max_results;
    delete proxyPayload.web_search_sources;
    delete proxyPayload.search_parameters;

    const isImageAction = action === "images-generate" || action === "images-edit";
    const isVideoCreateAction = action === "videos-generate" || action === "videos-edit";
    const isVideoStatusAction = action === "videos-get";
    const actionStartedAt = Date.now();

    let generationJobId: string | null = null;
    let generationModelId: string | null = null;
    let costPerOutput = 0;

    if (isImageAction || isVideoCreateAction) {
      generationModelId =
        typeof proxyPayload.model === "string" && proxyPayload.model.trim().length > 0
          ? proxyPayload.model.trim()
          : isImageAction
          ? "grok-imagine-image"
          : "grok-imagine-video";

      costPerOutput = await ensureModelRegistryEntry(
        supabaseAdmin,
        generationModelId,
        isImageAction ? ["text-to-image", "image-to-image"] : ["text-to-video", "image-to-video", "video-edit"],
        isImageAction ? 18 : 90,
      );

      generationJobId = await createGenerationJob(supabaseAdmin, {
        userId: user.id,
        modelId: generationModelId,
        prompt: getPromptFromPayload(proxyPayload),
        action,
        payload: proxyPayload,
        referenceUrls: getReferenceUrls(proxyPayload),
      });
    } else if (isVideoStatusAction) {
      const requestId =
        typeof proxyPayload.request_id === "string" ? proxyPayload.request_id.trim() : "";
      if (requestId) {
        const { data: existingJob } = await supabaseAdmin
          .from("ai_generation_jobs")
          .select("id, model_id")
          .eq("user_id", user.id)
          .eq("fal_request_id", requestId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        generationJobId = existingJob?.id ?? null;
        generationModelId = existingJob?.model_id ?? "grok-imagine-video";
        costPerOutput = await ensureModelRegistryEntry(
          supabaseAdmin,
          generationModelId,
          ["text-to-video", "image-to-video", "video-edit"],
          90,
        );
      }
    }

    let spec: XaiProxySpec;
    try {
      spec = buildXaiProxySpec(action, proxyPayload);
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error?.message || "Unsupported xAI action" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "x-kiara-server-timing": buildServerTiming(),
          },
        },
      );
    }

    const upstreamStartedAt = nowMs();
    const upstreamResponse = await fetch(
      `${XAI_BASE_URL}${spec.path}${toQueryString(spec.query)}`,
      {
        method: spec.method,
        headers: {
          "Authorization": `Bearer ${XAI_API_KEY}`,
          ...(spec.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(spec.body ? { body: JSON.stringify(spec.body) } : {}),
      },
    );
    upstreamMs = nowMs() - upstreamStartedAt;

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => "");
      if (generationJobId) {
        await updateGenerationJob(supabaseAdmin, generationJobId, {
          status: "failed",
          error: errorText || `xAI upstream error (${upstreamResponse.status})`,
          total_duration_ms: Date.now() - actionStartedAt,
        });
      }
      return new Response(
        JSON.stringify({
          error: "xAI upstream error",
          action,
          status: upstreamResponse.status,
          upstream: errorText,
        }),
        {
          status: upstreamResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "x-kiara-server-timing": buildServerTiming(),
          },
        },
      );
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    responseHeaders.set("x-kiara-server-timing", buildServerTiming());

    const contentType = upstreamResponse.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    const raw = await upstreamResponse.text().catch(() => "");
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = raw ? JSON.parse(raw) as Record<string, unknown> : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return new Response(raw, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    if (isImageAction && generationJobId && generationModelId) {
      const rawOutputs = Array.isArray(parsed.data) ? parsed.data : [];
      const transformedOutputs: Array<Record<string, unknown>> = [];
      const outputRows: Array<Record<string, unknown>> = [];

      for (let i = 0; i < rawOutputs.length; i += 1) {
        const rawOutput = rawOutputs[i] as Record<string, unknown>;
        const directUrl = typeof rawOutput?.url === "string" ? rawOutput.url : "";
        const base64 = typeof rawOutput?.b64_json === "string" ? rawOutput.b64_json : "";

        let storagePath: string | null = null;
        let outputUrl = directUrl;
        let originalUrl: string | null = directUrl || null;

        if (directUrl) {
          const uploaded = await uploadRemoteAsset(
            supabaseAdmin,
            user.id,
            generationJobId,
            "xai-image",
            directUrl,
            i,
          );
          storagePath = uploaded.storagePath;
          outputUrl = uploaded.signedUrl || directUrl;
          originalUrl = uploaded.originalUrl || directUrl;
        } else if (base64) {
          const uploaded = await uploadBase64Image(
            supabaseAdmin,
            user.id,
            generationJobId,
            base64,
            i,
          );
          storagePath = uploaded.storagePath;
          outputUrl = uploaded.signedUrl || outputUrl;
          originalUrl = uploaded.originalUrl;
        }

        transformedOutputs.push({
          ...rawOutput,
          ...(outputUrl ? { url: outputUrl } : {}),
        });

        const persistedUrl = storagePath || originalUrl || outputUrl;
        if (persistedUrl) {
          outputRows.push({
            job_id: generationJobId,
            image_url: persistedUrl,
            original_url: originalUrl,
            meta: {
              provider: "xai",
              action,
              model: generationModelId,
              revised_prompt: rawOutput?.revised_prompt ?? null,
            },
          });
        }
      }

      if (outputRows.length > 0) {
        const { error: outputsError } = await supabaseAdmin
          .from("ai_generation_outputs")
          .insert(outputRows);
        if (outputsError) {
          console.warn("[kiara-grok] failed to store xAI image outputs:", outputsError);
        }
      }

      const creditsCharged = Number((Math.max(0, costPerOutput) * outputRows.length).toFixed(4));
      await updateGenerationJob(supabaseAdmin, generationJobId, {
        status: outputRows.length > 0 ? "completed" : "failed",
        completed_at: outputRows.length > 0 ? new Date().toISOString() : null,
        error: outputRows.length > 0 ? null : "No images returned by xAI",
        total_duration_ms: Date.now() - actionStartedAt,
        credits_charged: creditsCharged,
      });

      parsed = {
        ...parsed,
        data: transformedOutputs,
        job_id: generationJobId,
        model_id: generationModelId,
        credits_charged: creditsCharged,
      };
    }

    if (isVideoCreateAction && generationJobId && generationModelId) {
      const requestId =
        typeof parsed.request_id === "string" ? parsed.request_id.trim() : "";

      if (requestId) {
        await updateGenerationJob(supabaseAdmin, generationJobId, {
          fal_request_id: requestId,
          status: "processing",
        });
      } else {
        await updateGenerationJob(supabaseAdmin, generationJobId, {
          status: "failed",
          error: "xAI video generation did not return request_id",
          total_duration_ms: Date.now() - actionStartedAt,
        });
      }

      parsed = {
        ...parsed,
        job_id: generationJobId,
        model_id: generationModelId,
      };
    }

    if (isVideoStatusAction && generationJobId && generationModelId) {
      const status = String(parsed.status || "").toLowerCase();
      const requestId = typeof proxyPayload.request_id === "string" ? proxyPayload.request_id.trim() : "";

      if (status === "pending" || status === "in_progress") {
        await updateGenerationJob(supabaseAdmin, generationJobId, { status: "processing" });
      }

      const upstreamVideoUrl =
        parsed.video && typeof parsed.video === "object" && typeof (parsed.video as Record<string, unknown>).url === "string"
          ? String((parsed.video as Record<string, unknown>).url)
          : "";

      if (status === "done" && upstreamVideoUrl) {
        const { data: existingOutput } = await supabaseAdmin
          .from("ai_generation_outputs")
          .select("image_url")
          .eq("job_id", generationJobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let resolvedVideoUrl = upstreamVideoUrl;

        if (existingOutput?.image_url) {
          resolvedVideoUrl = existingOutput.image_url.startsWith("http")
            ? existingOutput.image_url
            : await createSignedUrlForPath(supabaseAdmin, existingOutput.image_url);
        } else {
          const uploaded = await uploadRemoteAsset(
            supabaseAdmin,
            user.id,
            generationJobId,
            "xai-video",
            upstreamVideoUrl,
            0,
          );

          const storagePath = uploaded.storagePath || upstreamVideoUrl;
          resolvedVideoUrl = uploaded.signedUrl || upstreamVideoUrl;

          const { error: insertOutputError } = await supabaseAdmin
            .from("ai_generation_outputs")
            .insert({
              job_id: generationJobId,
              image_url: storagePath,
              original_url: uploaded.originalUrl || upstreamVideoUrl,
              meta: {
                provider: "xai",
                action,
                model: generationModelId,
                request_id: requestId || null,
                type: "video",
              },
            });

          if (insertOutputError) {
            console.warn("[kiara-grok] failed to store xAI video output:", insertOutputError);
          }
        }

        const creditsCharged = Number(Math.max(0, costPerOutput).toFixed(4));
        await updateGenerationJob(supabaseAdmin, generationJobId, {
          status: "completed",
          completed_at: new Date().toISOString(),
          total_duration_ms: Date.now() - actionStartedAt,
          credits_charged: creditsCharged,
        });

        parsed = {
          ...parsed,
          video: {
            ...(parsed.video as Record<string, unknown>),
            url: resolvedVideoUrl,
          },
          job_id: generationJobId,
          model_id: generationModelId,
          credits_charged: creditsCharged,
        };
      } else if (status === "failed" || parsed.error) {
        await updateGenerationJob(supabaseAdmin, generationJobId, {
          status: "failed",
          error: typeof parsed.error === "string" ? parsed.error : "xAI video task failed",
          total_duration_ms: Date.now() - actionStartedAt,
        });
      }
    }

    responseHeaders.set("Content-Type", "application/json");
    return new Response(JSON.stringify(parsed), {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  body.model = normalizeModel(body.model);
  const userMessage = getLatestUserMessage(body.messages);
  const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;
  const extractionMessages = filterMessagesForExtraction(body.messages);
  const requestChars = estimateMessagesChars(body.messages);
  const profilePreferences =
    accountProfile?.preferences && typeof accountProfile.preferences === "object"
      ? accountProfile.preferences as Record<string, unknown>
      : {};
  let memoryTelemetry: MemoryTelemetry = {
    enabled: false,
    strategy: "disabled",
    retrievedCount: 0,
    usedInPrompt: false,
    toneHints: [],
    memories: [],
  };

  let memoryEnabled = true;
  let memoryDebug = true;
  if (typeof body.memory_enabled === "boolean") {
    memoryEnabled = body.memory_enabled;
  } else {
    const prefEnabled = profilePreferences?.memory_enabled;
    if (typeof prefEnabled === "boolean") {
      memoryEnabled = prefEnabled;
    }
  }
  if (typeof body.memory_debug === "boolean") {
    memoryDebug = body.memory_debug;
  } else {
    const prefDebug = profilePreferences?.ai_settings?.memory_debug;
    if (typeof prefDebug === "boolean") {
      memoryDebug = prefDebug;
    }
  }
  memoryTelemetry.enabled = memoryEnabled;
  memoryTelemetry.strategy = memoryEnabled ? "none" : "disabled";

  if (memoryEnabled && shouldRetrieveMemory(userMessage)) {
    const memoryStartedAt = nowMs();
    const memoryController = new AbortController();
    const memoryTimeout = setTimeout(() => memoryController.abort(), MEMORY_RETRIEVAL_TIMEOUT_MS);
    try {
      const retrieveResponse = await fetch(`${SUPABASE_URL}/functions/v1/retrieve-memories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          ...(SUPABASE_ANON_KEY ? { "apikey": SUPABASE_ANON_KEY } : {}),
        },
        signal: memoryController.signal,
        body: JSON.stringify({
          userMessage,
          maxMemories: 8,
          cooldownHours: 12,
          useSemanticSearch: true,
        }),
      });

      if (retrieveResponse.ok) {
        const retrieveData = await retrieveResponse.json().catch(() => null);
        const memories = Array.isArray(retrieveData?.memories) ? (retrieveData.memories as MemoryItem[]) : [];
        memoryTelemetry.strategy = typeof retrieveData?.search_strategy === "string"
          ? retrieveData.search_strategy
          : "none";
        memoryTelemetry.retrievedCount = memories.length;
        memoryTelemetry.memories = memories.slice(0, 6).map((m) => ({
          id: typeof (m as { id?: unknown }).id === "string" ? (m as { id: string }).id : undefined,
          type: m.type,
          category: m.category,
          content: typeof m.content === "string" ? m.content.slice(0, 220) : m.content,
          importance: m.importance,
          confidence: typeof (m as { confidence?: unknown }).confidence === "number"
            ? (m as { confidence: number }).confidence
            : undefined,
          reason: typeof (m as { reason?: unknown }).reason === "string"
            ? (m as { reason: string }).reason
            : undefined,
        }));
        const profileSections =
          retrieveData?.profile_sections && typeof retrieveData.profile_sections === "object"
            ? (retrieveData.profile_sections as ProfileMemorySections)
            : {};
        const toneHints = Array.isArray(retrieveData?.tone_hints) ? (retrieveData.tone_hints as string[]) : [];
        memoryTelemetry.toneHints = toneHints.slice(0, 4);
        const memoryBlock = buildMemoryBlock(memories, profileSections, toneHints);
        if (memoryBlock.length > 0) {
          body.messages = injectMemoryIntoMessages(body.messages, memoryBlock);
          memoryTelemetry.usedInPrompt = true;
        }
      }
    } catch (error) {
      console.warn("[kiara-grok] Memory retrieval skipped:", error);
      memoryTelemetry.strategy = error instanceof DOMException && error.name === "AbortError"
        ? "timeout"
        : "error";
    } finally {
      clearTimeout(memoryTimeout);
      memoryMs = nowMs() - memoryStartedAt;
    }
  }

  // Web search: use Agent Tools API (search_parameters is deprecated / returns 410)
  const webSearchEnabled = body.web_search === true;
  const requestedApiMode = String(body.api_mode || "").trim().toLowerCase();
  if (webSearchEnabled) {
    // Inject web_search as a tool via the new Agent Tools API
    const existingTools = Array.isArray(body.tools) ? body.tools : [];
    const hasWebSearch = existingTools.some((t: any) => t?.type === "web_search");
    if (!hasWebSearch) {
      existingTools.push({ type: "web_search" });
    }
    body.tools = existingTools;
  }
  // Remove any legacy search_parameters to avoid 410 errors
  delete body.search_parameters;

  // Remove Kiara-internal transport keys before calling xAI.
  delete body.conversation_id;
  delete body.memory_enabled;
  delete body.memory_debug;
  delete body.web_search;
  delete body.web_search_mode;
  delete body.web_search_max_results;
  delete body.web_search_sources;
  delete body.api_mode;
  delete body.action;

  // Use Responses API (/v1/responses) when tools are present (web_search requires it).
  // Otherwise use legacy chat completions which still works for plain chat.
  const useResponsesApi =
    requestedApiMode === "responses" ||
    (Array.isArray(body.tools) && body.tools.some((t: any) => t?.type === "web_search"));
  const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;
  const isStreaming = body.stream === true;
  let apiUrl: string;

  if (useResponsesApi) {
    if (!body.previous_response_id && conversationId) {
      const { data: convo } = await supabaseAdmin
        .from("conversations")
        .select("metadata")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      const metadata = convo?.metadata && typeof convo.metadata === "object"
        ? (convo.metadata as Record<string, unknown>)
        : {};
      if (typeof metadata.xai_response_id === "string" && metadata.xai_response_id.length > 0) {
        body.previous_response_id = metadata.xai_response_id;
      }
    }

    apiUrl = "https://api.x.ai/v1/responses";
    // Responses API uses "input" instead of "messages"
    if (body.messages && !body.input) {
      body.input = body.messages;
      delete body.messages;
    }
    // Responses API doesn't support some chat completions params
    delete body.tool_choice;
  } else {
    delete body.previous_response_id;
    apiUrl = "https://api.x.ai/v1/chat/completions";
  }

  const upstreamStartedAt = nowMs();
  const upstreamResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  upstreamMs = nowMs() - upstreamStartedAt;

  if (memoryEnabled && conversationId && extractionMessages.length > 0) {
    const extractPromise = fetch(`${SUPABASE_URL}/functions/v1/extract-memory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        ...(SUPABASE_ANON_KEY ? { "apikey": SUPABASE_ANON_KEY } : {}),
      },
      body: JSON.stringify({
        conversationId,
        messages: extractionMessages,
      }),
    }).catch((error) => {
      console.warn("[kiara-grok] Memory extraction skipped:", error);
    });

    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (typeof edgeRuntime?.waitUntil === "function") {
      edgeRuntime.waitUntil(extractPromise);
    }
  }

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    const isInvalidJwt =
      upstreamResponse.status === 401 &&
      errorText.toLowerCase().includes("invalid jwt");
    const errorMessage = isInvalidJwt
      ? "XAI API key is missing or invalid. Set XAI_API_KEY (or GROK_API_KEY) in Supabase secrets."
      : "Grok upstream error.";

    persistAssistantMetric(supabaseAdmin, {
      userId: user.id,
      conversationId,
      requestMode: isStreaming ? "stream" : "non_stream",
      apiMode: useResponsesApi ? "responses" : "chat_completions",
      model: typeof body.model === "string" ? body.model : DEFAULT_NON_THINKING_MODEL,
      webSearchEnabled,
      memoryEnabled,
      memoryStrategy: memoryTelemetry.strategy,
      memoryRetrievedCount: memoryTelemetry.retrievedCount,
      usedResponsesApi: useResponsesApi,
      requestChars,
      responseChars: null,
      toolCount,
      authMs,
      profileMs,
      memoryMs,
      upstreamMs,
      totalMs: nowMs() - requestStartedAt,
      status: "upstream_error",
      httpStatus: upstreamResponse.status,
      errorMessage,
      metadata: {
        upstream_error: errorText?.slice(0, 800) || "",
      },
    });

    return new Response(
      JSON.stringify({
        error: errorMessage,
        status: upstreamResponse.status,
        upstream: errorText,
      }),
      {
        status: upstreamResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "x-kiara-server-timing": buildServerTiming(),
        },
      }
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    responseHeaders.set(key, value);
  }
  responseHeaders.set("x-kiara-memory-strategy", memoryTelemetry.strategy);
  responseHeaders.set("x-kiara-memory-count", String(memoryTelemetry.retrievedCount));
  responseHeaders.set("x-kiara-server-timing", buildServerTiming());
  if (memoryDebug) {
    const telemetryHeader = encodeTelemetryHeader(memoryTelemetry);
    if (telemetryHeader) {
      responseHeaders.set("x-kiara-memory-debug", telemetryHeader);
    }
  }

  console.log("[kiara-grok] timing", {
    authMs: Math.round(authMs),
    profileMs: Math.round(profileMs),
    memoryMs: Math.round(memoryMs),
    upstreamMs: Math.round(upstreamMs),
    totalMs: Math.round(nowMs() - requestStartedAt),
    webSearch: webSearchEnabled,
  });

  // If using the Responses API with streaming, transform SSE to chat completions format.
  // The Responses API may use events like "response.output_text.delta" instead of
  // the "choices[0].delta.content" format the frontend expects.
  if (useResponsesApi && isStreaming) {
    const upstreamReader = upstreamResponse.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let sseBuffer = "";

    const transformedStream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await upstreamReader.read();
          if (done) {
            // Flush any remaining buffer
            if (sseBuffer.trim()) {
              const converted = convertResponsesEvent(sseBuffer);
              if (converted) controller.enqueue(encoder.encode(converted));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          sseBuffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (delimited by double newline)
          let idx: number;
          while ((idx = sseBuffer.indexOf("\n\n")) !== -1) {
            const eventBlock = sseBuffer.slice(0, idx);
            sseBuffer = sseBuffer.slice(idx + 2);
            const converted = convertResponsesEvent(eventBlock);
            if (converted) {
              controller.enqueue(encoder.encode(converted));
            }
          }
        } catch (err) {
          console.error("[kiara-grok] stream transform error:", err);
          controller.close();
        }
      },
      cancel() {
        upstreamReader.cancel();
      },
    });

    persistAssistantMetric(supabaseAdmin, {
      userId: user.id,
      conversationId,
      requestMode: "stream",
      apiMode: "responses",
      model: typeof body.model === "string" ? body.model : DEFAULT_NON_THINKING_MODEL,
      webSearchEnabled,
      memoryEnabled,
      memoryStrategy: memoryTelemetry.strategy,
      memoryRetrievedCount: memoryTelemetry.retrievedCount,
      usedResponsesApi: true,
      requestChars,
      responseChars: null,
      toolCount,
      authMs,
      profileMs,
      memoryMs,
      upstreamMs,
      totalMs: nowMs() - requestStartedAt,
      status: "success",
      httpStatus: upstreamResponse.status,
      metadata: {
        stream_transformed: true,
      },
    });

    return new Response(transformedStream, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  // For non-streaming Responses API, convert the response format
  if (useResponsesApi) {
    const responseJson = await upstreamResponse.json();
    // Extract text from Responses API format
    let text = "";
    if (responseJson?.output) {
      for (const item of responseJson.output) {
        if (item?.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c?.type === "output_text" && typeof c.text === "string") {
              text += c.text;
            }
          }
        }
      }
    }
    // Fallback: check for choices format (if xAI uses same format)
    if (!text && responseJson?.choices?.[0]?.message?.content) {
      text = responseJson.choices[0].message.content;
    }

    // Return in chat completions format
    const ccResponse = {
      id: responseJson?.id ?? "resp-" + Date.now(),
      object: "chat.completion",
      model: responseJson?.model ?? body.model,
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage: responseJson?.usage ?? {},
    };

    if (conversationId && typeof responseJson?.id === "string" && responseJson.id.length > 0) {
      const { data: convo } = await supabaseAdmin
        .from("conversations")
        .select("metadata")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      const metadata = convo?.metadata && typeof convo.metadata === "object"
        ? (convo.metadata as Record<string, unknown>)
        : {};

      await supabaseAdmin
        .from("conversations")
        .update({
          metadata: {
            ...metadata,
            xai_response_id: responseJson.id,
            xai_response_model: responseJson?.model ?? body.model ?? null,
            xai_response_updated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("user_id", user.id);
    }

    persistAssistantMetric(supabaseAdmin, {
      userId: user.id,
      conversationId,
      requestMode: "non_stream",
      apiMode: "responses",
      model: typeof body.model === "string" ? body.model : DEFAULT_NON_THINKING_MODEL,
      webSearchEnabled,
      memoryEnabled,
      memoryStrategy: memoryTelemetry.strategy,
      memoryRetrievedCount: memoryTelemetry.retrievedCount,
      usedResponsesApi: true,
      requestChars,
      responseChars: text.length,
      toolCount,
      authMs,
      profileMs,
      memoryMs,
      upstreamMs,
      totalMs: nowMs() - requestStartedAt,
      status: "success",
      httpStatus: 200,
      metadata: {
        response_id: typeof responseJson?.id === "string" ? responseJson.id : null,
      },
    });

    return new Response(JSON.stringify(ccResponse), {
      status: 200,
      headers: { ...Object.fromEntries(responseHeaders.entries()), "Content-Type": "application/json" },
    });
  }

  persistAssistantMetric(supabaseAdmin, {
    userId: user.id,
    conversationId,
    requestMode: isStreaming ? "stream" : "non_stream",
    apiMode: "chat_completions",
    model: typeof body.model === "string" ? body.model : DEFAULT_NON_THINKING_MODEL,
    webSearchEnabled,
    memoryEnabled,
    memoryStrategy: memoryTelemetry.strategy,
    memoryRetrievedCount: memoryTelemetry.retrievedCount,
    usedResponsesApi: false,
    requestChars,
    responseChars: null,
    toolCount,
    authMs,
    profileMs,
    memoryMs,
    upstreamMs,
    totalMs: nowMs() - requestStartedAt,
    status: "success",
    httpStatus: upstreamResponse.status,
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
});
