import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY") ?? "";
const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const REPLICATE_BASE_URL = "https://api.replicate.com/v1";
const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";

const MODEL_VERSIONS = {
  UPSCALE: "recraft-ai/recraft-crisp-upscale",
  BACKGROUND_REMOVER: "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
  MMAUDIO: "zsxkib/mmaudio:62871fb59889b2d7c13777f08deb3b36bdff88f7e1d53a50ad7694548a41b484",
  LLAVA: "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb",
  QWEN_VL: "lucataco/qwen2-vl-7b-instruct:bf57361c75677fc33d480d0c5f02926e621b2caa2000347cb74aeae9d2ca07ee",
} as const;

function dataUriToBlob(dataUri: string): Blob {
  const [header, b64] = dataUri.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

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

async function createPrediction(model: string, input: Record<string, unknown>) {
  if (!REPLICATE_API_KEY) {
    throw new Error("REPLICATE_API_KEY is not configured");
  }

  let modelPath = model;
  let version: string | undefined;
  if (model.includes(":")) {
    [modelPath, version] = model.split(":");
  }

  const createUrl = version
    ? `${REPLICATE_BASE_URL}/predictions`
    : `${REPLICATE_BASE_URL}/models/${modelPath}/predictions`;

  const body = version ? { version, input } : { input };

  const response = await withTimeout(createUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${REPLICATE_API_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "wait",
    },
    body: JSON.stringify(body),
  }, 60000);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`Replicate API error: ${error.detail || response.statusText}`);
  }

  const prediction = await response.json();
  if (prediction.status === "succeeded") {
    return prediction;
  }

  if (prediction.status === "failed") {
    throw new Error(`Prediction failed: ${prediction.error}`);
  }

  return await pollPrediction(prediction.id);
}

async function pollPrediction(predictionId: string, maxWait = 300000, interval = 1000) {
  const startTime = Date.now();
  while (true) {
    if (Date.now() - startTime > maxWait) {
      throw new Error(`Prediction timed out after ${maxWait}ms`);
    }

    const response = await withTimeout(`${REPLICATE_BASE_URL}/predictions/${predictionId}`, {
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_KEY}`,
      },
    }, 60000);

    if (!response.ok) {
      throw new Error(`Failed to get prediction status: ${response.statusText}`);
    }

    const prediction = await response.json();

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed") {
      throw new Error(`Prediction failed: ${prediction.error}`);
    }

    if (prediction.status === "canceled") {
      throw new Error("Prediction was canceled");
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

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
  const action = String(body.action || "").toLowerCase();
  const provider = String(body.provider || "replicate").toLowerCase();

  if (!action) {
    return new Response(
      JSON.stringify({ error: "Missing required field: action" }),
      { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  try {
    if (action === "upscale") {
      const image = body.image;
      if (!image) throw new Error("Missing required field: image");

      if (provider === "wavespeed") {
        if (!WAVESPEED_API_KEY) throw new Error("WAVESPEED_API_KEY is not configured");
        const response = await withTimeout(`${WAVESPEED_BASE_URL}/wavespeed-ai/ultimate-image-upscaler`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image,
            target_resolution: body.target_resolution || "4k",
            output_format: body.output_format || "jpeg",
            enable_sync_mode: true,
          }),
        }, 90000);

        const data = await response.json();
        if (!response.ok || data.code !== 200) {
          throw new Error(data.message || "Upscale failed");
        }

        return new Response(
          JSON.stringify({ success: true, output: data.data?.outputs?.[0] || null }),
          { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
        );
      }

      const prediction = await createPrediction(MODEL_VERSIONS.UPSCALE, { image });
      return new Response(
        JSON.stringify({ success: true, output: prediction.output }),
        { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    if (action === "remove-background") {
      const image = body.image;
      if (!image) throw new Error("Missing required field: image");

      if (provider === "wavespeed") {
        if (!WAVESPEED_API_KEY) throw new Error("WAVESPEED_API_KEY is not configured");
        const response = await withTimeout(`${WAVESPEED_BASE_URL}/wavespeed-ai/image-background-remover`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image, enable_sync_mode: true }),
        }, 90000);

        const data = await response.json();
        if (!response.ok || data.code !== 200) {
          throw new Error(data.message || "Background removal failed");
        }

        return new Response(
          JSON.stringify({ success: true, output: data.data?.outputs?.[0] || null }),
          { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
        );
      }

      const prediction = await createPrediction(MODEL_VERSIONS.BACKGROUND_REMOVER, {
        image,
        threshold: body.threshold ?? 0,
        reverse: body.reverse ?? false,
        background_type: body.background_type ?? "rgba",
        format: body.format ?? "png",
      });

      return new Response(
        JSON.stringify({ success: true, output: prediction.output }),
        { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    if (action === "video-audio") {
      const video = body.video;
      if (!video) throw new Error("Missing required field: video");

      const prediction = await createPrediction(MODEL_VERSIONS.MMAUDIO, {
        video,
        image: body.image,
        prompt: body.prompt ?? "",
        negative_prompt: body.negative_prompt ?? "music",
        duration: body.duration ?? 8,
        num_steps: body.num_steps ?? 25,
        cfg_strength: body.cfg_strength ?? 4.5,
        seed: body.seed ?? -1,
      });

      return new Response(
        JSON.stringify({ success: true, output: prediction.output }),
        { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    if (action === "describe-image") {
      const image = body.image;
      const prompt = body.prompt;
      if (!image || !prompt) throw new Error("Missing required fields: image, prompt");

      const prediction = await createPrediction(MODEL_VERSIONS.LLAVA, {
        image,
        prompt,
        temperature: body.temperature ?? 0.2,
        top_p: body.top_p ?? 1.0,
        max_tokens: body.max_tokens ?? 1024,
      });

      const output = Array.isArray(prediction.output) ? prediction.output.join("") : prediction.output;

      return new Response(
        JSON.stringify({ success: true, output }),
        { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    if (action === "describe-video") {
      const media = body.media;
      if (!media) throw new Error("Missing required field: media");

      const prediction = await createPrediction(MODEL_VERSIONS.QWEN_VL, {
        media,
        prompt: body.prompt ?? "Describe this in detail",
        max_new_tokens: body.max_new_tokens ?? 128,
      });

      return new Response(
        JSON.stringify({ success: true, output: prediction.output }),
        { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    if (action === "inpaint") {
      const image = body.image;
      const mask = body.mask;
      const inpaintPrompt = body.prompt;
      if (!image || !mask || !inpaintPrompt) {
        throw new Error("Missing required fields: image, mask, prompt");
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

      // Convert base64 data URIs to Blobs
      const imageBlob = dataUriToBlob(image);
      const maskBlob = dataUriToBlob(mask);

      // Build multipart/form-data for OpenAI Images Edit
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");
      formData.append("prompt", inpaintPrompt);
      formData.append("model", body.model || "gpt-image-1");
      if (body.size) formData.append("size", body.size);
      if (body.quality) formData.append("quality", body.quality);

      console.log(`[kiara-media] inpaint: model=${body.model || "gpt-image-1"}, prompt="${inpaintPrompt.substring(0, 80)}"`);

      const response = await withTimeout(
        "https://api.openai.com/v1/images/edits",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: formData,
        },
        120000
      );

      const data = await response.json();
      if (!response.ok) {
        console.error("[kiara-media] OpenAI inpaint error:", JSON.stringify(data));
        throw new Error(data.error?.message || `OpenAI inpaint failed (${response.status})`);
      }

      // gpt-image-1 returns b64_json, dall-e-2 may return url
      const outputB64 = data.data?.[0]?.b64_json;
      const outputUrl = data.data?.[0]?.url;
      const result = outputB64
        ? `data:image/png;base64,${outputB64}`
        : outputUrl || null;

      return new Response(
        JSON.stringify({ success: true, output: result }),
        { status: 200, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unsupported action: ${action}` }),
      { status: 400, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Request failed" }),
      { status: 500, headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
