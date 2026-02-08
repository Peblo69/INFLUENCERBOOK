// Fal.ai API Service for Wan 2.2 Text-to-Image with Multiple LoRAs
// Supports unlimited LoRAs with high/low transformer selection
// Based on the InstagirlMix ComfyUI workflow

export interface FalLoRA {
  path: string;           // URL to LoRA file or HuggingFace path
  scale?: number;         // Weight multiplier (default: 1.0)
  weight_name?: string;   // Safetensors filename (for repos with multiple files)
  transformer?: 'high' | 'low' | 'both';  // Which transformer to apply to (default: 'high')
}

export interface FalImageSize {
  width: number;
  height: number;
}

export type FalImageSizePreset =
  | 'square_hd'      // 1024x1024
  | 'square'         // 512x512
  | 'portrait_4_3'   // 768x1024
  | 'portrait_16_9'  // 576x1024
  | 'landscape_4_3'  // 1024x768
  | 'landscape_16_9'; // 1024x576

export interface FalSimpleLoRA {
  path: string;
  scale?: number;
}

export interface FalTextToImageParams {
  prompt: string;
  negative_prompt?: string;
  image_size?: FalImageSizePreset | FalImageSize;
  num_inference_steps?: number;       // Default: 27
  guidance_scale?: number;            // Default: 3.5
  guidance_scale_2?: number;          // Second stage guidance (default: 4)
  shift?: number;                     // 1.0-10.0 (default: 2)
  seed?: number;
  // NEW: Separate LoRA arrays for Wan 2.2
  loras?: FalSimpleLoRA[];            // Low noise LoRAs (applied to second transformer)
  high_noise_loras?: FalSimpleLoRA[]; // High noise LoRAs (applied to first transformer)
  image_format?: 'png' | 'jpeg';      // Default: 'jpeg'
  enable_safety_checker?: boolean;
  enable_output_safety_checker?: boolean;
  enable_prompt_expansion?: boolean;
  acceleration?: 'none' | 'regular';  // Default: 'regular'
}

export interface FalImage {
  url: string;
  content_type: string;
  file_name: string;
  file_size: number;
  width?: number;
  height?: number;
}

export interface FalResponse {
  image: FalImage;
  seed: number;
  timings?: {
    inference: number;
  };
}

export interface FalQueueResponse {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  response_url?: string;
}

export interface FalStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  logs?: Array<{ message: string; timestamp: string }>;
  response?: FalResponse;
  error?: string;
}

// NOTE: Client-side fal.ai calls are disabled. Route requests through Supabase Edge Functions instead.
const FAL_API_KEY = "";
const FAL_BASE_URL = 'https://fal.run';
const FAL_QUEUE_URL = 'https://queue.fal.run';

// Model endpoints
export const MODELS = {
  // Wan 2.2 14B Text-to-Image with LoRA support
  WAN_T2I_LORA: 'fal-ai/wan/v2.2-a14b/text-to-image/lora',
  // Wan 2.2 14B Text-to-Video with LoRA support
  WAN_T2V_LORA: 'fal-ai/wan/v2.2-a14b/text-to-video/lora',
  // Wan 2.2 14B LoRA Trainer
  WAN_TRAINER: 'fal-ai/wan-22-image-trainer',

  // === TOP-TIER REALISTIC MODELS ===
  // FLUX Pro 1.1 Ultra - Best overall, 2K resolution, highest Elo score
  FLUX_PRO_ULTRA: 'fal-ai/flux-pro/v1.1-ultra',
  // FLUX Pro 1.1 - Professional grade
  FLUX_PRO: 'fal-ai/flux-pro/v1.1',
  // FLUX 2 Pro Edit - Image editing with Flux 2
  FLUX_2_PRO_EDIT: 'fal-ai/flux-2-pro/edit',
  // Imagen 4 Ultra - Google's highest quality
  IMAGEN4_ULTRA: 'fal-ai/imagen4/preview/ultra',
  // Imagen 4 Standard
  IMAGEN4: 'fal-ai/imagen4/preview',
  // Recraft V3 - SOTA on HuggingFace benchmarks, excellent for realistic
  RECRAFT_V3: 'fal-ai/recraft/v3/text-to-image',
  // HiDream I1 - 17B parameter, open source SOTA
  HIDREAM_I1: 'fal-ai/hidream-i1-full',
};

// Model info for UI - Only the best realistic models
export const MODEL_INFO = {
  'wan-t2i': {
    id: 'wan-t2i',
    name: 'Wan 2.2 + LoRA',
    description: 'Best for trained characters with InstagirlMix style',
    speed: 'medium',
    quality: 'excellent',
    cost: '$0.03',
    supportsLora: true,
    endpoint: MODELS.WAN_T2I_LORA,
    category: 'lora',
  },
  'flux-pro-ultra': {
    id: 'flux-pro-ultra',
    name: 'FLUX Pro 1.1 Ultra',
    description: 'Highest Elo score, 2K resolution, ultimate photorealism',
    speed: 'fast',
    quality: 'ultimate',
    cost: '$0.06',
    supportsLora: false,
    endpoint: MODELS.FLUX_PRO_ULTRA,
    category: 'premium',
  },
  'flux-pro': {
    id: 'flux-pro',
    name: 'FLUX Pro 1.1',
    description: 'Professional grade, exceptional detail and realism',
    speed: 'fast',
    quality: 'excellent',
    cost: '$0.05',
    supportsLora: false,
    endpoint: MODELS.FLUX_PRO,
    category: 'premium',
  },
  'imagen4-ultra': {
    id: 'imagen4-ultra',
    name: 'Imagen 4 Ultra',
    description: 'Google\'s best - fine details, textures, photorealism',
    speed: 'medium',
    quality: 'ultimate',
    cost: '$0.06',
    supportsLora: false,
    endpoint: MODELS.IMAGEN4_ULTRA,
    category: 'premium',
  },
  'imagen4': {
    id: 'imagen4',
    name: 'Imagen 4',
    description: 'Google\'s SOTA - excellent quality/cost ratio',
    speed: 'fast',
    quality: 'excellent',
    cost: '$0.05',
    supportsLora: false,
    endpoint: MODELS.IMAGEN4,
    category: 'quality',
  },
  'recraft-v3': {
    id: 'recraft-v3',
    name: 'Recraft V3',
    description: 'SOTA on HuggingFace, photorealistic with style control',
    speed: 'fast',
    quality: 'excellent',
    cost: '$0.04',
    supportsLora: false,
    endpoint: MODELS.RECRAFT_V3,
    category: 'quality',
    styles: ['realistic_image', 'realistic_image/studio_portrait', 'realistic_image/natural_light', 'realistic_image/hdr'],
  },
  'hidream-i1': {
    id: 'hidream-i1',
    name: 'HiDream I1',
    description: 'Open source 17B params, SOTA quality in seconds',
    speed: 'fast',
    quality: 'excellent',
    cost: '$0.03',
    supportsLora: false,
    endpoint: MODELS.HIDREAM_I1,
    category: 'quality',
  },
  'flux-2-pro-edit': {
    id: 'flux-2-pro-edit',
    name: 'FLUX 2 Pro Edit',
    description: 'Edit images with Flux 2 Pro - add, remove, or modify elements',
    speed: 'fast',
    quality: 'excellent',
    cost: '$0.05',
    supportsLora: false,
    endpoint: MODELS.FLUX_2_PRO_EDIT,
    category: 'edit',
    supportsImageInput: true,
  },
};

// ==================== LORA TRAINING ====================

export interface FalTrainingParams {
  training_data_url: string;    // URL to ZIP file with training images
  trigger_phrase: string;       // Trigger word (e.g., "p3rs0n", "myst1le")
  steps?: number;               // 10-6000 (default: 1000) - $0.0045/step
  learning_rate?: number;       // 0.000001-0.1 (default: 0.0007)
  use_face_detection?: boolean; // Default: true
  use_face_cropping?: boolean;  // Default: false
  use_masks?: boolean;          // Default: true
  is_style?: boolean;           // Set true for style training (disables face options)
  include_synthetic_captions?: boolean; // Default: false
}

export interface FalTrainingFile {
  url: string;
  content_type: string;
  file_name: string;
  file_size: number;
}

export interface FalTrainingResponse {
  diffusers_lora_file: FalTrainingFile;  // Low noise LoRA
  high_noise_lora: FalTrainingFile;      // High noise LoRA
  config_file: FalTrainingFile;          // Config for inference
}

export interface FalTrainingQueueResponse {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface FalTrainingStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  logs?: Array<{ message: string; timestamp: string; level?: string }>;
  response?: FalTrainingResponse;
  error?: string;
}

/**
 * Submit Wan 2.2 LoRA training job
 * Returns TWO LoRAs: high noise + low noise (perfect for Wan 2.2!)
 * Cost: $0.0045/step ($4.50 for 1000 steps)
 */
export const submitTraining = async (params: FalTrainingParams): Promise<FalTrainingQueueResponse> => {
  try {
    console.log('🚀 Submitting Wan 2.2 LoRA training:', {
      trigger: params.trigger_phrase,
      steps: params.steps || 1000,
      isStyle: params.is_style || false,
    });

    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.WAN_TRAINER}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        training_data_url: params.training_data_url,
        trigger_phrase: params.trigger_phrase,
        steps: params.steps || 1000,
        learning_rate: params.learning_rate || 0.0007,
        use_face_detection: params.use_face_detection ?? true,
        use_face_cropping: params.use_face_cropping ?? false,
        use_masks: params.use_masks ?? true,
        is_style: params.is_style ?? false,
        include_synthetic_captions: params.include_synthetic_captions ?? false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data: FalTrainingQueueResponse = await response.json();
    console.log('✅ Training queued:', data.request_id);
    return data;
  } catch (error: any) {
    console.error('Training Submit Error:', error);
    throw new Error(error.message || 'Failed to submit training');
  }
};

/**
 * Check training job status
 */
export const getTrainingStatus = async (requestId: string): Promise<FalTrainingStatusResponse> => {
  try {
    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.WAN_TRAINER}/requests/${requestId}/status`, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Training Status Error:', error);
    throw new Error(error.message || 'Failed to check training status');
  }
};

/**
 * Get training result (after completion)
 */
export const getTrainingResult = async (requestId: string): Promise<FalTrainingResponse> => {
  try {
    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.WAN_TRAINER}/requests/${requestId}`, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Training Result Error:', error);
    throw new Error(error.message || 'Failed to get training result');
  }
};

/**
 * Wait for training to complete (polls status)
 * Training typically takes 10-30 minutes for 1000 steps
 */
export const waitForTraining = async (
  requestId: string,
  pollInterval: number = 10000,  // 10 seconds
  maxAttempts: number = 360,     // 1 hour max
  onProgress?: (status: string, logs?: string[]) => void
): Promise<FalTrainingResponse> => {
  console.log('⏳ Waiting for training completion...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await getTrainingStatus(requestId);

    if (onProgress) {
      const logMessages = status.logs?.map(l => l.message);
      onProgress(status.status, logMessages);
    }

    if (status.status === 'COMPLETED') {
      console.log('🎉 Training completed!');
      return await getTrainingResult(requestId);
    }

    if (status.status === 'FAILED') {
      throw new Error(status.error || 'Training failed');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Training timeout - exceeded 1 hour');
};

/**
 * Estimate training cost
 */
export const estimateTrainingCost = (steps: number): string => {
  const cost = Math.max(100, steps) * 0.0045;
  return `$${cost.toFixed(2)}`;
};

/**
 * Estimate training time
 */
export const estimateTrainingTime = (steps: number): string => {
  // Roughly 1-2 seconds per step
  const minutes = Math.ceil((steps * 1.5) / 60);
  if (minutes < 60) {
    return `~${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `~${hours}h ${remainingMins}m`;
};

// InstagirlMix default negative prompt (from ComfyUI workflow)
export const INSTAGIRL_NEGATIVE_PROMPT = `色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走, censored, sunburnt skin, rashy skin, red cheeks`;

// HuggingFace direct download URLs for LoRAs
export const LORA_URLS = {
  // InstagirlMix official (Instara)
  INSTAGIRL_HIGH: 'https://huggingface.co/Instara/instagirlmix-wan-2.2/resolve/main/WAN2.2_HighNoise_InstagirlMix_V1.safetensors',
  INSTAGIRL_LOW: 'https://huggingface.co/Instara/instagirlmix-wan-2.2/resolve/main/WAN2.2_LowNoise_InstagirlMix_V1.safetensors',

  // Lightx2v distillation LoRA (faster generation)
  LIGHTX2V_DISTILL: 'https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan21_T2V_14B_lightx2v_cfg_step_distill_lora_rank32.safetensors',

  // YOUR CUSTOM TRAINED LORA - trained on fal.ai
  CUSTOM_HIGH: 'https://d2p7pge43lyniu.cloudfront.net/output/908a6e7a-15dc-49d8-b6ba-6db4ed7a67ba-u2_t2v_A14B_separate_high_noise_lora_a3e2ae48-470d-44f3-b5b8-2e6bc0e7625b.safetensors',
  CUSTOM_LOW: 'https://d2p7pge43lyniu.cloudfront.net/output/908a6e7a-15dc-49d8-b6ba-6db4ed7a67ba-u2_t2v_A14B_separate_low_noise_lora_38b6e6c9-054b-4367-a52e-663a7d954360.safetensors',
};

// Default InstagirlMix LoRA presets
export const INSTAGIRL_LORA_PRESETS = {
  HIGH_NOISE: {
    url: LORA_URLS.INSTAGIRL_HIGH,
    transformer: 'high' as const,
    scale: 1.0,
  },
  LOW_NOISE: {
    url: LORA_URLS.INSTAGIRL_LOW,
    transformer: 'low' as const,
    scale: 1.0,
  },
  LIGHTX2V_DISTILL: {
    url: LORA_URLS.LIGHTX2V_DISTILL,
    transformer: 'both' as const,
    scale: 0.6,
  },
};

/**
 * Generate image using Wan 2.2 with LoRAs (synchronous)
 * Use this for quick generations - waits for result
 *
 * IMPORTANT: Wan 2.2 uses TWO separate LoRA arrays:
 * - loras: Applied to the LOW noise transformer (second pass)
 * - high_noise_loras: Applied to the HIGH noise transformer (first pass)
 */
export const generateImageSync = async (params: FalTextToImageParams): Promise<FalResponse> => {
  try {
    console.log('🎨 Fal.ai Wan 2.2 Generation:', {
      prompt: params.prompt.substring(0, 80) + '...',
      lowNoiseLoras: params.loras?.length || 0,
      highNoiseLoras: params.high_noise_loras?.length || 0,
      size: params.image_size || 'square_hd',
    });

    const requestBody: any = {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt || '',
      image_size: params.image_size || 'square_hd',
      num_inference_steps: params.num_inference_steps || 27,
      guidance_scale: params.guidance_scale || 3.5,
      guidance_scale_2: params.guidance_scale_2 || 4,
      shift: params.shift || 2,
      seed: params.seed,
      image_format: params.image_format || 'jpeg',
      enable_safety_checker: params.enable_safety_checker ?? false,
      enable_output_safety_checker: params.enable_output_safety_checker ?? false,
      enable_prompt_expansion: params.enable_prompt_expansion ?? false,
      acceleration: params.acceleration || 'regular',
    };

    // Add LoRAs only if they exist
    if (params.loras && params.loras.length > 0) {
      requestBody.loras = params.loras;
    }
    if (params.high_noise_loras && params.high_noise_loras.length > 0) {
      requestBody.high_noise_loras = params.high_noise_loras;
    }

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.WAN_T2I_LORA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('Fal.ai Error:', errorData);
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }

    const data: FalResponse = await response.json();
    console.log('✅ Generation complete:', data.image.url);
    return data;
  } catch (error: any) {
    console.error('Fal.ai Generation Error:', error);
    throw new Error(error.message || 'Failed to generate image');
  }
};

/**
 * Generate video using Wan 2.2 Text-to-Video with LoRAs (synchronous)
 */
export const generateVideoSync = async (params: {
  prompt: string;
  image_url?: string;
  loras?: FalSimpleLoRA[];
  aspect_ratio?: string;
}): Promise<FalResponse> => {
  try {
    console.log('🎬 Fal.ai Wan 2.2 Video Generation:', {
      prompt: params.prompt.substring(0, 80) + '...',
      loras: params.loras?.length || 0,
    });

    const requestBody: any = {
      prompt: params.prompt,
      aspect_ratio: params.aspect_ratio || '16:9',
      loop: false,
    };

    if (params.image_url) {
      requestBody.image_url = params.image_url;
    }

    if (params.loras && params.loras.length > 0) {
      requestBody.loras = params.loras;
    }

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.WAN_T2V_LORA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Video generation complete:', data.video.url);
    return {
      image: {
        url: data.video.url,
        content_type: 'video/mp4',
        file_name: 'video.mp4',
        file_size: 0
      },
      seed: data.seed || 0,
      timings: data.timings
    };
  } catch (error: any) {
    console.error('Fal.ai Video Generation Error:', error);
    throw new Error(error.message || 'Failed to generate video');
  }
};

/**
 * Submit generation to queue (for longer generations)
 * Returns request_id to poll for status
 */
export const submitToQueue = async (params: FalTextToImageParams): Promise<FalQueueResponse> => {
  try {
    console.log('📤 Submitting to Fal.ai queue...');

    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.WAN_T2I_LORA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        negative_prompt: params.negative_prompt || '',
        image_size: params.image_size || 'square_hd',
        num_inference_steps: params.num_inference_steps || 27,
        guidance_scale: params.guidance_scale || 3.5,
        guidance_scale_2: params.guidance_scale_2 || 4,
        shift: params.shift || 2,
        seed: params.seed,
        loras: params.loras || [],
        image_format: params.image_format || 'jpeg',
        enable_safety_checker: params.enable_safety_checker ?? false,
        enable_output_safety_checker: params.enable_output_safety_checker ?? false,
        enable_prompt_expansion: params.enable_prompt_expansion ?? false,
        acceleration: params.acceleration || 'regular',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data: FalQueueResponse = await response.json();
    console.log('✅ Queued:', data.request_id);
    return data;
  } catch (error: any) {
    console.error('Fal.ai Queue Error:', error);
    throw new Error(error.message || 'Failed to queue generation');
  }
};

/**
 * Check status of queued generation
 */
export const getQueueStatus = async (requestId: string): Promise<FalStatusResponse> => {
  try {
    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.WAN_T2I_LORA}/requests/${requestId}/status`, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Status Check Error:', error);
    throw new Error(error.message || 'Failed to check status');
  }
};

/**
 * Get result of completed queue request
 */
export const getQueueResult = async (requestId: string): Promise<FalResponse> => {
  try {
    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.WAN_T2I_LORA}/requests/${requestId}`, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get Result Error:', error);
    throw new Error(error.message || 'Failed to get result');
  }
};

/**
 * Wait for queued generation to complete
 */
export const waitForCompletion = async (
  requestId: string,
  pollInterval: number = 2000,
  maxAttempts: number = 150,
  onProgress?: (status: string, logs?: string[]) => void
): Promise<FalResponse> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await getQueueStatus(requestId);

    if (onProgress) {
      const logMessages = status.logs?.map(l => l.message);
      onProgress(status.status, logMessages);
    }

    if (status.status === 'COMPLETED') {
      return await getQueueResult(requestId);
    }

    if (status.status === 'FAILED') {
      throw new Error(status.error || 'Generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Generation timeout');
};

// ==================== INSTAGIRL MIX PRESET ====================

export interface InstagirlMixParams {
  prompt: string;
  seed?: number;
  useHighNoise?: boolean;     // Use high noise LoRA (default: true)
  useLowNoise?: boolean;      // Use low noise LoRA (default: true)
  useDistill?: boolean;       // Use distill LoRA for speed (default: true)
  customLoraUrl?: string;     // Optional custom style LoRA URL
  customLoraScale?: number;   // Scale for custom LoRA (default: 0.6)
  width?: number;             // Default: 960
  height?: number;            // Default: 1280
  steps?: number;             // Default: 12
  guidanceScale?: number;     // Default: 1
}

/**
 * Generate using InstagirlMix preset (matches ComfyUI workflow)
 * Uses public HuggingFace LoRAs by default
 */
export const generateInstagirlMix = async (params: InstagirlMixParams): Promise<FalResponse> => {
  const loras: FalLoRA[] = [];

  // Add high noise LoRA (for first sampling pass) - default ON
  if (params.useHighNoise !== false) {
    loras.push({
      path: LORA_URLS.INSTAGIRL_HIGH,
      scale: 1.0,
      transformer: 'high',
    });
  }

  // Add low noise LoRA (for second sampling pass) - default ON
  if (params.useLowNoise !== false) {
    loras.push({
      path: LORA_URLS.INSTAGIRL_LOW,
      scale: 1.0,
      transformer: 'low',
    });
  }

  // Add distill LoRA (for faster generation) - default ON
  if (params.useDistill !== false) {
    loras.push({
      path: LORA_URLS.LIGHTX2V_DISTILL,
      scale: 0.6,
      transformer: 'both',
    });
  }

  // Add custom style LoRA if provided
  if (params.customLoraUrl) {
    loras.push({
      path: params.customLoraUrl,
      scale: params.customLoraScale || 0.6,
      transformer: 'both',
    });
  }

  // Add trigger word to prompt (InstagirlMix style)
  const fullPrompt = `InstagirlMix, ${params.prompt}, Instagirl, kept delicate noise texture, dangerous charm, amateur cellphone quality, visible sensor noise, heavy HDR glow, amateur photo, blown-out highlight from the lamp, deeply crushed shadows`;

  console.log('🎨 InstagirlMix Generation:', {
    prompt: params.prompt.substring(0, 50) + '...',
    loras: loras.length,
    size: `${params.width || 960}x${params.height || 1280}`,
  });

  return generateImageSync({
    prompt: fullPrompt,
    negative_prompt: INSTAGIRL_NEGATIVE_PROMPT,
    image_size: {
      width: params.width || 960,
      height: params.height || 1280,
    },
    num_inference_steps: params.steps || 12,
    guidance_scale: params.guidanceScale || 1,
    guidance_scale_2: params.guidanceScale || 1,
    shift: 2,
    seed: params.seed,
    loras,
    image_format: 'jpeg',
    acceleration: 'regular',
  });
};

/**
 * Quick generation without LoRAs (faster, lower quality)
 */
export const generateQuick = async (params: {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
}): Promise<FalResponse> => {
  return generateImageSync({
    prompt: params.prompt,
    image_size: {
      width: params.width || 1024,
      height: params.height || 1024,
    },
    num_inference_steps: 20,
    guidance_scale: 3.5,
    seed: params.seed,
    loras: [],
    acceleration: 'regular',
  });
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Upload LoRA file to fal.ai storage (for using local files)
 */
export const uploadLoRAFile = async (file: File): Promise<string> => {
  try {
    // First, get upload URL
    const initResponse = await fetch('https://fal.ai/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_type: file.type || 'application/octet-stream',
        file_name: file.name,
      }),
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initialize upload');
    }

    const { upload_url, file_url } = await initResponse.json();

    // Upload file
    const uploadResponse = await fetch(upload_url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    console.log('✅ LoRA uploaded:', file_url);
    return file_url;
  } catch (error: any) {
    console.error('Upload Error:', error);
    throw new Error(error.message || 'Failed to upload LoRA');
  }
};

/**
 * Validate LoRA URL (check if accessible)
 */
export const validateLoRAUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Format HuggingFace model path
 */
export const formatHuggingFacePath = (
  repo: string,
  filename?: string
): { path: string; weight_name?: string } => {
  const path = repo.startsWith('https://') ? repo : `https://huggingface.co/${repo}`;
  return {
    path,
    weight_name: filename,
  };
};

// ==================== PREMIUM REALISTIC GENERATION ====================

export interface PremiumImageParams {
  prompt: string;
  image_size?: FalImageSizePreset | FalImageSize;
  aspect_ratio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '9:21';
  seed?: number;
  num_images?: number;
  output_format?: 'jpeg' | 'png';
  // Recraft specific
  style?: string;
  // FLUX specific
  safety_tolerance?: number;  // 1-6
}

export interface PremiumImageResponse {
  images: FalImage[];
  seed: number;
  timings?: {
    inference: number;
  };
}

/**
 * Generate with FLUX Pro 1.1 Ultra - Best overall model
 * Highest Elo score, 2K resolution, ultimate photorealism
 * Cost: $0.06/image
 */
export const generateFluxProUltra = async (params: PremiumImageParams): Promise<PremiumImageResponse> => {
  try {
    console.log('👑 FLUX Pro 1.1 Ultra Generation:', {
      prompt: params.prompt.substring(0, 60) + '...',
    });

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.FLUX_PRO_ULTRA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        aspect_ratio: params.aspect_ratio || '3:4',
        num_images: params.num_images || 1,
        seed: params.seed,
        output_format: params.output_format || 'jpeg',
        safety_tolerance: params.safety_tolerance || 6,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ FLUX Pro Ultra complete:', data.images?.[0]?.url);
    return data;
  } catch (error: any) {
    console.error('FLUX Pro Ultra Error:', error);
    throw new Error(error.message || 'Failed to generate with FLUX Pro Ultra');
  }
};

/**
 * Generate with FLUX Pro 1.1 - Professional grade
 * Cost: $0.05/image
 */
export const generateFluxPro = async (params: PremiumImageParams): Promise<PremiumImageResponse> => {
  try {
    console.log('🎯 FLUX Pro 1.1 Generation:', {
      prompt: params.prompt.substring(0, 60) + '...',
    });

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.FLUX_PRO}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        aspect_ratio: params.aspect_ratio || '3:4',
        num_images: params.num_images || 1,
        seed: params.seed,
        output_format: params.output_format || 'jpeg',
        safety_tolerance: params.safety_tolerance || 6,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ FLUX Pro complete:', data.images?.[0]?.url);
    return data;
  } catch (error: any) {
    console.error('FLUX Pro Error:', error);
    throw new Error(error.message || 'Failed to generate with FLUX Pro');
  }
};

/**
 * Generate with Imagen 4 Ultra - Google's highest quality
 * Cost: $0.06/image
 */
export const generateImagen4Ultra = async (params: PremiumImageParams): Promise<PremiumImageResponse> => {
  try {
    console.log('🌟 Imagen 4 Ultra Generation:', {
      prompt: params.prompt.substring(0, 60) + '...',
    });

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.IMAGEN4_ULTRA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        aspect_ratio: params.aspect_ratio || '3:4',
        num_images: params.num_images || 1,
        seed: params.seed,
        output_format: params.output_format || 'jpeg',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Imagen 4 Ultra complete:', data.images?.[0]?.url);
    return data;
  } catch (error: any) {
    console.error('Imagen 4 Ultra Error:', error);
    throw new Error(error.message || 'Failed to generate with Imagen 4 Ultra');
  }
};

/**
 * Generate with Imagen 4 - Google's SOTA
 * Cost: $0.05/image
 */
export const generateImagen4 = async (params: PremiumImageParams): Promise<PremiumImageResponse> => {
  try {
    console.log('🎨 Imagen 4 Generation:', {
      prompt: params.prompt.substring(0, 60) + '...',
    });

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.IMAGEN4}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        aspect_ratio: params.aspect_ratio || '3:4',
        num_images: params.num_images || 1,
        seed: params.seed,
        output_format: params.output_format || 'jpeg',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Imagen 4 complete:', data.images?.[0]?.url);
    return data;
  } catch (error: any) {
    console.error('Imagen 4 Error:', error);
    throw new Error(error.message || 'Failed to generate with Imagen 4');
  }
};

/**
 * Generate with Recraft V3 - SOTA on HuggingFace
 * Supports photorealistic styles: realistic_image, studio_portrait, natural_light, hdr
 * Cost: $0.04/image
 */
export const generateRecraftV3 = async (params: PremiumImageParams): Promise<PremiumImageResponse> => {
  try {
    console.log('🖼️ Recraft V3 Generation:', {
      prompt: params.prompt.substring(0, 60) + '...',
      style: params.style || 'realistic_image',
    });

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.RECRAFT_V3}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        style: params.style || 'realistic_image',
        image_size: params.image_size || 'portrait_4_3',
        seed: params.seed,
        output_format: params.output_format || 'jpeg',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    // Recraft returns images array directly
    console.log('✅ Recraft V3 complete:', data.images?.[0]?.url);
    return { images: data.images || [], seed: params.seed || 0 };
  } catch (error: any) {
    console.error('Recraft V3 Error:', error);
    throw new Error(error.message || 'Failed to generate with Recraft V3');
  }
};

/**
 * Generate with HiDream I1 - Open source 17B SOTA
 * Cost: $0.03/image
 */
export const generateHiDream = async (params: PremiumImageParams): Promise<PremiumImageResponse> => {
  try {
    console.log('💫 HiDream I1 Generation:', {
      prompt: params.prompt.substring(0, 60) + '...',
    });

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.HIDREAM_I1}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        image_size: params.image_size || 'portrait_4_3',
        num_images: params.num_images || 1,
        seed: params.seed,
        output_format: params.output_format || 'jpeg',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ HiDream I1 complete:', data.images?.[0]?.url);
    return data;
  } catch (error: any) {
    console.error('HiDream I1 Error:', error);
    throw new Error(error.message || 'Failed to generate with HiDream I1');
  }
};

// Model-specific defaults
export const MODEL_DEFAULTS = {
  'wan-t2i': {
    steps: 12,
    guidance: 1,
    guidance2: 1,
    shift: 2,
  },
  'flux-pro-ultra': {
    aspectRatio: '3:4',
  },
  'flux-pro': {
    aspectRatio: '3:4',
  },
  'imagen4-ultra': {
    aspectRatio: '3:4',
  },
  'imagen4': {
    aspectRatio: '3:4',
  },
  'recraft-v3': {
    style: 'realistic_image',
  },
  'hidream-i1': {
    // Uses defaults
  },
  'flux-2-pro-edit': {
    imageSize: 'auto',
    safetyTolerance: 5,
  },
};

// ==================== FLUX 2 PRO EDIT ====================

export type Flux2EditImageSize =
  | 'auto'
  | 'square_hd'      // 1024x1024
  | 'square'         // 512x512
  | 'portrait_4_3'   // 768x1024
  | 'portrait_16_9'  // 576x1024
  | 'landscape_4_3'  // 1024x768
  | 'landscape_16_9' // 1024x576
  | { width: number; height: number };

export type Flux2SafetyTolerance = 1 | 2 | 3 | 4 | 5;

export interface Flux2EditParams {
  /** The prompt describing the desired edit */
  prompt: string;
  /** List of image URLs to edit (can be URLs or base64 data URIs) */
  image_urls: string[];
  /** Output image size - 'auto' detects from input, or use preset, or custom {width, height} */
  image_size?: Flux2EditImageSize;
  /** Custom width (alternative to image_size preset) */
  width?: number;
  /** Custom height (alternative to image_size preset) */
  height?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Safety tolerance: 1 = most strict, 5 = most permissive */
  safety_tolerance?: Flux2SafetyTolerance;
  /** Enable safety checker (default: false) */
  enable_safety_checker?: boolean;
  /** Output format */
  output_format?: 'jpeg' | 'png';
  /** If true, returns image as data URI (not stored in history) */
  sync_mode?: boolean;
}

export interface Flux2EditResponse {
  images: Array<{
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
    width?: number;
    height?: number;
  }>;
  seed: number;
}

export interface Flux2EditQueueResponse {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface Flux2EditStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  logs?: Array<{ message: string; timestamp?: string }>;
  response?: Flux2EditResponse;
  error?: string;
}

/**
 * Edit images with FLUX 2 Pro (synchronous)
 * Best for quick edits - waits for result
 *
 * @example
 * // Add flames to a coffee cup
 * const result = await editWithFlux2Pro({
 *   prompt: "Place realistic flames emerging from the top of the coffee cup",
 *   image_urls: ["https://example.com/coffee.png"]
 * });
 *
 * @example
 * // Edit with base64 image
 * const result = await editWithFlux2Pro({
 *   prompt: "Add sunglasses to the person",
 *   image_urls: ["data:image/png;base64,iVBORw0KGgo..."]
 * });
 */
export const editWithFlux2Pro = async (params: Flux2EditParams): Promise<Flux2EditResponse> => {
  try {
    // Determine image_size: custom dimensions take priority over presets
    let imageSize: Flux2EditImageSize = params.image_size || 'auto';
    if (params.width && params.height) {
      imageSize = { width: params.width, height: params.height };
    }

    console.log('✏️ FLUX 2 Pro Edit:', {
      prompt: params.prompt.substring(0, 60) + '...',
      imageCount: params.image_urls.length,
      imageSize,
    });

    const response = await fetch(`${FAL_BASE_URL}/${MODELS.FLUX_2_PRO_EDIT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        image_urls: params.image_urls,
        image_size: imageSize,
        seed: params.seed,
        safety_tolerance: params.safety_tolerance ?? 5,
        enable_safety_checker: params.enable_safety_checker ?? false,
        output_format: params.output_format || 'jpeg',
        sync_mode: params.sync_mode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('FLUX 2 Pro Edit Error:', errorData);
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }

    const data: Flux2EditResponse = await response.json();
    console.log('✅ FLUX 2 Pro Edit complete:', data.images?.[0]?.url);
    return data;
  } catch (error: any) {
    console.error('FLUX 2 Pro Edit Error:', error);
    throw new Error(error.message || 'Failed to edit image with FLUX 2 Pro');
  }
};

/**
 * Submit FLUX 2 Pro edit to queue (for longer operations)
 * Returns request_id to poll for status
 */
export const submitFlux2EditToQueue = async (params: Flux2EditParams): Promise<Flux2EditQueueResponse> => {
  try {
    // Determine image_size: custom dimensions take priority over presets
    let imageSize: Flux2EditImageSize = params.image_size || 'auto';
    if (params.width && params.height) {
      imageSize = { width: params.width, height: params.height };
    }

    console.log('📤 Submitting FLUX 2 Pro Edit to queue...');

    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.FLUX_2_PRO_EDIT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        image_urls: params.image_urls,
        image_size: imageSize,
        seed: params.seed,
        safety_tolerance: params.safety_tolerance ?? 5,
        enable_safety_checker: params.enable_safety_checker ?? false,
        output_format: params.output_format || 'jpeg',
        sync_mode: params.sync_mode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data: Flux2EditQueueResponse = await response.json();
    console.log('✅ FLUX 2 Pro Edit queued:', data.request_id);
    return data;
  } catch (error: any) {
    console.error('FLUX 2 Pro Edit Queue Error:', error);
    throw new Error(error.message || 'Failed to queue FLUX 2 Pro edit');
  }
};

/**
 * Check status of queued FLUX 2 Pro edit
 */
export const getFlux2EditStatus = async (requestId: string): Promise<Flux2EditStatusResponse> => {
  try {
    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.FLUX_2_PRO_EDIT}/requests/${requestId}/status`, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('FLUX 2 Pro Edit Status Error:', error);
    throw new Error(error.message || 'Failed to check FLUX 2 Pro edit status');
  }
};

/**
 * Get result of completed FLUX 2 Pro edit
 */
export const getFlux2EditResult = async (requestId: string): Promise<Flux2EditResponse> => {
  try {
    const response = await fetch(`${FAL_QUEUE_URL}/${MODELS.FLUX_2_PRO_EDIT}/requests/${requestId}`, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('FLUX 2 Pro Edit Result Error:', error);
    throw new Error(error.message || 'Failed to get FLUX 2 Pro edit result');
  }
};

/**
 * Wait for FLUX 2 Pro edit to complete (polls status)
 */
export const waitForFlux2Edit = async (
  requestId: string,
  pollInterval: number = 2000,
  maxAttempts: number = 150,
  onProgress?: (status: string, logs?: string[]) => void
): Promise<Flux2EditResponse> => {
  console.log('⏳ Waiting for FLUX 2 Pro edit completion...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await getFlux2EditStatus(requestId);

    if (onProgress) {
      const logMessages = status.logs?.map(l => l.message);
      onProgress(status.status, logMessages);
    }

    if (status.status === 'COMPLETED') {
      console.log('🎉 FLUX 2 Pro edit completed!');
      return await getFlux2EditResult(requestId);
    }

    if (status.status === 'FAILED') {
      throw new Error(status.error || 'FLUX 2 Pro edit failed');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('FLUX 2 Pro edit timeout - exceeded 5 minutes');
};
