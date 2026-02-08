/**
 * kiara-generate Edge Function
 * Unified image generation with model_id routing and job persistence
 * Supports: model_id (new) or provider (legacy backward compat)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const FAL_API_KEY = Deno.env.get("FAL_API_KEY") ?? "";
const RUNNINGHUB_API_KEY = Deno.env.get("RUNNINGHUB_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FAL_BASE_URL = "https://fal.run";
const RUNNINGHUB_BASE_URL = "https://www.runninghub.ai";
const RUNNINGHUB_DEFAULT_HOST = "www.runninghub.ai";
const RUNNINGHUB_POLL_INTERVAL_MS = Number(Deno.env.get("RUNNINGHUB_POLL_INTERVAL_MS") ?? "1200");
const RUNNINGHUB_POLL_TIMEOUT_MS = Number(Deno.env.get("RUNNINGHUB_POLL_TIMEOUT_MS") ?? "180000");
const SIGNED_URL_TTL = Number(Deno.env.get("KIARA_SIGNED_URL_TTL_SECONDS") ?? "86400");
const RATE_LIMIT_WINDOW_SECONDS = Number(Deno.env.get("KIARA_RATE_LIMIT_WINDOW_SECONDS") ?? "60");
const RATE_LIMIT_MAX_REQUESTS = Number(Deno.env.get("KIARA_RATE_LIMIT_MAX_REQUESTS") ?? "20");

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

const withTimeout = async (url: string, options: RequestInit, timeoutMs = 60000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseSizeToDimensions = (size?: string) => {
  if (!size) return null;
  const parts = size.split("*");
  if (parts.length !== 2) return null;
  const width = Number(parts[0]);
  const height = Number(parts[1]);
  if (Number.isNaN(width) || Number.isNaN(height)) return null;
  return { width, height };
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
};

const clampNumber = (value: number, min?: number, max?: number) => {
  let next = value;
  if (typeof min === "number") next = Math.max(next, min);
  if (typeof max === "number") next = Math.min(next, max);
  return next;
};

const applyParamSchema = (
  params: Record<string, any>,
  schema?: Record<string, any> | null
) => {
  if (!schema || typeof schema !== "object") return params;
  const properties = schema.properties;
  if (!properties || typeof properties !== "object") return params;

  const next: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    const prop = properties[key];
    if (!prop) continue;

    const types = Array.isArray(prop.type) ? prop.type : prop.type ? [prop.type] : [];
    let coerced: any = value;

    if (types.includes("number") || types.includes("integer")) {
      const num = toNumber(value);
      if (num === null) continue;
      let finalNum = clampNumber(num, prop.minimum, prop.maximum);
      if (types.includes("integer")) finalNum = Math.round(finalNum);
      coerced = finalNum;
    } else if (types.includes("boolean")) {
      if (typeof value === "boolean") {
        coerced = value;
      } else if (value === "true" || value === "false") {
        coerced = value === "true";
      } else {
        continue;
      }
    } else if (types.includes("string")) {
      coerced = typeof value === "string" ? value : String(value);
    } else if (types.includes("array")) {
      if (!Array.isArray(value)) continue;
      coerced = value;
      if (typeof prop.maxItems === "number") {
        coerced = value.slice(0, prop.maxItems);
      }
    } else if (types.includes("object")) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      coerced = value;
    }

    if (prop.enum && Array.isArray(prop.enum)) {
      if (!prop.enum.includes(coerced)) {
        if (prop.default !== undefined) {
          coerced = prop.default;
        } else {
          continue;
        }
      }
    }

    next[key] = coerced;
  }

  return next;
};

const applyGenerationLimits = (
  params: Record<string, any>,
  modelConfig?: ModelConfig | null
) => {
  const next = { ...params };
  const maxImages = modelConfig?.max_images ?? null;

  if (maxImages) {
    if (next.num_images !== undefined) {
      const num = toNumber(next.num_images);
      if (num !== null) next.num_images = clampNumber(num, 1, maxImages);
    }
    if (next.num_outputs !== undefined) {
      const num = toNumber(next.num_outputs);
      if (num !== null) next.num_outputs = clampNumber(num, 1, maxImages);
    }
  }

  return next;
};

const pickImageExtension = (contentType: string | null) => {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "jpg";
};

const extractImageUrls = (raw: any): string[] => {
  if (!raw) return [];

  if (Array.isArray(raw.images)) {
    return raw.images.map((img: any) => img?.url || img).filter(Boolean);
  }

  if (raw.image?.url) return [raw.image.url];
  if (raw.image_url) return [raw.image_url];

  if (raw.output) {
    return Array.isArray(raw.output) ? raw.output.filter(Boolean) : [raw.output].filter(Boolean);
  }

  if (raw.data?.outputs) {
    return Array.isArray(raw.data.outputs) ? raw.data.outputs.filter(Boolean) : [raw.data.outputs].filter(Boolean);
  }

  return [];
};

const TEMPLATE_TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const replaceTemplateTokens = (value: string, tokens: Record<string, string>) =>
  value.replace(TEMPLATE_TOKEN_PATTERN, (_, key: string) => tokens[key] ?? "");

const interpolateTemplateValue = (value: unknown, tokens: Record<string, string>): unknown => {
  if (typeof value === "string") {
    return replaceTemplateTokens(value, tokens);
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateTemplateValue(item, tokens));
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      next[key] = interpolateTemplateValue(nested, tokens);
    }
    return next;
  }

  return value;
};

type RunninghubNodeInfo = {
  nodeId: string;
  fieldName: string;
  fieldValue: unknown;
};

const normalizeRunninghubNodeInfo = (
  rawItem: unknown,
  tokens: Record<string, string>
): RunninghubNodeInfo | null => {
  if (!rawItem || typeof rawItem !== "object") return null;
  const item = rawItem as Record<string, unknown>;

  const nodeIdRaw = item.nodeId ?? item.node_id;
  const fieldNameRaw = item.fieldName ?? item.field_name;
  const fieldValueRaw = item.fieldValue ?? item.field_value ?? item.value;

  if (nodeIdRaw === undefined || fieldNameRaw === undefined || fieldValueRaw === undefined) {
    return null;
  }

  return {
    nodeId: String(nodeIdRaw),
    fieldName: String(fieldNameRaw),
    fieldValue: interpolateTemplateValue(fieldValueRaw, tokens),
  };
};

const buildRunninghubNodeInfoList = (
  params: Record<string, unknown>,
  prompt: string,
  negativePrompt: string | undefined,
  referenceImages: string[]
): RunninghubNodeInfo[] => {
  const tokenMap: Record<string, string> = {
    prompt,
    negative_prompt: negativePrompt || "",
  };
  referenceImages.forEach((url, index) => {
    tokenMap[`reference_image_${index}`] = url;
  });

  const nodeInfoSource = Array.isArray(params.nodeInfoList)
    ? params.nodeInfoList
    : Array.isArray(params.node_info_list)
    ? params.node_info_list
    : [];

  const normalizedFromList = nodeInfoSource
    .map((item) => normalizeRunninghubNodeInfo(item, tokenMap))
    .filter(Boolean) as RunninghubNodeInfo[];

  const promptNodeId = params.prompt_node_id ?? params.promptNodeId;
  if (normalizedFromList.length === 0 && promptNodeId !== undefined) {
    normalizedFromList.push({
      nodeId: String(promptNodeId),
      fieldName: String(params.prompt_field_name ?? params.promptFieldName ?? "text"),
      fieldValue: prompt,
    });
  }

  const negativeNodeId = params.negative_prompt_node_id ?? params.negativePromptNodeId;
  if (negativePrompt && negativeNodeId !== undefined) {
    normalizedFromList.push({
      nodeId: String(negativeNodeId),
      fieldName: String(params.negative_prompt_field_name ?? params.negativePromptFieldName ?? "text"),
      fieldValue: negativePrompt,
    });
  }

  const referenceMappings = Array.isArray(params.reference_image_node_mappings)
    ? params.reference_image_node_mappings
    : Array.isArray(params.referenceImageNodeMappings)
    ? params.referenceImageNodeMappings
    : [];

  for (const rawMapping of referenceMappings) {
    if (!rawMapping || typeof rawMapping !== "object") continue;
    const mapping = rawMapping as Record<string, unknown>;
    const nodeId = mapping.nodeId ?? mapping.node_id;
    const fieldName = mapping.fieldName ?? mapping.field_name ?? "image";
    const indexRaw = mapping.index ?? mapping.ref_index ?? 0;
    const index = typeof indexRaw === "number" ? indexRaw : Number(indexRaw);
    if (nodeId === undefined || Number.isNaN(index)) continue;
    const imageUrl = referenceImages[index];
    if (!imageUrl) continue;
    normalizedFromList.push({
      nodeId: String(nodeId),
      fieldName: String(fieldName),
      fieldValue: imageUrl,
    });
  }

  const referenceNodeIds = Array.isArray(params.reference_image_node_ids)
    ? params.reference_image_node_ids
    : Array.isArray(params.referenceImageNodeIds)
    ? params.referenceImageNodeIds
    : [];

  for (let i = 0; i < referenceNodeIds.length; i += 1) {
    const nodeId = referenceNodeIds[i];
    const imageUrl = referenceImages[i];
    if (!nodeId || !imageUrl) continue;
    normalizedFromList.push({
      nodeId: String(nodeId),
      fieldName: String(params.reference_image_field_name ?? params.referenceImageFieldName ?? "image"),
      fieldValue: imageUrl,
    });
  }

  return normalizedFromList;
};

// ==================== KIARA Z MAX DIMENSION PRESETS ====================
// Maps aspect_ratio + resolution to concrete node overrides for the workflow.
// Node 46 = EmptySD3LatentImage (landscape), Node 166 = (portrait)
// Node 438 = LatentUpscale stage 1, Node 454 = LatentUpscale stage 2
// Node 449 = LatentUpscaleBy (scale factor), Node 471 = ImageResizeKJv2 (final)
// Latent blocks = pixels / 8

interface DimensionPreset {
  latent: [number, number];      // width, height in blocks (×8 = pixels)
  upscale1: [number, number];    // Node 438 width, height pixels
  upscale2: [number, number];    // Node 454 width, height pixels
  final: [number, number];       // Node 471 width, height pixels
}

// Node 438 (upscale1) = actual output resolution (confirmed by testing)
// Latent = base composition (blocks ×8), upscale2/final kept proportional
const DIMENSION_PRESETS: Record<string, Record<string, DimensionPreset>> = {
  "1k": {
    "1:1":  { latent: [128, 128], upscale1: [1024, 1024], upscale2: [768, 768],   final: [1024, 1024] },
    "16:9": { latent: [144, 80],  upscale1: [1024, 576],  upscale2: [768, 432],   final: [1024, 576] },
    "9:16": { latent: [80, 144],  upscale1: [576, 1024],  upscale2: [432, 768],   final: [576, 1024] },
    "4:3":  { latent: [128, 96],  upscale1: [1024, 768],  upscale2: [768, 576],   final: [1024, 768] },
    "3:4":  { latent: [96, 128],  upscale1: [768, 1024],  upscale2: [576, 768],   final: [768, 1024] },
  },
  "2k": {
    "1:1":  { latent: [128, 128], upscale1: [2048, 2048], upscale2: [1024, 1024], final: [2048, 2048] },
    "16:9": { latent: [144, 80],  upscale1: [2048, 1152], upscale2: [1024, 576],  final: [2048, 1152] },
    "9:16": { latent: [80, 144],  upscale1: [1152, 2048], upscale2: [576, 1024],  final: [1152, 2048] },
    "4:3":  { latent: [128, 96],  upscale1: [2048, 1536], upscale2: [1024, 768],  final: [2048, 1536] },
    "3:4":  { latent: [96, 128],  upscale1: [1536, 2048], upscale2: [768, 1024],  final: [1536, 2048] },
  },
};

const buildDimensionNodeOverrides = (
  aspectRatio: string | undefined,
  resolution: string | undefined
): RunninghubNodeInfo[] => {
  const res = (resolution || "1k").toLowerCase();
  const ratio = aspectRatio || "1:1";

  const presets = DIMENSION_PRESETS[res];
  if (!presets) return [];

  const preset = presets[ratio];
  if (!preset) return [];

  const isPortrait = preset.latent[1] > preset.latent[0];

  const overrides: RunninghubNodeInfo[] = [];

  // Initial latent — use node 166 for portrait, 46 for landscape/square
  const latentNodeId = isPortrait ? "166" : "46";
  overrides.push(
    { nodeId: latentNodeId, fieldName: "width", fieldValue: String(preset.latent[0]) },
    { nodeId: latentNodeId, fieldName: "height", fieldValue: String(preset.latent[1]) },
  );

  // Stage 1 upscale (Node 438)
  overrides.push(
    { nodeId: "438", fieldName: "width", fieldValue: String(preset.upscale1[0]) },
    { nodeId: "438", fieldName: "height", fieldValue: String(preset.upscale1[1]) },
  );

  // Stage 2 upscale (Node 454)
  overrides.push(
    { nodeId: "454", fieldName: "width", fieldValue: String(preset.upscale2[0]) },
    { nodeId: "454", fieldName: "height", fieldValue: String(preset.upscale2[1]) },
  );

  // Final output resize (Node 471)
  overrides.push(
    { nodeId: "471", fieldName: "width", fieldValue: String(preset.final[0]) },
    { nodeId: "471", fieldName: "height", fieldValue: String(preset.final[1]) },
  );

  return overrides;
};

const runninghubApiRequest = async <T>(
  path: string,
  payload: Record<string, unknown>,
  timeoutMs = 45000
): Promise<T> => {
  if (!RUNNINGHUB_API_KEY) {
    throw new Error("RUNNINGHUB_API_KEY is not configured");
  }

  const response = await withTimeout(`${RUNNINGHUB_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Host": RUNNINGHUB_DEFAULT_HOST,
    },
    body: JSON.stringify({
      apiKey: RUNNINGHUB_API_KEY,
      ...payload,
    }),
  }, timeoutMs);

  const rawText = await response.text();
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`Generation service invalid JSON response (${response.status})`);
  }

  if (!response.ok) {
    const detail = parsed?.msg || parsed?.message || rawText || `HTTP ${response.status}`;
    throw new Error(`Generation service request failed: ${detail}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Generation service returned empty response");
  }

  if (Number(parsed.code) !== 0) {
    const code = parsed.code ?? "unknown";
    const msg = parsed.msg || parsed.message || "Unknown generation error";
    throw new Error(`Generation error ${code}: ${msg}`);
  }

  return parsed.data as T;
};

const normalizeRunninghubStatus = (data: any): string => {
  // RunningHub status endpoint can return a plain string (e.g. "RUNNING") or an object
  if (typeof data === "string") {
    return data.trim().toUpperCase();
  }
  const raw = data?.status ?? data?.taskStatus ?? data?.state ?? data?.task_state ?? "";
  return String(raw).trim().toUpperCase();
};

const collectUrlsFromUnknown = (value: unknown, acc: Set<string>) => {
  if (!value) return;

  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      acc.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectUrlsFromUnknown(item, acc));
    return;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.fileUrl === "string") acc.add(obj.fileUrl);
    if (typeof obj.file_url === "string") acc.add(obj.file_url);
    if (typeof obj.imageUrl === "string") acc.add(obj.imageUrl);
    if (typeof obj.image_url === "string") acc.add(obj.image_url);
    if (typeof obj.url === "string") acc.add(obj.url);

    for (const nested of Object.values(obj)) {
      collectUrlsFromUnknown(nested, acc);
    }
  }
};

const extractRunninghubOutputUrls = (outputs: unknown): string[] => {
  const urls = new Set<string>();
  collectUrlsFromUnknown(outputs, urls);
  return Array.from(urls);
};

const normalizeImageSize = (
  params: Record<string, any>,
  modelConfig?: ModelConfig
): Record<string, any> => {
  const next = { ...params };

  // Respect explicit image_size if object
  if (typeof next.image_size === "object" && next.image_size?.width && next.image_size?.height) {
    const width = Number(next.image_size.width);
    const height = Number(next.image_size.height);
    if (!Number.isNaN(width) && !Number.isNaN(height) && modelConfig) {
      next.image_size = {
        width: Math.min(modelConfig.max_width || width, Math.max(modelConfig.min_width || width, width)),
        height: Math.min(modelConfig.max_height || height, Math.max(modelConfig.min_height || height, height)),
      };
    }
    return next;
  }

  // Convert size string "WxH" to image_size object
  if (typeof next.size === "string") {
    const parsed = parseSizeToDimensions(next.size);
    if (parsed) {
      const width = modelConfig ? Math.min(modelConfig.max_width || parsed.width, Math.max(modelConfig.min_width || parsed.width, parsed.width)) : parsed.width;
      const height = modelConfig ? Math.min(modelConfig.max_height || parsed.height, Math.max(modelConfig.min_height || parsed.height, parsed.height)) : parsed.height;
      next.image_size = { width, height };
      delete next.size;
    }
  }

  return next;
};

const applyReferenceImages = (
  requestBody: Record<string, any>,
  modelConfig: ModelConfig | null,
  referenceImages: string[]
) => {
  if (!modelConfig || !modelConfig.supports_reference_images || referenceImages.length === 0) return;

  const maxRefs = modelConfig.max_reference_images || referenceImages.length;
  const refs = referenceImages.slice(0, maxRefs);

  const schemaProps = (modelConfig.param_schema as any)?.properties || {};
  if (schemaProps.image_url) {
    requestBody.image_url = refs[0];
    return;
  }
  if (schemaProps.image_urls) {
    requestBody.image_urls = refs;
    return;
  }

  if (refs.length === 1) {
    requestBody.image_url = refs[0];
  } else {
    requestBody.image_urls = refs;
  }
};

// ==================== PNG METADATA: STRIP & REBRAND ====================

/**
 * Strip all text metadata from PNG (removes ComfyUI/workflow/provider info)
 * and inject Kiara Z MAX branding metadata.
 * PNG format: 8-byte signature + chunks (each: 4-byte length + 4-byte type + data + 4-byte CRC)
 */
function brandPngImage(pngBytes: Uint8Array): Uint8Array {
  const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

  // Verify PNG signature
  const isPng = PNG_SIG.every((b, i) => pngBytes[i] === b);
  if (!isPng) return pngBytes; // Not a PNG, return as-is (JPEG etc.)

  // Parse chunks, skip text metadata chunks
  const keepChunks: Uint8Array[] = [];
  const textChunkTypes = new Set(["tEXt", "iTXt", "zTXt"]);
  let offset = 8; // Skip signature

  while (offset < pngBytes.length) {
    const len = (pngBytes[offset] << 24) | (pngBytes[offset+1] << 16) | (pngBytes[offset+2] << 8) | pngBytes[offset+3];
    const typeBytes = pngBytes.slice(offset + 4, offset + 8);
    const chunkType = String.fromCharCode(...typeBytes);
    const chunkTotal = 12 + len; // 4 len + 4 type + data + 4 crc

    if (!textChunkTypes.has(chunkType)) {
      keepChunks.push(pngBytes.slice(offset, offset + chunkTotal));
    }

    offset += chunkTotal;
  }

  // Build Kiara tEXt chunks
  const kiaraChunks = buildKiaraPngTextChunks();

  // Reassemble: signature + IHDR + kiara chunks + rest + IEND
  const ihdr = keepChunks.shift()!; // IHDR is always first
  const iend = keepChunks.pop()!;   // IEND is always last

  const totalSize = 8 + ihdr.length + kiaraChunks.reduce((s, c) => s + c.length, 0) +
    keepChunks.reduce((s, c) => s + c.length, 0) + iend.length;

  const result = new Uint8Array(totalSize);
  let pos = 0;

  // PNG signature
  result.set(PNG_SIG, pos); pos += 8;
  // IHDR
  result.set(ihdr, pos); pos += ihdr.length;
  // Kiara metadata
  for (const chunk of kiaraChunks) { result.set(chunk, pos); pos += chunk.length; }
  // All other chunks (except IEND)
  for (const chunk of keepChunks) { result.set(chunk, pos); pos += chunk.length; }
  // IEND
  result.set(iend, pos);

  return result;
}

function buildKiaraPngTextChunks(): Uint8Array[] {
  const metadata: Record<string, string> = {
    "Software": "Kiara Z MAX v1.0",
    "Generator": "Kiara AI Image Generation Platform",
    "Model": "Kiara Z MAX",
    "Copyright": "Generated by Kiara AI",
  };

  return Object.entries(metadata).map(([key, value]) => buildPngTextChunk(key, value));
}

function buildPngTextChunk(keyword: string, value: string): Uint8Array {
  // tEXt chunk: keyword + null separator + text
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(keyword);
  const valBytes = encoder.encode(value);
  const data = new Uint8Array(keyBytes.length + 1 + valBytes.length);
  data.set(keyBytes, 0);
  data[keyBytes.length] = 0; // null separator
  data.set(valBytes, keyBytes.length + 1);

  const type = encoder.encode("tEXt");

  // CRC32 over type + data
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(type, 0);
  crcInput.set(data, 4);
  const crc = crc32(crcInput);

  // Full chunk: 4-byte length + 4-byte type + data + 4-byte CRC
  const chunk = new Uint8Array(12 + data.length);
  const len = data.length;
  chunk[0] = (len >> 24) & 0xff;
  chunk[1] = (len >> 16) & 0xff;
  chunk[2] = (len >> 8) & 0xff;
  chunk[3] = len & 0xff;
  chunk.set(type, 4);
  chunk.set(data, 8);
  chunk[8 + data.length] = (crc >> 24) & 0xff;
  chunk[9 + data.length] = (crc >> 16) & 0xff;
  chunk[10 + data.length] = (crc >> 8) & 0xff;
  chunk[11 + data.length] = crc & 0xff;

  return chunk;
}

// CRC32 lookup table for PNG chunks
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ==================== IMAGE REHOSTING ====================

const rehostImages = async (
  supabase: any,
  userId: string,
  jobId: string,
  urls: string[]
): Promise<{ paths: string[]; signedUrls: string[] }> => {
  const bucket = "generated-images";
  const paths: string[] = [];
  const signedUrls: string[] = [];

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    if (!url) continue;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch generated image (${response.status})`);
    }

    const contentType = response.headers.get("content-type");
    const ext = pickImageExtension(contentType);
    const arrayBuffer = await response.arrayBuffer();

    // Strip provider metadata and add Kiara branding
    let imageData = new Uint8Array(arrayBuffer);
    if (ext === "png") {
      imageData = brandPngImage(imageData);
    }

    const filePath = `${userId}/${jobId}/${Date.now()}-${i}.${ext}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, imageData, {
        contentType: contentType || "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (error || !data?.path) {
      throw new Error(`Failed to store generated image`);
    }

    paths.push(data.path);

    const { data: signed, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, SIGNED_URL_TTL);

    if (signedError || !signed?.signedUrl) {
      throw new Error("Failed to create signed URL");
    }

    signedUrls.push(signed.signedUrl);
  }

  return { paths, signedUrls };
};

const selectFallbackModel = async (
  supabase: any,
  needsReferenceImages: boolean
): Promise<ModelConfig | null> => {
  let query = supabase
    .from("ai_model_registry")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: true })
    .limit(1);

  if (needsReferenceImages) {
    query = query.eq("supports_reference_images", true);
  } else {
    query = query.contains("capabilities", ["text-to-image"]);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    console.warn("Fallback model selection failed (filtered):", error);

    // Relax filter as last resort
    const { data: fallback, error: fallbackError } = await supabase
      .from("ai_model_registry")
      .select("*")
      .eq("active", true)
      .order("priority", { ascending: true })
      .limit(1);

    if (fallbackError || !fallback || fallback.length === 0) {
      console.error("Fallback model selection failed:", fallbackError);
      return null;
    }

    return fallback[0] as ModelConfig;
  }

  return data[0] as ModelConfig;
};

const enforceRateLimit = async (supabase: any, userId: string) => {
  if (!RATE_LIMIT_MAX_REQUESTS || RATE_LIMIT_MAX_REQUESTS <= 0) {
    return { allowed: true };
  }

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

  const { count, error } = await supabase
    .from("ai_generation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    console.warn("Rate limit check failed:", error);
    return { allowed: true };
  }

  if ((count || 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: RATE_LIMIT_WINDOW_SECONDS,
    };
  }

  return { allowed: true };
};

// Model registry interface
interface ModelConfig {
  model_id: string;
  provider: string;
  provider_model_id: string;
  default_params: Record<string, unknown>;
  param_schema?: Record<string, unknown> | null;
  prompt_template?: string;
  negative_prompt_default?: string;
  max_width: number;
  max_height: number;
  min_width: number;
  min_height: number;
  max_images: number;
  supports_reference_images: boolean;
  max_reference_images: number;
}

// Get model config from registry
async function getModelConfig(supabase: any, modelId: string): Promise<ModelConfig | null> {
  const { data, error } = await supabase
    .from("ai_model_registry")
    .select("*")
    .eq("model_id", modelId)
    .eq("active", true)
    .single();

  if (error || !data) {
    console.error("Model not found:", modelId, error);
    return null;
  }

  return data as ModelConfig;
}

// Create generation job
async function createJob(
  supabase: any,
  userId: string,
  modelId: string,
  prompt: string,
  enhancedPrompt: string,
  negativePrompt: string | undefined,
  params: any,
  referenceUrls?: string[]
): Promise<string> {
  const { data, error } = await supabase
    .from("ai_generation_jobs")
    .insert({
      user_id: userId,
      model_id: modelId,
      prompt: prompt,
      enhanced_prompt: enhancedPrompt,
      negative_prompt: negativePrompt,
      params: params,
      reference_image_urls: referenceUrls || [],
      status: "processing",
      processing_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create job:", error);
    throw new Error("Failed to create generation job");
  }

  return data.id;
}

// Update job status
async function updateJobStatus(
  supabase: any,
  jobId: string,
  status: string,
  error?: string,
  enhancedPrompt?: string,
  durationMs?: number
) {
  const update: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "completed") {
    update.completed_at = new Date().toISOString();
  }

  if (error) {
    update.error = error;
  }

  if (enhancedPrompt) {
    update.enhanced_prompt = enhancedPrompt;
  }

  if (typeof durationMs === "number") {
    update.total_duration_ms = durationMs;
  }

  await supabase
    .from("ai_generation_jobs")
    .update(update)
    .eq("id", jobId);
}

// Store generation outputs
async function storeOutputs(
  supabase: any,
  jobId: string,
  storedImages: string[],
  originalImages: string[],
  rawResponse: any
) {
  const outputs = storedImages.map((url, index) => ({
    job_id: jobId,
    image_url: url,
    original_url: originalImages[index] || null,
    seed: rawResponse?.seed,
    meta: rawResponse?.images?.[index] || {},
  }));

  const { error } = await supabase
    .from("ai_generation_outputs")
    .insert(outputs);

  if (error) {
    console.error("Failed to store outputs:", error);
  }
}

// Apply prompt template if exists
function applyPromptTemplate(
  prompt: string,
  template?: string,
  negativePrompt?: string
): { prompt: string; negativePrompt?: string } {
  let enhancedPrompt = prompt;

  if (template && template.trim().length > 0) {
    if (template.includes("{prompt}") || template.includes("{{prompt}}")) {
      enhancedPrompt = template
        .replaceAll("{{prompt}}", prompt)
        .replaceAll("{prompt}", prompt);
    } else {
      enhancedPrompt = `${template}\n\n${prompt}`;
    }
  }

  return {
    prompt: enhancedPrompt,
    negativePrompt: negativePrompt,
  };
}

// Legacy provider to model_id mapping
const legacyProviderMap: Record<string, string> = {
  "flux-pro-ultra": "flux-pro-ultra",
  "flux-pro": "flux-pro",
  "seedream": "seedream-v45",
  "wan22": "wan22",
  "recraft-v3": "recraft-v3",
  "ideogram": "ideogram-v2",
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

  const body = await req.json();
  const prompt = body.prompt;
  const referenceImages: string[] = Array.isArray(body.reference_image_urls)
    ? body.reference_image_urls
    : Array.isArray(body.reference_images)
    ? body.reference_images
    : Array.isArray(body.image_urls)
    ? body.image_urls
    : [];

  // LoRA override config (optional)
  const loraConfig = body.lora as {
    rh_lora_name: string;
    strength_model?: number;
    lora_node_id?: string;
  } | undefined;

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: "Missing required field: prompt" }),
      { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  // Determine model_id: either from body.model_id or map from legacy provider
  let modelId = body.model_id;
  let modelConfig: ModelConfig | null = null;

  if (!modelId && body.provider) {
    // Legacy mode: use provider directly
    modelId = legacyProviderMap[body.provider] || body.provider;
  }

  // Try to get model config from registry
  if (modelId) {
    modelConfig = await getModelConfig(supabaseAdmin, modelId);
  }

  // Fallback model selection if neither model_id nor provider supplied
  if (!modelId && !body.provider) {
    modelConfig = await selectFallbackModel(supabaseAdmin, referenceImages.length > 0);
    modelId = modelConfig?.model_id;
  }

  // If no model config found and using legacy provider, use direct routing
  const provider = modelConfig?.provider || body.provider;
  const providerModelId = modelConfig?.provider_model_id;

  if (!provider) {
    return new Response(
      JSON.stringify({ error: "Missing required field: model_id or provider" }),
      { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  if (modelConfig && referenceImages.length > 0 && !modelConfig.supports_reference_images) {
    return new Response(
      JSON.stringify({ error: "Selected model does not support reference images" }),
      { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  const { prompt: enhancedPrompt, negativePrompt: defaultNegativePrompt } = modelConfig
    ? applyPromptTemplate(prompt, modelConfig.prompt_template, modelConfig.negative_prompt_default)
    : { prompt, negativePrompt: undefined };

  const finalNegativePrompt = body.negative_prompt ?? defaultNegativePrompt;

  // Extract generation-level params directly from body BEFORE schema filtering.
  // applyParamSchema only keeps keys listed in the model's param_schema, so
  // meta-params like aspect_ratio/resolution/num_images/seed would be stripped.
  const generationMeta = {
    aspect_ratio: (body.aspect_ratio as string) || "1:1",
    resolution: (body.resolution as string) || "1k",
    num_images: toNumber(body.num_images) ?? 1,
    seed: toNumber(body.seed) ?? undefined,
    output_format: (body.output_format as string) || undefined,
  };

  const rawParams: Record<string, any> = {
    ...(modelConfig?.default_params || {}),
    ...(body.params || {}),
  };
  if (body.image_size) rawParams.image_size = body.image_size;
  if (body.size) rawParams.size = body.size;

  const normalizedParams = normalizeImageSize(rawParams, modelConfig || undefined);
  const schemaParams = applyParamSchema(normalizedParams, modelConfig?.param_schema);
  const mergedParams = applyGenerationLimits(schemaParams, modelConfig);

  // Re-inject generation meta so downstream code can use them
  mergedParams.aspect_ratio = generationMeta.aspect_ratio;
  mergedParams.resolution = generationMeta.resolution;
  if (generationMeta.num_images !== undefined) mergedParams.num_images = generationMeta.num_images;
  if (generationMeta.seed !== undefined) mergedParams.seed = generationMeta.seed;
  if (generationMeta.output_format) mergedParams.output_format = generationMeta.output_format;

  let jobId: string | null = null;

  try {
    const startTime = Date.now();

    const rateLimit = await enforceRateLimit(supabaseAdmin, user.id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retry_after_seconds: rateLimit.retryAfterSeconds || RATE_LIMIT_WINDOW_SECONDS
        }),
        { status: 429, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    // Create job record if we have model config
    if (modelConfig) {
      jobId = await createJob(
        supabaseAdmin,
        user.id,
        modelId,
        prompt,
        enhancedPrompt,
        finalNegativePrompt,
        mergedParams,
        referenceImages
      );
    }

    let images: string[] = [];
    let rawResponse: any = null;

    // Route by provider.
    if (String(provider).toLowerCase() === "runninghub") {
      const workflowId =
        providerModelId ||
        mergedParams.workflowId ||
        mergedParams.workflow_id ||
        body.workflowId ||
        body.workflow_id;

      if (!workflowId) {
        throw new Error("Workflow ID is required (provider_model_id in model registry)");
      }

      const baseNodeInfoList = buildRunninghubNodeInfoList(
        mergedParams,
        enhancedPrompt,
        finalNegativePrompt,
        referenceImages
      );

      if (baseNodeInfoList.length === 0) {
        throw new Error("Node configuration is required (provide params.nodeInfoList or prompt node mapping)");
      }

      // Append dimension overrides based on aspect_ratio + resolution
      const dimensionOverrides = buildDimensionNodeOverrides(
        generationMeta.aspect_ratio,
        generationMeta.resolution,
      );
      baseNodeInfoList.push(...dimensionOverrides);

      console.log("[kiara-generate] Dimension overrides:", JSON.stringify({
        aspect_ratio: generationMeta.aspect_ratio,
        resolution: generationMeta.resolution,
        overrides: dimensionOverrides.map(o => `${o.nodeId}.${o.fieldName}=${o.fieldValue}`),
      }));

      // Append LoRA overrides if a LoRA is selected
      if (loraConfig?.rh_lora_name) {
        const loraNodeId = loraConfig.lora_node_id
          || mergedParams.lora_node_id
          || "105"; // LoraLoaderModelOnly node in Kiara Z MAX workflow
        const strengthModel = typeof loraConfig.strength_model === "number"
          ? loraConfig.strength_model
          : 0.8;

        baseNodeInfoList.push(
          { nodeId: String(loraNodeId), fieldName: "lora_name", fieldValue: loraConfig.rh_lora_name },
          { nodeId: String(loraNodeId), fieldName: "strength_model", fieldValue: String(strengthModel) },
        );

        console.log("[kiara-generate] LoRA override:", JSON.stringify({
          node: loraNodeId,
          lora: loraConfig.rh_lora_name,
          strength: strengthModel,
        }));
      }

      // RunningHub produces 1 image per workflow run.
      // For num_images > 1, dispatch multiple runs in parallel.
      const numRuns = Math.min(Math.max(generationMeta.num_images ?? 1, 1), 4);
      const baseSeed = generationMeta.seed ?? null;

      // Seed node ID — KSampler node for Kiara Z MAX workflow
      const seedNodeId = mergedParams.seed_node_id ?? mergedParams.seedNodeId ?? null;

      const successStatuses = new Set(["SUCCESS", "SUCCEEDED", "COMPLETED", "FINISHED"]);
      const failureStatuses = new Set(["FAILED", "FAIL", "ERROR", "CANCELED", "CANCELLED"]);

      const runSingleWorkflow = async (runIndex: number): Promise<string[]> => {
        // Clone nodeInfoList and optionally set seed per run
        const nodeInfoList = [...baseNodeInfoList];
        if (seedNodeId && baseSeed !== null) {
          nodeInfoList.push({
            nodeId: String(seedNodeId),
            fieldName: "seed",
            fieldValue: String(baseSeed + runIndex),
          });
        }

        const createData = await runninghubApiRequest<any>("/task/openapi/create", {
          workflowId: String(workflowId),
          nodeInfoList,
        }, 60000);

        const taskId = createData?.taskId || createData?.task_id || createData?.id;
        if (!taskId) {
          throw new Error("Generation service did not return task ID");
        }

        let latestStatus: any = null;
        let status = "";
        const startedAt = Date.now();

        while (Date.now() - startedAt < RUNNINGHUB_POLL_TIMEOUT_MS) {
          latestStatus = await runninghubApiRequest<any>("/task/openapi/status", {
            taskId: String(taskId),
          }, 45000);

          status = normalizeRunninghubStatus(latestStatus);
          if (successStatuses.has(status)) break;

          if (failureStatuses.has(status)) {
            const detail =
              latestStatus?.errorMessage ||
              latestStatus?.error_message ||
              latestStatus?.nodeMessage ||
              latestStatus?.message ||
              "Workflow execution failed";
            throw new Error(`Generation task failed (run ${runIndex + 1}): ${detail}`);
          }

          await delay(RUNNINGHUB_POLL_INTERVAL_MS);
        }

        if (!successStatuses.has(status)) {
          throw new Error(`Generation task timed out (run ${runIndex + 1})`);
        }

        const outputsData = await runninghubApiRequest<any>("/task/openapi/outputs", {
          taskId: String(taskId),
        }, 45000);

        return extractRunninghubOutputUrls(outputsData);
      };

      // Dispatch all runs in parallel
      const allRunResults = await Promise.all(
        Array.from({ length: numRuns }, (_, i) => runSingleWorkflow(i))
      );

      images = allRunResults.flat();
      rawResponse = {
        provider: "kiara",
        num_runs: numRuns,
        aspect_ratio: generationMeta.aspect_ratio,
        resolution: generationMeta.resolution,
      };
    } else {
      // fal.ai routing
      if (!FAL_API_KEY) {
        throw new Error("FAL_API_KEY is not configured");
      }

      // Determine fal.ai endpoint
      let endpoint = providerModelId;

      if (!endpoint) {
        // Legacy endpoint mapping - all through fal.ai
        const endpointMap: Record<string, string> = {
          // Flux models
          "flux-pro-ultra": "fal-ai/flux-pro/v1.1-ultra",
          "flux-pro": "fal-ai/flux-pro/v1.1",
          "flux-dev": "fal-ai/flux/dev",
          "flux-realism": "fal-ai/flux-realism",
          // Seedream models (via fal.ai)
          "seedream-v4": "fal-ai/seedream-3.0",
          "seedream-v45": "fal-ai/seedream-3.0",
          "nano-banana": "fal-ai/seedream-3.0",
          "seedream": "fal-ai/seedream-3.0",
          // Ideogram
          "ideogram-v2": "fal-ai/ideogram/v2",
          "ideogram-v2-turbo": "fal-ai/ideogram/v2/turbo",
          // Others
          "recraft-v3": "fal-ai/recraft-v3",
          "stable-diffusion-v35": "fal-ai/stable-diffusion-v35-large",
          "omnigen-v1": "fal-ai/omnigen-v1",
          "wan22": "fal-ai/wan/v2.2-a14b/text-to-image/lora",
          "imagen4-ultra": "fal-ai/imagen4/preview/ultra",
          "imagen4": "fal-ai/imagen4/preview",
          "hidream-i1": "fal-ai/hidream-i1-full",
          // Z Image
          "z-image": "fal-ai/stable-cascade",
          "z-image-turbo": "fal-ai/stable-cascade/sote-diffusion",
          // Video models
          "ltx-video": "fal-ai/ltx-video",
          "ltx-video-i2v": "fal-ai/ltx-video/image-to-video",
          "kling-3": "fal-ai/kling-video/v1.6/pro/image-to-video",
        };
        endpoint = endpointMap[modelId] || endpointMap[body.provider];
      }

      if (!endpoint) {
        throw new Error(`Unsupported model: ${modelId || body.provider}`);
      }

      // Build request based on model type
      const requestBody: any = {
        prompt: enhancedPrompt,
        ...mergedParams,
      };

      if (finalNegativePrompt) {
        const schemaProps = (modelConfig?.param_schema as any)?.properties;
        if (!schemaProps || schemaProps.negative_prompt) {
          requestBody.negative_prompt = finalNegativePrompt;
        }
      }

      applyReferenceImages(requestBody, modelConfig, referenceImages);

      const response = await withTimeout(`${FAL_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }, 90000);

      rawResponse = await response.json();

      if (!response.ok) {
        throw new Error(rawResponse.detail || rawResponse.message || `Model request failed (${response.status})`);
      }

      // Extract images from response (different models return differently)
      if (rawResponse.images) {
        images = rawResponse.images.map((img: any) => img.url || img).filter(Boolean);
      } else if (rawResponse.image?.url) {
        images = [rawResponse.image.url];
      } else if (rawResponse.output) {
        images = Array.isArray(rawResponse.output) ? rawResponse.output : [rawResponse.output];
      }
    }

    const providerImages = images.length > 0 ? images : extractImageUrls(rawResponse);

    if (providerImages.length === 0) {
      throw new Error("No images returned from provider");
    }

    const storageJobId = jobId || `legacy-${Date.now()}`;
    const { paths: storedPaths, signedUrls } = await rehostImages(supabaseAdmin, user.id, storageJobId, providerImages);
    const durationMs = Date.now() - startTime;

    // Update job and store outputs
    if (jobId) {
      await updateJobStatus(supabaseAdmin, jobId, "completed", undefined, enhancedPrompt, durationMs);
      await storeOutputs(supabaseAdmin, jobId, storedPaths, providerImages, rawResponse);
    }

    return new Response(
      JSON.stringify({
        success: true,
        model_id: modelId,
        job_id: jobId,
        images: signedUrls
      }),
      { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    // Update job with error
    if (jobId) {
      await updateJobStatus(supabaseAdmin, jobId, "failed", error?.message);
    }

    return new Response(
      JSON.stringify({ error: error?.message || "Generation failed", job_id: jobId }),
      { status: 500, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
