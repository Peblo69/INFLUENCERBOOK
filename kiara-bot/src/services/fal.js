// Fal.ai API Service - Premium Models
// FLUX Pro Ultra, Imagen 4, Recraft V3, HiDream

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_BASE_URL = 'https://fal.run';

// Available premium models
export const MODELS = {
  FLUX_PRO_ULTRA: 'fal-ai/flux-pro/v1.1-ultra',
  FLUX_PRO: 'fal-ai/flux-pro/v1.1',
  IMAGEN4_ULTRA: 'fal-ai/imagen4/preview/ultra',
  IMAGEN4: 'fal-ai/imagen4/preview',
  RECRAFT_V3: 'fal-ai/recraft/v3/text-to-image',
  HIDREAM: 'fal-ai/hidream-i1-full',
};

// Model pricing (credits)
export const MODEL_COSTS = {
  'flux-ultra': 3,
  'flux-pro': 2,
  'imagen4-ultra': 3,
  'imagen4': 2,
  'recraft': 2,
  'hidream': 1,
};

/**
 * Generate with FLUX Pro Ultra - Best quality
 */
export async function generateFluxUltra(prompt, settings = {}) {
  console.log(`👑 [FLUX ULTRA] Generating: "${prompt.substring(0, 50)}..."`);

  const response = await fetch(`${FAL_BASE_URL}/${MODELS.FLUX_PRO_ULTRA}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${FAL_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      aspect_ratio: settings.aspect_ratio || '3:4',
      num_images: 1,
      output_format: 'jpeg',
      safety_tolerance: 6, // Max permissive
      enable_safety_checker: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ [FLUX ULTRA] Generated!`);

  return {
    success: true,
    url: data.images[0].url,
    seed: data.seed,
  };
}

/**
 * Generate with Imagen 4 - Google's SOTA
 */
export async function generateImagen4(prompt, settings = {}) {
  console.log(`🌟 [IMAGEN4] Generating: "${prompt.substring(0, 50)}..."`);

  const model = settings.ultra ? MODELS.IMAGEN4_ULTRA : MODELS.IMAGEN4;

  const response = await fetch(`${FAL_BASE_URL}/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${FAL_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      aspect_ratio: settings.aspect_ratio || '3:4',
      num_images: 1,
      output_format: 'jpeg',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ [IMAGEN4] Generated!`);

  return {
    success: true,
    url: data.images[0].url,
    seed: data.seed,
  };
}

/**
 * Generate with Recraft V3 - HuggingFace SOTA
 */
export async function generateRecraft(prompt, settings = {}) {
  console.log(`🖼️ [RECRAFT] Generating: "${prompt.substring(0, 50)}..."`);

  const response = await fetch(`${FAL_BASE_URL}/${MODELS.RECRAFT_V3}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${FAL_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      style: settings.style || 'realistic_image',
      image_size: settings.size || 'portrait_4_3',
      output_format: 'jpeg',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ [RECRAFT] Generated!`);

  return {
    success: true,
    url: data.images[0].url,
  };
}

/**
 * Generate with HiDream - Open source 17B
 */
export async function generateHiDream(prompt, settings = {}) {
  console.log(`💫 [HIDREAM] Generating: "${prompt.substring(0, 50)}..."`);

  const response = await fetch(`${FAL_BASE_URL}/${MODELS.HIDREAM}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${FAL_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      image_size: settings.size || 'portrait_4_3',
      num_images: 1,
      output_format: 'jpeg',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ [HIDREAM] Generated!`);

  return {
    success: true,
    url: data.images[0].url,
  };
}

/**
 * Generate with any model - unified function
 */
export async function generate(prompt, model = 'flux-ultra', settings = {}) {
  switch (model) {
    case 'flux-ultra':
      return generateFluxUltra(prompt, settings);
    case 'flux-pro':
      return generateFluxUltra(prompt, settings); // Same API, different endpoint
    case 'imagen4':
    case 'imagen4-ultra':
      return generateImagen4(prompt, { ...settings, ultra: model === 'imagen4-ultra' });
    case 'recraft':
      return generateRecraft(prompt, settings);
    case 'hidream':
      return generateHiDream(prompt, settings);
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

/**
 * Batch generate with Fal.ai (parallel)
 */
export async function generateBatch(prompt, count, model = 'flux-ultra', settings = {}) {
  console.log(`🎨 [FAL] Batch generating ${count} images with ${model}...`);

  const promises = Array(count).fill(null).map(() =>
    generate(prompt, model, settings)
      .then(result => ({ success: true, ...result }))
      .catch(error => ({ success: false, error: error.message }))
  );

  return Promise.all(promises);
}
