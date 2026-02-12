import { kiaraRequest, getKiaraBaseUrl } from "@/services/kiaraClient";
import { supabase } from "@/lib/supabase";
import SparkMD5 from "spark-md5";

// ==================== MODEL REGISTRY ====================

export interface KiaraModel {
  model_id: string;
  display_name: string;
  description: string | null;
  capabilities: string[];
  default_params: Record<string, unknown>;
  max_width: number;
  max_height: number;
  min_width: number;
  min_height: number;
  max_images: number;
  supports_reference_images: boolean;
  max_reference_images: number;
  priority: number;
  notes: string | null;
}

export interface KiaraModelsResponse {
  models: KiaraModel[];
  count: number;
}

/**
 * Fetch available models from the registry
 * Optionally filter by capability (e.g., "text-to-image", "image-to-image")
 */
export const listModels = async (capability?: string): Promise<KiaraModelsResponse> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const url = new URL(`${getKiaraBaseUrl()}/kiara-models`);
  if (capability) {
    url.searchParams.set("capability", capability);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Failed to fetch models (${response.status})`);
  }

  return data as KiaraModelsResponse;
};

// ==================== LEGACY PROVIDER TYPES (for backward compat) ====================

export type KiaraGenerateProvider =
  | "seedream"
  | "wan22"
  | "wan22-video"
  | "kiara-workflow"
  | "flux-pro-ultra"
  | "flux-pro"
  | "imagen4-ultra"
  | "imagen4"
  | "recraft-v3"
  | "hidream-i1"
  | "flux-2-pro-edit";

// ==================== GENERATION REQUEST ====================

export interface KiaraGenerateRequest {
  // NEW: model_id based routing (preferred)
  model_id?: string;
  // LEGACY: provider based routing (backward compat)
  provider?: KiaraGenerateProvider;

  prompt: string;
  params?: Record<string, unknown>; // Model-specific params

  // Common params
  mode?: "edit" | "edit-sequential" | "text-to-image";
  size?: string;
  image_size?: string | { width: number; height: number } | "auto";
  image_urls?: string[];
  image_url?: string;
  aspect_ratio?: string;
  resolution?: string;
  num_images?: number;
  seed?: number;
  output_format?: "jpeg" | "png" | "webp";
  client_request_id?: string;

  // LoRA override for RunningHub workflow
  lora?: {
    rh_lora_name: string;
    strength_model?: number;
    lora_node_id?: string;
  };

  // Legacy params (for backward compat)
  loras?: Array<{ path: string; scale?: number }>;
  high_noise_loras?: Array<{ path: string; scale?: number }>;
  num_inference_steps?: number;
  guidance_scale?: number;
  guidance_scale_2?: number;
  shift?: number;
  loop?: boolean;
  safety_tolerance?: number;
  enable_safety_checker?: boolean;
  enable_output_safety_checker?: boolean;
  enable_prompt_expansion?: boolean;
  acceleration?: "none" | "regular";
  style?: string;
  sync_mode?: boolean;
}

export interface KiaraGenerateResponse {
  success: boolean;
  model_id?: string;
  job_id?: string;
  provider?: string; // Legacy
  images: string[];
  nsfw?: boolean;
  message?: string;
  raw?: unknown;
}

/**
 * Generate images using model_id or legacy provider
 * Prefers model_id if available, falls back to provider for backward compat
 */
export const kiaraGenerate = async (params: KiaraGenerateRequest): Promise<KiaraGenerateResponse> => {
  return kiaraRequest<KiaraGenerateResponse>("kiara-generate", params);
};

/**
 * Generate image using model_id (new API)
 * This is the preferred method going forward
 */
export const generateWithModel = async (
  modelId: string,
  prompt: string,
  options?: {
    referenceImages?: string[];
    params?: Record<string, unknown>;
    aspectRatio?: string;
    numImages?: number;
    seed?: number;
  }
): Promise<KiaraGenerateResponse> => {
  return kiaraGenerate({
    model_id: modelId,
    prompt,
    image_urls: options?.referenceImages,
    params: options?.params,
    aspect_ratio: options?.aspectRatio,
    num_images: options?.numImages,
    seed: options?.seed,
  });
};

export type KiaraMediaAction =
  | "upscale"
  | "remove-background"
  | "video-audio"
  | "describe-image"
  | "describe-video";

export interface KiaraMediaRequest {
  action: KiaraMediaAction;
  provider?: "replicate" | "wavespeed" | "openrouter";
  image?: string;
  video?: string;
  media?: string;
  prompt?: string;
  negative_prompt?: string;
  duration?: number;
  num_steps?: number;
  cfg_strength?: number;
  seed?: number;
  threshold?: number;
  reverse?: boolean;
  background_type?: string;
  format?: "png" | "jpg";
  max_tokens?: number;
  max_new_tokens?: number;
  temperature?: number;
  top_p?: number;
  target_resolution?: string;
  output_format?: "jpeg" | "png";
  model?: string;
  reasoning?: {
    enabled?: boolean;
    effort?: "none" | "minimal" | "low" | "medium" | "high";
    max_tokens?: number;
    exclude?: boolean;
  };
  reasoning_enabled?: boolean;
}

export interface KiaraMediaResponse {
  success: boolean;
  output: string | null;
  model?: string;
  citations?: string[] | null;
  reasoning?: unknown;
  reasoning_details?: unknown;
  usage?: Record<string, unknown> | null;
}

export const kiaraMedia = async (params: KiaraMediaRequest): Promise<KiaraMediaResponse> => {
  return kiaraRequest<KiaraMediaResponse>("kiara-media", params);
};

export const describeVideoWithOpenRouter = async (params: {
  media: string;
  prompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  reasoning_enabled?: boolean;
  reasoning?: KiaraMediaRequest["reasoning"];
}): Promise<KiaraMediaResponse> => {
  return kiaraMedia({
    action: "describe-video",
    provider: "openrouter",
    media: params.media,
    prompt: params.prompt,
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
    reasoning_enabled: params.reasoning_enabled,
    reasoning: params.reasoning,
  });
};

// ==================== INPAINTING (OpenAI Image Edit) ====================

export interface KiaraInpaintRequest {
  image: string;   // base64 data URI of original image
  mask: string;    // base64 data URI of mask (transparent = edit area)
  prompt: string;
  model?: string;  // "gpt-image-1" (default) or "dall-e-2"
  size?: string;   // "auto", "1024x1024", etc.
  quality?: "low" | "medium" | "high";
}

export const kiaraInpaint = async (params: KiaraInpaintRequest): Promise<KiaraMediaResponse> => {
  return kiaraRequest<KiaraMediaResponse>("kiara-media", {
    action: "inpaint",
    ...params,
  });
};

// ==================== TREND TRACKING (EnsembleData) ====================

export interface TrendPost {
  platform: string;
  desc?: string;
  title?: string;
  caption?: string;
  author?: string;
  channel?: string;
  subreddit?: string;
  plays?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  score?: number;
  views?: number;
}

export interface KiaraTrendsResponse {
  success: boolean;
  keyword?: string;
  trends?: Record<string, TrendPost[]>;
  posts?: TrendPost[];
  fetched_at?: string;
}

/** Fetch trending content across platforms (TikTok, Reddit, Instagram, YouTube, Threads, Twitter) */
export const fetchTrends = async (params?: {
  keyword?: string;
  platforms?: string[];
  subreddit?: string;
  twitter_id?: string;
  twitter_user?: string; // legacy fallback
}): Promise<KiaraTrendsResponse> => {
  const twitterId = params?.twitter_id ?? params?.twitter_user;
  return kiaraRequest<KiaraTrendsResponse>("kiara-trends", {
    action: "fetch-trends",
    ...params,
    ...(twitterId ? { twitter_id: twitterId } : {}),
  });
};

/** Search a specific platform by keyword */
export const searchPlatform = async (
  platform: "tiktok" | "instagram" | "youtube" | "reddit" | "threads" | "twitter",
  query: string
): Promise<KiaraTrendsResponse> => {
  return kiaraRequest<KiaraTrendsResponse>("kiara-trends", {
    action: "search",
    platform,
    query,
  });
};

/** Get TikTok posts for a specific hashtag */
export const tiktokHashtag = async (hashtag: string): Promise<KiaraTrendsResponse> => {
  return kiaraRequest<KiaraTrendsResponse>("kiara-trends", {
    action: "tiktok-hashtag",
    hashtag,
  });
};

/** Get hot posts from a Reddit subreddit */
export const redditHot = async (
  subreddit?: string,
  sort?: string,
  period?: string
): Promise<KiaraTrendsResponse> => {
  return kiaraRequest<KiaraTrendsResponse>("kiara-trends", {
    action: "reddit-hot",
    subreddit,
    sort,
    period,
  });
};

/** Search Threads by keyword */
export const threadsSearch = async (keyword: string): Promise<KiaraTrendsResponse> => {
  return kiaraRequest<KiaraTrendsResponse>("kiara-trends", {
    action: "threads-search",
    keyword,
  });
};

/** Get a Threads user's posts */
export const threadsUserPosts = async (username: string): Promise<KiaraTrendsResponse> => {
  return kiaraRequest<KiaraTrendsResponse>("kiara-trends", {
    action: "threads-user",
    username,
  });
};

/** Get a Twitter/X user's tweets by numeric user ID */
export const twitterUserTweets = async (id: string): Promise<KiaraTrendsResponse> => {
  return kiaraRequest<KiaraTrendsResponse>("kiara-trends", {
    action: "twitter-user",
    id,
  });
};

export interface KiaraGeminiRequest {
  history: Array<{ role: string; content: string; attachments?: Array<{ id: string; data: string; mimeType: string }> }>;
  message: string;
  attachments?: Array<{ id: string; data: string; mimeType: string }>;
  model?: string;
}

export interface KiaraGeminiResponse {
  text: string;
}

export const kiaraGemini = async (params: KiaraGeminiRequest): Promise<KiaraGeminiResponse> => {
  return kiaraRequest<KiaraGeminiResponse>("kiara-gemini", params);
};

export interface TrainingSignedUrlResponse {
  path: string;
  url: string;
  expires_in: number;
}

export interface TrainingSignedUrlsResponse {
  urls: TrainingSignedUrlResponse[];
}

export const getTrainingSignedUrl = async (
  path: string,
  expiresIn = 60 * 60
): Promise<TrainingSignedUrlResponse> => {
  return kiaraRequest<TrainingSignedUrlResponse>("training-signed-url", { path, expiresIn });
};

export const getTrainingSignedUrls = async (
  paths: string[],
  expiresIn = 60 * 60
): Promise<TrainingSignedUrlsResponse> => {
  return kiaraRequest<TrainingSignedUrlsResponse>("training-signed-url", { paths, expiresIn });
};

// ==================== ASYNC RUNNINGHUB (Video Generation) ====================

export interface RunninghubCreateRequest {
  model_id: string;
  prompt?: string;
  negative_prompt?: string;
  image_urls?: string[];
  nodeInfoList?: Array<{ nodeId: string; fieldName: string; fieldValue: string }>;
  seed?: number;
  params?: Record<string, unknown>;
}

export interface RunninghubCreateResponse {
  success: boolean;
  task_id?: string;
  job_id?: string;
  error?: string;
}

export const kiaraRunninghubCreate = async (
  params: RunninghubCreateRequest
): Promise<RunninghubCreateResponse> => {
  return kiaraRequest<RunninghubCreateResponse>("kiara-generate", {
    action: "runninghub-create",
    ...params,
  });
};

export interface RunninghubStatusResponse {
  success: boolean;
  task_id: string;
  status: string;
  error?: string;
}

export const kiaraRunninghubStatus = async (
  taskId: string
): Promise<RunninghubStatusResponse> => {
  return kiaraRequest<RunninghubStatusResponse>("kiara-generate", {
    action: "runninghub-status",
    task_id: taskId,
  });
};

export interface RunninghubOutputsResponse {
  success: boolean;
  urls?: string[];
  storagePaths?: string[];
  task_id: string;
  error?: string;
}

export const kiaraRunninghubOutputs = async (
  taskId: string,
  jobId?: string
): Promise<RunninghubOutputsResponse> => {
  return kiaraRequest<RunninghubOutputsResponse>("kiara-generate", {
    action: "runninghub-outputs",
    task_id: taskId,
    job_id: jobId,
  });
};

// ==================== FAL.AI QUEUE (Grok Video etc.) ====================

export interface FalSubmitRequest {
  model_id: string;
  prompt: string;
  image_url?: string;   // required for image-to-video
  video_url?: string;   // required for edit-video
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
}

export interface FalSubmitResponse {
  success: boolean;
  request_id: string;
  job_id?: string;
  endpoint?: string;
  error?: string;
}

export interface FalStatusResponse {
  success: boolean;
  request_id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  queue_position?: number;
  error?: string;
}

export interface FalResultResponse {
  success: boolean;
  request_id: string;
  urls?: string[];
  storagePaths?: string[];
  video_meta?: { url: string; width: number; height: number; duration: number; fps: number };
  error?: string;
}

/** Submit a fal.ai queue job (e.g. Grok Imagine Video) */
export const kiaraFalSubmit = async (
  params: FalSubmitRequest
): Promise<FalSubmitResponse> => {
  return kiaraRequest<FalSubmitResponse>("kiara-generate", {
    action: "fal-submit",
    ...params,
  });
};

/** Check fal.ai queue job status */
export const kiaraFalStatus = async (
  requestId: string,
  endpoint?: string
): Promise<FalStatusResponse> => {
  return kiaraRequest<FalStatusResponse>("kiara-generate", {
    action: "fal-status",
    request_id: requestId,
    endpoint,
  });
};

/** Fetch fal.ai queue job result (video URL, rehosted to Supabase) */
export const kiaraFalResult = async (
  requestId: string,
  jobId?: string,
  endpoint?: string
): Promise<FalResultResponse> => {
  return kiaraRequest<FalResultResponse>("kiara-generate", {
    action: "fal-result",
    request_id: requestId,
    job_id: jobId,
    endpoint,
  });
};

// ==================== LORA MANAGEMENT (RunningHub) ====================

export interface LoRAModel {
  id: string;
  name: string;
  rh_lora_name: string;
  trigger_word: string;
  default_strength: number;
  rh_upload_status: string;
  file_size_bytes: number | null;
  created_at: string;
}

export interface LoRAListResponse {
  loras: LoRAModel[];
}

export interface LoRAUploadResult {
  lora_id: string;
  rh_lora_name: string;
}

/**
 * Compute MD5 hex hash of a File using SparkMD5 (incremental, handles large files).
 */
const computeFileMD5 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunkSize = 2 * 1024 * 1024; // 2MB chunks
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    let offset = 0;

    const readNext = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      if (!e.target?.result) return reject(new Error("Failed to read file chunk"));
      spark.append(e.target.result as ArrayBuffer);
      offset += chunkSize;
      if (offset < file.size) {
        readNext();
      } else {
        resolve(spark.end());
      }
    };

    reader.onerror = () => reject(new Error("File read error during MD5 computation"));
    readNext();
  });
};

/**
 * Upload a LoRA file to RunningHub via presigned URL.
 * Flow:
 *   1. Compute MD5 hash of file (browser-side)
 *   2. prepare-upload → edge function calls RH /api/openapi/getLoraUploadUrl → returns presigned URL
 *   3. Browser PUTs file directly to presigned URL (COS bucket)
 *   4. confirm-upload → edge function marks DB record as completed
 */
export const uploadLoRA = async (
  file: File,
  params: {
    lora_name: string;
    trigger_word?: string;
    description?: string;
  },
  onProgress?: (percent: number) => void
): Promise<LoRAUploadResult> => {
  // Step 1: Compute MD5 hash
  onProgress?.(1);
  const md5Hex = await computeFileMD5(file);
  onProgress?.(5);

  // Step 2: Prepare — get presigned URL from RunningHub + create DB record
  const prepareResult = await kiaraRequest<{
    lora_id: string;
    rh_lora_name: string;
    upload_url: string;
  }>("upload-lora-runninghub", {
    action: "prepare-upload",
    lora_name: params.lora_name,
    md5_hex: md5Hex,
    file_size_bytes: file.size,
    trigger_word: params.trigger_word || "",
    description: params.description || "",
  });
  onProgress?.(10);

  // Step 3: Upload file through our edge function proxy (avoids COS CORS issues).
  // Edge function streams body directly to the presigned URL — no buffering.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const proxyUrl = `${getKiaraBaseUrl()}/upload-lora-runninghub`;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", proxyUrl);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("X-Upload-URL", prepareResult.upload_url);
    xhr.setRequestHeader("X-Lora-ID", prepareResult.lora_id);
    if (anonKey) xhr.setRequestHeader("apikey", anonKey);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = 10 + Math.round((event.loaded / event.total) * 85);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText)?.error || msg; } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.timeout = 600000; // 10 min for large files
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    xhr.send(file);
  });

  onProgress?.(100);
  return {
    lora_id: prepareResult.lora_id,
    rh_lora_name: prepareResult.rh_lora_name,
  };
};

/**
 * List user's completed RunningHub LoRAs
 */
export const listUserLoRAs = async (): Promise<LoRAListResponse> => {
  return kiaraRequest<LoRAListResponse>("upload-lora-runninghub", {
    action: "list",
  });
};

/**
 * Delete a LoRA (soft delete)
 */
export const deleteLoRA = async (loraId: string): Promise<{ success: boolean }> => {
  return kiaraRequest<{ success: boolean }>("upload-lora-runninghub", {
    action: "delete",
    lora_id: loraId,
  });
};

// ==================== KIARA VISION ====================

export type KiaraVisionImageModel = "gen4_image_turbo" | "gen4_image" | "gemini_2.5_flash";

export type KiaraVisionVoicePreset =
  | "Maya" | "Arjun" | "Serene" | "Bernard" | "Billy" | "Mark"
  | "Clint" | "Mabel" | "Chad" | "Leslie" | "Eleanor" | "Elias"
  | "Elliot" | "Grungle" | "Brodie" | "Sandra" | "Kirk" | "Kylie"
  | "Lara" | "Lisa" | "Malachi" | "Marlene" | "Martin" | "Miriam"
  | "Monster" | "Paula" | "Pip" | "Rusty" | "Ragnar" | "Xylar"
  | "Maggie" | "Jack" | "Katie" | "Noah" | "James" | "Rina"
  | "Ella" | "Mariah" | "Frank" | "Claudia" | "Niki" | "Vincent"
  | "Kendrick" | "Myrna" | "Tom" | "Wanda" | "Benjamin" | "Kiana"
  | "Rachel";

export type KiaraVisionDubbingLanguage =
  | "en" | "zh" | "es" | "hi" | "pt" | "fr" | "de" | "ja"
  | "ar" | "ko" | "it" | "ru" | "nl" | "tr" | "pl" | "sv"
  | "id" | "fil" | "ms" | "ro" | "uk" | "el" | "cs" | "da"
  | "fi" | "bg" | "hr" | "sk" | "ta";

export interface KiaraVisionReferenceImage {
  uri: string;
  tag?: string;
}

export interface KiaraVisionTaskResponse {
  success: boolean;
  model_id?: string;
  job_id?: string;
  task_id?: string;
  status?: string;
  images?: string[];
  video?: string;
  audio?: string;
  output?: string | string[];
  error?: string;
  progress?: number | null;
  createdAt?: string;
  credits_charged?: number;
  storagePaths?: string[];
  creditBalance?: number;
  tier?: Record<string, unknown>;
  usage?: Record<string, unknown>;
}

const kiaraVisionRequest = async <T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> => {
  try {
    return await kiaraRequest<T>("kiara-intelligence", {
      route: "vision",
      action,
      payload,
    });
  } catch (error: any) {
    const message = String(error?.message || "");
    const gatewayUnavailable =
      /failed to fetch/i.test(message) ||
      /networkerror/i.test(message) ||
      /err_failed/i.test(message) ||
      /request failed \(404\)/i.test(message) ||
      /unsupported route/i.test(message) ||
      /unsupported.*action/i.test(message);

    if (!gatewayUnavailable) throw error;

    return kiaraRequest<T>("kiara-vision", {
      action,
      ...payload,
    });
  }
};

/** Generate images from text/reference via Kiara Vision */
export const kiaraVisionTextToImage = async (params: {
  promptText: string;
  model?: KiaraVisionImageModel;
  ratio?: string;
  referenceImages?: KiaraVisionReferenceImage[];
  seed?: number;
  client_request_id?: string;
  contentModeration?: { publicFigureThreshold?: "auto" | "low" };
}): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("text-to-image", params as Record<string, unknown>);
};

/** Generate video from image — returns task_id for polling */
export const kiaraVisionImageToVideo = async (params: {
  promptImage: string;
  promptText?: string;
  duration?: 5 | 10;
  ratio?: string;
  seed?: number;
}): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("image-to-video", params as Record<string, unknown>);
};

/** Character performance — returns task_id for polling */
export const kiaraVisionCharacterPerformance = async (params: {
  character: string | { type: "image" | "video"; uri: string };
  reference: string | { type: "video"; uri: string };
  seed?: number;
  bodyControl?: boolean;
  expressionIntensity?: number;
  ratio?: string;
}): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("character-performance", params as Record<string, unknown>);
};

/** Generate sound effect from text */
export const kiaraVisionSoundEffect = async (params: {
  promptText: string;
  duration?: number;
  loop?: boolean;
}): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("sound-effect", params as Record<string, unknown>);
};

/** Text to speech with voice preset */
export const kiaraVisionTextToSpeech = async (params: {
  promptText: string;
  voice?: KiaraVisionVoicePreset;
}): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("text-to-speech", params as Record<string, unknown>);
};

/** Speech to speech (voice conversion) — returns task_id for polling */
export const kiaraVisionSpeechToSpeech = async (params: {
  media: string | { type: "audio" | "video"; uri: string };
  voice?: KiaraVisionVoicePreset;
  removeBackgroundNoise?: boolean;
}): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("speech-to-speech", params as Record<string, unknown>);
};

/** Voice dubbing (translation) — returns task_id for polling */
export const kiaraVisionVoiceDubbing = async (params: {
  audioUri: string;
  targetLang: KiaraVisionDubbingLanguage;
  disableVoiceCloning?: boolean;
  dropBackgroundAudio?: boolean;
  numSpeakers?: number;
}): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("voice-dubbing", params as Record<string, unknown>);
};

/** Voice isolation (separate voice from background) */
export const kiaraVisionVoiceIsolation = async (params: {
  audioUri: string;
}): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("voice-isolation", params as Record<string, unknown>);
};

/** Check task status (for frontend polling of slow actions) */
export const kiaraVisionTaskStatus = async (taskId: string): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("task-status", {
    task_id: taskId,
  });
};

/** Cancel a running task */
export const kiaraVisionCancelTask = async (taskId: string): Promise<{ success: boolean }> => {
  return kiaraVisionRequest<{ success: boolean }>("cancel-task", {
    task_id: taskId,
  });
};

/** Get organization info (credits, usage tier) */
export const kiaraVisionOrganization = async (): Promise<KiaraVisionTaskResponse> => {
  return kiaraVisionRequest<KiaraVisionTaskResponse>("organization");
};

// ==================== xAI ENTERPRISE WRAPPER ====================

type XaiAction =
  | "chat-completions"
  | "messages-create"
  | "completions-legacy"
  | "complete-legacy"
  | "chat-deferred-get"
  | "responses-create"
  | "responses-get"
  | "responses-delete"
  | "images-generate"
  | "images-edit"
  | "videos-generate"
  | "videos-edit"
  | "videos-get"
  | "api-key"
  | "models-list"
  | "models-get"
  | "language-models-list"
  | "language-models-get"
  | "image-generation-models-list"
  | "image-generation-models-get"
  | "tokenize-text"
  | "batches-create"
  | "batches-list"
  | "batches-get"
  | "batches-list-requests"
  | "batches-add-requests"
  | "batches-results"
  | "batches-cancel";

export interface XaiChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string; refusal?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: Record<string, unknown>;
}

export interface XaiResponseObject {
  id: string;
  object: "response";
  model: string;
  status: "completed" | "in_progress" | "incomplete";
  output?: Array<Record<string, unknown>>;
  usage?: Record<string, unknown>;
}

export interface XaiImageGenerationResponse {
  data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  job_id?: string;
  model_id?: string;
  credits_charged?: number;
}

export interface XaiVideoRequestResponse {
  request_id: string;
  job_id?: string;
  model_id?: string;
}

export interface XaiVideoResultResponse {
  status?: "pending" | "done";
  video?: { url: string; duration?: number };
  model?: string;
  job_id?: string;
  model_id?: string;
  credits_charged?: number;
}

export interface XaiModelMin {
  id: string;
  created: number;
  object: "model";
  owned_by: string;
}

export interface XaiLanguageModel extends XaiModelMin {
  fingerprint?: string;
  version?: string;
  input_modalities?: string[];
  output_modalities?: string[];
  prompt_text_token_price?: number;
  cached_prompt_text_token_price?: number;
  prompt_image_token_price?: number;
  completion_text_token_price?: number;
  search_price?: number;
  aliases?: string[];
}

export interface XaiImageGenerationModel extends XaiModelMin {
  fingerprint?: string;
  version?: string;
  max_prompt_length?: number;
  prompt_text_token_price?: number;
  prompt_image_token_price?: number;
  generated_image_token_price?: number;
  aliases?: string[];
}

export interface XaiBatchInfo {
  batch_id: string;
  name: string;
  create_time?: string;
  expire_time?: string;
  cancel_time?: string | null;
  create_api_key_id?: string;
  state?: Record<string, unknown> | null;
}

const kiaraXaiRequest = async <T>(
  action: XaiAction,
  payload: Record<string, unknown> = {}
): Promise<T> => {
  try {
    return await kiaraRequest<T>("kiara-intelligence", {
      route: "xai",
      action,
      payload,
    });
  } catch (error: any) {
    const message = String(error?.message || "");
    const gatewayUnavailable =
      /failed to fetch/i.test(message) ||
      /networkerror/i.test(message) ||
      /err_failed/i.test(message) ||
      /request failed \(404\)/i.test(message) ||
      /unsupported route/i.test(message) ||
      /missing xai action/i.test(message);

    if (!gatewayUnavailable) throw error;

    return kiaraRequest<T>("kiara-grok", {
      action,
      ...payload,
    });
  }
};

export const xaiChatCompletions = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<XaiChatCompletionResponse>("chat-completions", payload);

export const xaiMessagesCreate = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<Record<string, unknown>>("messages-create", payload);

export const xaiCompletionsLegacy = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<Record<string, unknown>>("completions-legacy", payload);

export const xaiCompleteLegacy = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<Record<string, unknown>>("complete-legacy", payload);

export const xaiDeferredCompletion = async (requestId: string) =>
  kiaraXaiRequest<XaiChatCompletionResponse>("chat-deferred-get", { request_id: requestId });

export const xaiCreateResponse = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<XaiResponseObject>("responses-create", payload);

export const xaiGetResponse = async (responseId: string) =>
  kiaraXaiRequest<XaiResponseObject>("responses-get", { response_id: responseId });

export const xaiDeleteResponse = async (responseId: string) =>
  kiaraXaiRequest<{ id: string; object: string; deleted: boolean }>("responses-delete", { response_id: responseId });

export const xaiGenerateImage = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<XaiImageGenerationResponse>("images-generate", payload);

export const xaiEditImage = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<XaiImageGenerationResponse>("images-edit", payload);

export const xaiGenerateVideo = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<XaiVideoRequestResponse>("videos-generate", payload);

export const xaiEditVideo = async (payload: Record<string, unknown>) =>
  kiaraXaiRequest<XaiVideoRequestResponse>("videos-edit", payload);

export const xaiGetVideo = async (requestId: string) =>
  kiaraXaiRequest<XaiVideoResultResponse>("videos-get", { request_id: requestId });

export const xaiGetApiKeyInfo = async () =>
  kiaraXaiRequest<Record<string, unknown>>("api-key");

export const xaiListModels = async () =>
  kiaraXaiRequest<{ data: XaiModelMin[]; object: "list" }>("models-list");

export const xaiGetModel = async (modelId: string) =>
  kiaraXaiRequest<XaiModelMin>("models-get", { model_id: modelId });

export const xaiListLanguageModels = async () =>
  kiaraXaiRequest<{ models: XaiLanguageModel[] }>("language-models-list");

export const xaiGetLanguageModel = async (modelId: string) =>
  kiaraXaiRequest<XaiLanguageModel>("language-models-get", { model_id: modelId });

export const xaiListImageGenerationModels = async () =>
  kiaraXaiRequest<{ models: XaiImageGenerationModel[] }>("image-generation-models-list");

export const xaiGetImageGenerationModel = async (modelId: string) =>
  kiaraXaiRequest<XaiImageGenerationModel>("image-generation-models-get", { model_id: modelId });

export const xaiTokenizeText = async (text: string, model: string) =>
  kiaraXaiRequest<{ token_ids: Array<Record<string, unknown>> }>("tokenize-text", { text, model });

export const xaiCreateBatch = async (name: string) =>
  kiaraXaiRequest<XaiBatchInfo>("batches-create", { name });

export const xaiListBatches = async (params?: { limit?: number; pagination_token?: string }) =>
  kiaraXaiRequest<{ batches: XaiBatchInfo[]; pagination_token?: string | null }>(
    "batches-list",
    params ?? {}
  );

export const xaiGetBatch = async (batchId: string) =>
  kiaraXaiRequest<XaiBatchInfo>("batches-get", { batch_id: batchId });

export const xaiListBatchRequests = async (
  batchId: string,
  params?: { limit?: number; pagination_token?: string }
) =>
  kiaraXaiRequest<{
    batch_request_metadata: Array<Record<string, unknown>>;
    pagination_token?: string | null;
  }>("batches-list-requests", { batch_id: batchId, ...(params ?? {}) });

export const xaiAddBatchRequests = async (batchId: string, batch_requests: Array<Record<string, unknown>>) =>
  kiaraXaiRequest<Record<string, unknown>>("batches-add-requests", { batch_id: batchId, batch_requests });

export const xaiGetBatchResults = async (
  batchId: string,
  params?: { limit?: number; pagination_token?: string }
) =>
  kiaraXaiRequest<{
    results: Array<Record<string, unknown>>;
    pagination_token?: string | null;
  }>("batches-results", { batch_id: batchId, ...(params ?? {}) });

export const xaiCancelBatch = async (batchId: string) =>
  kiaraXaiRequest<XaiBatchInfo>("batches-cancel", { batch_id: batchId });
