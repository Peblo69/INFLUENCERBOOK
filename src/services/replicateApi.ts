/**
 * ============================================================================
 * REPLICATE API SERVICE
 * ============================================================================
 *
 * Comprehensive service for Replicate AI models including:
 *
 * 1. RECRAFT CRISP UPSCALE - Image upscaling ($0.001/image)
 * 2. 851-LABS BACKGROUND REMOVER - Remove/replace backgrounds ($0.0005/image)
 * 3. MMAUDIO V2 - Add AI-generated sound to videos ($0.005/run)
 * 4. LLAVA-13B - Image description/analysis ($0.002/run)
 * 5. QWEN2-VL-7B - Video description/analysis ($0.008/run)
 *
 * All models use the Replicate prediction API with async polling.
 *
 * @author Kiara Studio
 * @version 1.0.0
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// NOTE: Client-side Replicate calls are disabled. Use Supabase Edge Functions (kiara-media) instead.
const REPLICATE_API_KEY = "";
const REPLICATE_BASE_URL = 'https://api.replicate.com/v1';

// Model version IDs (these may need updating if models are updated)
const MODEL_VERSIONS = {
  UPSCALE: 'recraft-ai/recraft-crisp-upscale',
  BACKGROUND_REMOVER: '851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc',
  MMAUDIO: 'zsxkib/mmaudio:62871fb59889b2d7c13777f08deb3b36bdff88f7e1d53a50ad7694548a41b484',
  LLAVA: 'yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb',
  QWEN_VL: 'lucataco/qwen2-vl-7b-instruct:bf57361c75677fc33d480d0c5f02926e621b2caa2000347cb74aeae9d2ca07ee',
} as const;

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Replicate prediction status
 */
export type ReplicatePredictionStatus =
  | 'starting'    // Prediction is starting up
  | 'processing'  // Model is running
  | 'succeeded'   // Completed successfully
  | 'failed'      // Failed with error
  | 'canceled';   // User canceled

/**
 * Base prediction response from Replicate API
 */
export interface ReplicatePrediction<T = unknown> {
  id: string;
  version: string;
  status: ReplicatePredictionStatus;
  input: Record<string, unknown>;
  output: T | null;
  error: string | null;
  logs: string | null;
  metrics?: {
    predict_time?: number;
  };
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  urls: {
    get: string;
    cancel: string;
  };
}

/**
 * Options for polling prediction status
 */
export interface PollOptions {
  /** Maximum time to wait in ms (default: 300000 = 5 min) */
  maxWait?: number;
  /** Interval between polls in ms (default: 1000) */
  interval?: number;
  /** Callback for status updates */
  onProgress?: (prediction: ReplicatePrediction) => void;
}

// ============================================================================
// 1. RECRAFT CRISP UPSCALE
// ============================================================================
// Cost: ~$0.001 per image | Hardware: CPU | Time: ~9 seconds
// Makes images sharper and cleaner, suitable for web or print
// ============================================================================

/**
 * Input parameters for Recraft Crisp Upscale
 */
export interface UpscaleInput {
  /**
   * The image to upscale
   * @required
   * @format URI (URL or base64 data URI)
   */
  image: string;
}

/**
 * Output from upscale model
 */
export type UpscaleOutput = string; // URL to upscaled image

/**
 * Upscale an image using Recraft Crisp Upscale
 *
 * @example
 * ```typescript
 * const result = await upscaleImage({
 *   image: 'https://example.com/photo.jpg'
 * });
 * console.log(result); // URL to upscaled image
 * ```
 *
 * @param input - Image URL to upscale
 * @param options - Polling options
 * @returns URL to the upscaled image
 */
export async function upscaleImage(
  input: UpscaleInput,
  options?: PollOptions
): Promise<UpscaleOutput> {
  const prediction = await createPrediction<UpscaleOutput>(
    MODEL_VERSIONS.UPSCALE,
    input,
    options
  );

  if (!prediction.output) {
    throw new Error('Upscale failed: No output received');
  }

  return prediction.output;
}

// ============================================================================
// 2. 851-LABS BACKGROUND REMOVER
// ============================================================================
// Cost: ~$0.0005 per image | Hardware: Nvidia T4 GPU | Time: ~3 seconds
// Remove or replace backgrounds with various options
// ============================================================================

/**
 * Background type options for background remover
 */
export type BackgroundType =
  | 'rgba'      // Transparent background (default)
  | 'map'       // Returns the alpha mask
  | 'green'     // Green screen background
  | 'white'     // White background
  | 'black'     // Black background
  | 'blur'      // Blurred version of original background
  | 'overlay'   // Overlay mode
  | string;     // RGB array like "[255, 0, 0]" or image URL

/**
 * Input parameters for Background Remover
 */
export interface BackgroundRemoverInput {
  /**
   * Input image URL
   * @required
   */
  image: string;

  /**
   * Threshold for hard segmentation
   * @default 0
   * @range 0.0 - 1.0
   * @description If 0.0, uses soft alpha (smooth edges). Higher values = harder edges
   */
  threshold?: number;

  /**
   * Reverse the mask (remove foreground instead of background)
   * @default false
   */
  reverse?: boolean;

  /**
   * Type of background to apply
   * @default "rgba"
   * @options
   * - "rgba": Transparent (PNG)
   * - "map": Returns alpha mask only
   * - "green": Green screen
   * - "white": White background
   * - "black": Black background
   * - "blur": Blurred original background
   * - "[R,G,B]": Custom RGB color
   * - "https://...": Image URL for custom background
   */
  background_type?: BackgroundType;

  /**
   * Output format
   * @default "png"
   */
  format?: 'png' | 'jpg';
}

/**
 * Output from background remover
 */
export type BackgroundRemoverOutput = string; // URL to processed image

/**
 * Remove or replace background from an image
 *
 * @example
 * ```typescript
 * // Transparent background
 * const transparent = await removeBackground({
 *   image: 'https://example.com/photo.jpg'
 * });
 *
 * // White background
 * const whiteBg = await removeBackground({
 *   image: 'https://example.com/photo.jpg',
 *   background_type: 'white'
 * });
 *
 * // Custom color background (red)
 * const redBg = await removeBackground({
 *   image: 'https://example.com/photo.jpg',
 *   background_type: '[255, 0, 0]'
 * });
 *
 * // Blurred background
 * const blurred = await removeBackground({
 *   image: 'https://example.com/photo.jpg',
 *   background_type: 'blur'
 * });
 * ```
 *
 * @param input - Background removal options
 * @param options - Polling options
 * @returns URL to the processed image
 */
export async function removeBackground(
  input: BackgroundRemoverInput,
  options?: PollOptions
): Promise<BackgroundRemoverOutput> {
  const prediction = await createPrediction<BackgroundRemoverOutput>(
    MODEL_VERSIONS.BACKGROUND_REMOVER,
    {
      image: input.image,
      threshold: input.threshold ?? 0,
      reverse: input.reverse ?? false,
      background_type: input.background_type ?? 'rgba',
      format: input.format ?? 'png',
    },
    options
  );

  if (!prediction.output) {
    throw new Error('Background removal failed: No output received');
  }

  return prediction.output;
}

// ============================================================================
// 3. MMAUDIO V2 - VIDEO TO AUDIO
// ============================================================================
// Cost: ~$0.005 per run | Hardware: Nvidia L40S GPU | Time: ~5-10 seconds
// Generate synchronized audio/sound effects for videos
// ============================================================================

/**
 * Input parameters for MMAudio
 */
export interface MMAudioInput {
  /**
   * Video file to generate audio for
   * @format URI
   */
  video?: string;

  /**
   * Image file (experimental - for image-to-audio)
   * @format URI
   */
  image?: string;

  /**
   * Text description of desired audio
   * @example "footsteps on gravel, birds chirping in background"
   * @example "car engine revving, tires screeching"
   * @example "ocean waves crashing, seagulls calling"
   * @default ""
   */
  prompt?: string;

  /**
   * Sounds to avoid in the generated audio
   * @default "music"
   * @example "music, voice, speech"
   */
  negative_prompt?: string;

  /**
   * Duration of output audio in seconds
   * @default 8
   * @min 1
   * @description Should match video duration for best sync
   */
  duration?: number;

  /**
   * Number of inference steps
   * @default 25
   * @range 10-50
   * @description Higher = better quality but slower
   */
  num_steps?: number;

  /**
   * Classifier-free guidance strength
   * @default 4.5
   * @range 1.0-10.0
   * @description Higher = more prompt adherence
   */
  cfg_strength?: number;

  /**
   * Random seed for reproducibility
   * @default -1 (random)
   */
  seed?: number;
}

/**
 * Output from MMAudio
 */
export type MMAudioOutput = string; // URL to generated audio file

/**
 * Generate synchronized audio for a video using AI
 *
 * @example
 * ```typescript
 * // Generate sound effects for a video
 * const audio = await generateVideoAudio({
 *   video: 'https://example.com/video.mp4',
 *   prompt: 'footsteps on wooden floor, door creaking open',
 *   negative_prompt: 'music, speech',
 *   duration: 10
 * });
 *
 * // Generate ambient audio
 * const ambient = await generateVideoAudio({
 *   video: 'https://example.com/nature-video.mp4',
 *   prompt: 'forest ambience, birds singing, gentle wind through trees',
 *   duration: 30
 * });
 * ```
 *
 * @param input - Audio generation options
 * @param options - Polling options
 * @returns URL to the generated audio file
 */
export async function generateVideoAudio(
  input: MMAudioInput,
  options?: PollOptions
): Promise<MMAudioOutput> {
  if (!input.video && !input.image) {
    throw new Error('Either video or image is required');
  }

  const prediction = await createPrediction<MMAudioOutput>(
    MODEL_VERSIONS.MMAUDIO,
    {
      video: input.video,
      image: input.image,
      prompt: input.prompt ?? '',
      negative_prompt: input.negative_prompt ?? 'music',
      duration: input.duration ?? 8,
      num_steps: input.num_steps ?? 25,
      cfg_strength: input.cfg_strength ?? 4.5,
      seed: input.seed ?? -1,
    },
    options
  );

  if (!prediction.output) {
    throw new Error('Audio generation failed: No output received');
  }

  return prediction.output;
}

// ============================================================================
// 4. LLAVA-13B - IMAGE DESCRIPTION
// ============================================================================
// Cost: ~$0.002 per run | Hardware: Nvidia L40S GPU | Time: ~2-5 seconds
// Visual instruction tuning with GPT-4 level capabilities
// Analyze images and answer questions about them
// ============================================================================

/**
 * Input parameters for LLaVA-13B
 */
export interface LLaVAInput {
  /**
   * Image to analyze
   * @required
   * @format URI
   */
  image: string;

  /**
   * Question or instruction about the image
   * @required
   * @example "Describe this image in detail"
   * @example "What objects are in this image?"
   * @example "What is the mood of this photo?"
   * @example "Is there any text in this image? If so, what does it say?"
   */
  prompt: string;

  /**
   * Sampling temperature
   * @default 0.2
   * @range 0.0-2.0
   * @description 0 = deterministic, higher = more random/creative
   */
  temperature?: number;

  /**
   * Top-p sampling (nucleus sampling)
   * @default 1.0
   * @range 0.0-1.0
   * @description Lower = more focused on likely tokens
   */
  top_p?: number;

  /**
   * Maximum tokens to generate
   * @default 1024
   * @max 4096
   */
  max_tokens?: number;
}

/**
 * Output from LLaVA - text description/answer
 */
export type LLaVAOutput = string;

/**
 * Analyze an image using LLaVA-13B vision model
 *
 * @example
 * ```typescript
 * // Get detailed description
 * const description = await describeImage({
 *   image: 'https://example.com/photo.jpg',
 *   prompt: 'Describe this image in detail, including colors, objects, and mood.'
 * });
 *
 * // Ask specific questions
 * const answer = await describeImage({
 *   image: 'https://example.com/photo.jpg',
 *   prompt: 'How many people are in this image and what are they doing?'
 * });
 *
 * // Extract text from image
 * const text = await describeImage({
 *   image: 'https://example.com/screenshot.png',
 *   prompt: 'Extract all visible text from this image.'
 * });
 * ```
 *
 * @param input - Image analysis options
 * @param options - Polling options
 * @returns Text description or answer
 */
export async function describeImage(
  input: LLaVAInput,
  options?: PollOptions
): Promise<LLaVAOutput> {
  const prediction = await createPrediction<string[]>(
    MODEL_VERSIONS.LLAVA,
    {
      image: input.image,
      prompt: input.prompt,
      temperature: input.temperature ?? 0.2,
      top_p: input.top_p ?? 1.0,
      max_tokens: input.max_tokens ?? 1024,
    },
    options
  );

  if (!prediction.output) {
    throw new Error('Image description failed: No output received');
  }

  // LLaVA returns an array of strings, join them
  return Array.isArray(prediction.output)
    ? prediction.output.join('')
    : prediction.output;
}

// ============================================================================
// 5. QWEN2-VL-7B - VIDEO DESCRIPTION
// ============================================================================
// Cost: ~$0.008 per run | Hardware: Nvidia L40S GPU | Time: ~9 seconds
// Analyze videos (up to 20+ minutes) and images with multilingual support
// ============================================================================

/**
 * Input parameters for Qwen2-VL
 */
export interface QwenVLInput {
  /**
   * Video or image file to analyze
   * @required
   * @format URI
   * @description Supports videos up to 20+ minutes and various image formats
   */
  media: string;

  /**
   * Question or instruction about the media
   * @default "Describe this in detail"
   * @example "What is happening in this video?"
   * @example "Summarize the key events in this video"
   * @example "What text is visible in this document?"
   * @example "Describe the chart and its data"
   */
  prompt?: string;

  /**
   * Maximum new tokens to generate
   * @default 128
   * @range 1-512
   */
  max_new_tokens?: number;
}

/**
 * Output from Qwen2-VL - text description/answer
 */
export type QwenVLOutput = string;

/**
 * Analyze a video or image using Qwen2-VL
 *
 * @example
 * ```typescript
 * // Describe a video
 * const videoDescription = await describeVideo({
 *   media: 'https://example.com/video.mp4',
 *   prompt: 'What is happening in this video? Describe the key events.',
 *   max_new_tokens: 256
 * });
 *
 * // Summarize a long video
 * const summary = await describeVideo({
 *   media: 'https://example.com/long-video.mp4',
 *   prompt: 'Provide a brief summary of this video in 3 bullet points.'
 * });
 *
 * // Analyze a document/chart
 * const analysis = await describeVideo({
 *   media: 'https://example.com/chart.png',
 *   prompt: 'Analyze this chart and explain the trends shown.'
 * });
 * ```
 *
 * @param input - Video/image analysis options
 * @param options - Polling options
 * @returns Text description or answer
 */
export async function describeVideo(
  input: QwenVLInput,
  options?: PollOptions
): Promise<QwenVLOutput> {
  const prediction = await createPrediction<QwenVLOutput>(
    MODEL_VERSIONS.QWEN_VL,
    {
      media: input.media,
      prompt: input.prompt ?? 'Describe this in detail',
      max_new_tokens: input.max_new_tokens ?? 128,
    },
    options
  );

  if (!prediction.output) {
    throw new Error('Video description failed: No output received');
  }

  return prediction.output;
}

// ============================================================================
// CORE API FUNCTIONS
// ============================================================================

/**
 * Create a prediction and wait for it to complete
 *
 * @internal
 * @param model - Model version string
 * @param input - Input parameters
 * @param options - Polling options
 * @returns Completed prediction
 */
async function createPrediction<T>(
  model: string,
  input: Record<string, unknown>,
  options?: PollOptions
): Promise<ReplicatePrediction<T>> {
  if (!REPLICATE_API_KEY) {
    throw new Error('Client-side Replicate calls are disabled. Use the Supabase edge function kiara-media.');
  }

  // Parse model string to get owner/name and version
  let modelPath: string;
  let version: string | undefined;

  if (model.includes(':')) {
    [modelPath, version] = model.split(':');
  } else {
    modelPath = model;
  }

  // Create prediction
  const createUrl = version
    ? `${REPLICATE_BASE_URL}/predictions`
    : `${REPLICATE_BASE_URL}/models/${modelPath}/predictions`;

  const body = version
    ? { version, input }
    : { input };

  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait', // Try to get result immediately if fast
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`Replicate API error: ${error.detail || response.statusText}`);
  }

  let prediction = await response.json() as ReplicatePrediction<T>;

  // If already completed (fast models), return immediately
  if (prediction.status === 'succeeded') {
    return prediction;
  }

  if (prediction.status === 'failed') {
    throw new Error(`Prediction failed: ${prediction.error}`);
  }

  // Poll for completion
  prediction = await pollPrediction<T>(prediction.id, options);

  return prediction;
}

/**
 * Poll a prediction until it completes
 *
 * @internal
 * @param predictionId - Prediction ID to poll
 * @param options - Polling options
 * @returns Completed prediction
 */
async function pollPrediction<T>(
  predictionId: string,
  options?: PollOptions
): Promise<ReplicatePrediction<T>> {
  const maxWait = options?.maxWait ?? 300000; // 5 minutes default
  const interval = options?.interval ?? 1000; // 1 second default
  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > maxWait) {
      throw new Error(`Prediction timed out after ${maxWait}ms`);
    }

    const response = await fetch(`${REPLICATE_BASE_URL}/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get prediction status: ${response.statusText}`);
    }

    const prediction = await response.json() as ReplicatePrediction<T>;

    // Call progress callback
    options?.onProgress?.(prediction);

    if (prediction.status === 'succeeded') {
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw new Error(`Prediction failed: ${prediction.error}`);
    }

    if (prediction.status === 'canceled') {
      throw new Error('Prediction was canceled');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Cancel a running prediction
 *
 * @param predictionId - ID of prediction to cancel
 * @returns Canceled prediction
 */
export async function cancelPrediction(predictionId: string): Promise<ReplicatePrediction> {
  if (!REPLICATE_API_KEY) {
    throw new Error('Client-side Replicate calls are disabled. Use the Supabase edge function kiara-media.');
  }

  const response = await fetch(`${REPLICATE_BASE_URL}/predictions/${predictionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel prediction: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the status of a prediction
 *
 * @param predictionId - ID of prediction to check
 * @returns Current prediction status
 */
export async function getPredictionStatus(predictionId: string): Promise<ReplicatePrediction> {
  if (!REPLICATE_API_KEY) {
    throw new Error('Client-side Replicate calls are disabled. Use the Supabase edge function kiara-media.');
  }

  const response = await fetch(`${REPLICATE_BASE_URL}/predictions/${predictionId}`, {
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get prediction: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert a File or Blob to a base64 data URI
 *
 * @param file - File or Blob to convert
 * @returns Base64 data URI string
 */
export function fileToDataUri(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a file to a temporary URL for use with Replicate
 * Uses Supabase storage as temporary hosting
 *
 * @param file - File to upload
 * @param bucket - Supabase bucket name
 * @returns Public URL of uploaded file
 */
export async function uploadForReplicate(
  file: File,
  bucket: string = 'temp-uploads'
): Promise<string> {
  // Dynamic import to avoid circular dependencies
  const { supabase } = await import('@/lib/supabase');

  const filename = `replicate/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filename);

  return publicUrl;
}

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================
//
// Main Functions:
// - upscaleImage(input)           - Upscale image quality
// - removeBackground(input)       - Remove/replace background
// - generateVideoAudio(input)     - Add sound to video
// - describeImage(input)          - Describe/analyze image
// - describeVideo(input)          - Describe/analyze video
//
// Utility Functions:
// - cancelPrediction(id)          - Cancel a running prediction
// - getPredictionStatus(id)       - Check prediction status
// - fileToDataUri(file)           - Convert file to base64
// - uploadForReplicate(file)      - Upload file for use with API
//
// ============================================================================
