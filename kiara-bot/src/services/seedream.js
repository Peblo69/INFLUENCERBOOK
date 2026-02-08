// Image Generation Service - Using Fal.ai
// FLUX Pro, HiDream, Recraft - all support text-to-image

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_BASE_URL = 'https://fal.run';

// Models (NSFW-friendly ones)
const MODELS = {
  // HiDream - Fast, good quality, no safety filter
  HIDREAM: 'fal-ai/hidream-i1-full',
  // FLUX Pro - Best quality
  FLUX_PRO: 'fal-ai/flux-pro/v1.1',
  // FLUX Pro Ultra - Ultimate quality
  FLUX_ULTRA: 'fal-ai/flux-pro/v1.1-ultra',
};

// Use HiDream as default (fast + no safety)
const DEFAULT_MODEL = MODELS.HIDREAM;

/**
 * Generate a single image
 */
export async function generateImage(prompt, settings = {}) {
  const size = settings.size || '1024x1024';
  const [width, height] = size.split('x').map(Number);

  console.log(`🎨 [FAL] Generating: "${prompt.substring(0, 50)}..."`);
  console.log(`📐 Size: ${width}x${height}`);

  try {
    const response = await fetch(`${FAL_BASE_URL}/${DEFAULT_MODEL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: { width, height },
        num_images: 1,
        output_format: 'jpeg',
        // No safety checker
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [FAL] Error:', errorData);
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [FAL] Generated!`);

    // HiDream returns images array
    const imageUrl = data.images?.[0]?.url || data.image?.url;

    if (!imageUrl) {
      console.error('Response:', data);
      throw new Error('No image URL in response');
    }

    return {
      success: true,
      url: imageUrl,
      seed: data.seed,
    };

  } catch (error) {
    console.error('❌ [FAL] Generation error:', error);
    throw error;
  }
}

/**
 * Generate multiple images in PARALLEL
 */
export async function generateBatch(prompt, count, settings = {}) {
  console.log(`🎨 [FAL] Batch generating ${count} images...`);

  // Create array of promises - all run in parallel
  const promises = Array(count).fill(null).map((_, index) => {
    return generateImage(prompt, settings)
      .then(result => ({
        success: true,
        url: result.url,
        index,
      }))
      .catch(error => ({
        success: false,
        error: error.message,
        index,
      }));
  });

  // Wait for ALL to complete (parallel execution)
  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success).length;
  console.log(`✅ [FAL] Batch complete: ${successful}/${count} successful`);

  return results;
}

export default { generateImage, generateBatch };
