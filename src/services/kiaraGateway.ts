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
  provider?: "replicate" | "wavespeed";
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
}

export interface KiaraMediaResponse {
  success: boolean;
  output: string | null;
}

export const kiaraMedia = async (params: KiaraMediaRequest): Promise<KiaraMediaResponse> => {
  return kiaraRequest<KiaraMediaResponse>("kiara-media", params);
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

export interface LoRAUploadInitResponse {
  upload_url: string;
  lora_id: string;
  rh_lora_name: string;
}

/**
 * Compute MD5 hex of a File (required by RunningHub upload API)
 */
export const computeFileMD5 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const spark = new SparkMD5.ArrayBuffer();
      spark.append(e.target!.result as ArrayBuffer);
      resolve(spark.end());
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Step 1: Get presigned upload URL from RunningHub via edge function
 */
export const initLoRAUpload = async (params: {
  lora_name: string;
  md5_hex: string;
  file_size_bytes: number;
  trigger_word?: string;
  description?: string;
}): Promise<LoRAUploadInitResponse> => {
  return kiaraRequest<LoRAUploadInitResponse>("upload-lora-runninghub", {
    action: "get-upload-url",
    ...params,
  });
};

/**
 * Step 2: Upload file directly to RunningHub presigned URL
 * Runs in the browser — direct PUT to RunningHub, bypassing edge functions
 */
export const uploadFileToPresignedUrl = async (
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.send(file);
  });
};

/**
 * Step 3: Confirm upload completion
 */
export const confirmLoRAUpload = async (
  loraId: string
): Promise<{ success: boolean; lora: LoRAModel }> => {
  return kiaraRequest<{ success: boolean; lora: LoRAModel }>(
    "upload-lora-runninghub",
    { action: "confirm-upload", lora_id: loraId }
  );
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
