/**
 * kiaraModelKnowledge.ts — The Brain
 *
 * Everything Grok needs to know about every model, prompt engineering,
 * influencer realism, and model selection. Injected into the system
 * prompt at runtime by grokService.ts.
 */

// ─── Model Profiles ──────────────────────────────────────────────────────────

interface ModelProfile {
  name: string;
  id: string;
  provider: string;
  type: string;
  strengths: string;
  weaknesses: string;
  promptStyle: string;
  bestFor: string;
  ratios: string[];
  quality: string[] | null;
  maxImages: number;
  supportsRefImages: boolean;
  maxRefImages: number;
  supportsLoRA: boolean;
  promptTips: string[];
  examplePrompt: string;
}

interface VideoModelProfile {
  name: string;
  id: string;
  provider: string;
  type: string;
  strengths: string;
  inputRequirements: string;
  duration: string;
  ratios: string[];
  resolutions: string[];
  promptTips: string[];
  examplePrompt: string;
}

// ─── Image Models ────────────────────────────────────────────────────────────

export const IMAGE_MODELS: ModelProfile[] = [
  {
    name: "Kiara Z MAX",
    id: "kiara-z-max",
    provider: "RunningHub (ComfyUI workflow)",
    type: "text-to-image",
    strengths: "Best for stylized/artistic images, LoRA support, flexible ComfyUI workflows, consistent style with custom LoRAs",
    weaknesses: "Slower than direct API models (30-60s), less photorealistic without a realism LoRA, no reference image support",
    promptStyle: "Tag-based, comma-separated descriptors. Works best with specific technical tags rather than narrative prose.",
    bestFor: "Custom artistic styles, LoRA-enhanced generation, editorial/fashion looks, consistent branding with trained LoRAs",
    ratios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    quality: ["1K", "2K"],
    maxImages: 4,
    supportsRefImages: false,
    maxRefImages: 0,
    supportsLoRA: true,
    promptTips: [
      "Use comma-separated descriptive tags, not flowing prose",
      "Be specific about lighting: 'golden hour backlight, soft fill light, warm tones'",
      "Include camera specs: '85mm lens, f/1.8, shallow depth of field, bokeh'",
      "Specify skin quality: 'natural skin texture, subtle pores, no airbrushing'",
      "Add realism tags: 'photorealistic, hyperdetailed, 8k uhd, dslr quality'",
      "End with style keywords: 'cinematic color grading, film grain, natural tones'",
    ],
    examplePrompt: "young woman, casual selfie pose, natural makeup, golden hour sunlight, rooftop bar setting, city skyline background, warm amber tones, 85mm lens, f/1.8, shallow depth of field, natural skin texture, phone camera aesthetic, candid expression, soft genuine smile, wind-blown hair, white cotton top, delicate gold necklace, photorealistic, hyperdetailed",
  },
  {
    name: "Grok Image",
    id: "kiara-grok-image",
    provider: "xAI direct API",
    type: "text-to-image + image-editing (auto-detects)",
    strengths: "Fastest generation (2-5s), excellent prompt following, best face identity preservation when editing, handles both text-to-image and image editing through same interface",
    weaknesses: "Cannot control seed, limited aspect ratio control via API, no quality presets",
    promptStyle: "Natural language descriptions work best. Moderate detail level — don't over-specify. Handles creative/abstract prompts well.",
    bestFor: "Quick iterations, face-consistent edits from reference photos, rapid prototyping, bulk variations when speed matters",
    ratios: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "2:1", "1:2", "20:9", "9:20", "19.5:9", "9:19.5"],
    quality: null,
    maxImages: 4,
    supportsRefImages: true,
    maxRefImages: 1,
    supportsLoRA: false,
    promptTips: [
      "Use natural language, not tags — 'A woman sitting at a cafe' works better than comma lists",
      "For edits: describe WHAT TO CHANGE, reference image handles the rest",
      "Keep prompts moderately detailed — 2-4 sentences is ideal",
      "Good at understanding context and intent from brief descriptions",
      "When editing: focus on the change you want, model preserves face/identity automatically",
    ],
    examplePrompt: "A young woman takes a casual selfie at a sunlit outdoor cafe. She's wearing a white linen blouse and has natural makeup with subtle lip gloss. The background shows blurred cafe tables and warm string lights. Late afternoon golden light catches her hair. iPhone front camera perspective, natural and relaxed expression.",
  },
  {
    name: "Grok Imagine",
    id: "kiara-grok-imagine",
    provider: "fal.ai (xAI Grok Imagine Image)",
    type: "text-to-image (no refs = t2i, with ref = edit mode auto-switch)",
    strengths: "BEST photorealism from text prompts, stunning detail and lighting, excellent skin rendering, most natural-looking results for influencer content",
    weaknesses: "No seed control, slightly slower than Grok Image (5-10s), no LoRA support",
    promptStyle: "Rich narrative descriptions in full sentences. This model LOVES detail — the more specific you are about lighting, materials, and atmosphere, the better the output.",
    bestFor: "Photorealistic influencer photos, high-quality social media content, natural-looking portraits, lifestyle shots",
    ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "2:1", "1:2", "20:9", "9:20", "19.5:9", "9:19.5"],
    quality: null,
    maxImages: 4,
    supportsRefImages: true,
    maxRefImages: 1,
    supportsLoRA: false,
    promptTips: [
      "Write FULL narrative sentences — this model thrives on rich descriptions",
      "Describe the SCENE, not just the subject — environment sells realism",
      "Specify exact lighting: 'soft window light from the left, warm color temperature around 4000K'",
      "Include phone camera cues: 'iPhone 15 Pro, front-facing camera, slight lens distortion'",
      "Describe natural imperfections: 'a few flyaway hairs, natural skin texture with subtle pores'",
      "Set the mood: 'casual, just-woke-up energy' or 'confident, post-workout glow'",
      "Avoid generic adjectives like 'beautiful' or 'gorgeous' — describe actual features instead",
    ],
    examplePrompt: "A 24-year-old woman takes a mirror selfie in her apartment bathroom. She holds her iPhone at chest height, capturing herself in a slightly steamy mirror after a shower. She wears an oversized cream-colored knit sweater that falls casually off one shoulder, revealing a thin gold chain necklace. Her dark wavy hair is in a messy bun with loose strands framing her face. Soft morning light streams through a frosted window to her left, creating gentle shadows on the white subway tile wall. A few skincare products are visible on the marble counter. The shot has natural phone camera depth of field, slight mirror water spots, and warm color temperature. Her expression is relaxed and sleepy, one eyebrow slightly raised — authentic, not posed.",
  },
  {
    name: "Seedream 4",
    id: "kiara-seedream-v4",
    provider: "fal.ai (ByteDance Seedream v4)",
    type: "text-to-image (no refs = t2i, with refs = edit mode auto-switch)",
    strengths: "Fast generation, good quality at 2K, reliable for bulk production, consistent results",
    weaknesses: "Less photorealistic than Grok Imagine, edit mode quality lower than v4.5",
    promptStyle: "Descriptive natural language. Moderate detail level works well. Handles style keywords effectively.",
    bestFor: "Fast bulk generation, consistent quality, good balance of speed and quality",
    ratios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    quality: ["2K", "4K"],
    maxImages: 6,
    supportsRefImages: true,
    maxRefImages: 10,
    supportsLoRA: false,
    promptTips: [
      "Natural language descriptions, 2-4 sentences optimal",
      "For edits: can handle up to 10 reference images — useful for style consistency",
      "Specify quality: '2K' for speed, '4K' for maximum detail",
      "Works well with specific style keywords at the end of prompt",
    ],
    examplePrompt: "A young woman in a cozy coffee shop, wearing a fitted black turtleneck and small hoop earrings. She sits by a rain-streaked window, holding a latte with latte art. Soft overhead cafe lighting mixes with grey daylight from outside. Her hair is straight and dark, tucked behind one ear. She gazes slightly off-camera with a thoughtful half-smile. Natural skin texture, realistic lighting, candid phone photo aesthetic.",
  },
  {
    name: "Seedream 4.5",
    id: "kiara-seedream",
    provider: "fal.ai (ByteDance Seedream v4.5)",
    type: "text-to-image (no refs = t2i, with refs = edit mode auto-switch)",
    strengths: "HIGHEST resolution output (true 4K), excellent detail rendering, best for print-quality content, superior edit mode with up to 10 reference images",
    weaknesses: "Slightly slower than v4, more expensive per image, can over-smooth skin at lower quality settings",
    promptStyle: "Detailed natural language. Benefits from specific material and texture descriptions. 4K quality reveals every detail in the prompt.",
    bestFor: "Maximum quality single images, print/portfolio content, detailed edits with multiple references, when quality matters more than speed",
    ratios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    quality: ["2K", "4K"],
    maxImages: 6,
    supportsRefImages: true,
    maxRefImages: 10,
    supportsLoRA: false,
    promptTips: [
      "At 4K, every detail in your prompt will be rendered — be extremely specific",
      "Describe material textures: 'soft cashmere with visible knit pattern' not just 'sweater'",
      "For edits with multiple refs: describe which elements to take from each reference",
      "Include micro-details at 4K: individual eyelashes, fabric weave, skin pores",
      "Avoid vague descriptors — '4K' means every word gets rendered literally",
    ],
    examplePrompt: "A 26-year-old woman leans against a balcony railing at golden hour, overlooking a Mediterranean coastal town with white buildings cascading down to turquoise water. She wears a flowing sage-green linen dress with thin spaghetti straps, the fabric catching a gentle breeze. Her light brown hair has natural beach-wave texture with sun-bleached highlights. Warm golden sunlight creates a soft rim light around her silhouette. Her skin shows natural freckles across the bridge of her nose and a subtle tan line on her shoulders. She holds a glass of white wine casually in one hand, looking over her shoulder at the camera with a genuine, carefree smile. Shallow depth of field blurs the coastal background. Shot on phone propped on the railing with a 3-second timer. 4K ultradetailed, natural color grading.",
  },
  {
    name: "Kiara Vision",
    id: "kiara-vision",
    provider: "RunwayML (Gen4 Turbo)",
    type: "text-to-image + image-to-image",
    strengths: "Good creative interpretation, handles artistic concepts well, supports up to 3 reference images, fast turbo mode",
    weaknesses: "Less photorealistic than Grok Imagine, limited to 1 image per generation, requires reference images for turbo model",
    promptStyle: "Concise creative briefs work best. Focus on concept and mood rather than technical details.",
    bestFor: "Creative/conceptual images, artistic interpretations, when you need a different aesthetic from other models",
    ratios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    quality: null,
    maxImages: 1,
    supportsRefImages: true,
    maxRefImages: 3,
    supportsLoRA: false,
    promptTips: [
      "Shorter, more conceptual prompts work better than hyper-detailed ones",
      "Good at understanding style references and mood descriptions",
      "Turbo model REQUIRES at least 1 reference image",
      "Focus on the creative direction, not pixel-level details",
    ],
    examplePrompt: "Candid portrait of a young woman at a rooftop party at dusk, city lights beginning to glow behind her. Casual elegance, warm amber tones, natural expression mid-laugh. Phone photo quality with slight motion blur.",
  },
  {
    name: "Kiara Vision MAX",
    id: "kiara-vision-max",
    provider: "RunwayML (Gen4)",
    type: "text-to-image (works without reference images)",
    strengths: "Can generate from text only (no refs needed), good for conceptual/editorial imagery, high quality output",
    weaknesses: "Slower than turbo, limited to 1 image, less photorealistic for influencer content",
    promptStyle: "Balanced — works with both detailed and conceptual prompts. Good at editorial/fashion aesthetics.",
    bestFor: "Text-only generation when no reference images available, editorial/fashion concepts, artistic direction",
    ratios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    quality: null,
    maxImages: 1,
    supportsRefImages: true,
    maxRefImages: 3,
    supportsLoRA: false,
    promptTips: [
      "Works without reference images — good fallback for text-to-image",
      "Strong at editorial and fashion aesthetics",
      "Describe the overall mood and composition rather than every micro-detail",
    ],
    examplePrompt: "Editorial fashion portrait: young woman in oversized vintage denim jacket, standing in an empty parking lot at twilight. Neon sign reflects off wet pavement. Moody, cinematic color grading with teal and orange tones. She looks directly at camera with quiet confidence.",
  },
];

// ─── Video Models ────────────────────────────────────────────────────────────

export const VIDEO_MODELS: VideoModelProfile[] = [
  {
    name: "Grok Video (Image to Video)",
    id: "kiara-grok-video",
    provider: "fal.ai (xAI Grok Imagine Video)",
    type: "image-to-video",
    strengths: "Best quality image-to-video conversion, natural motion, good at maintaining subject consistency",
    inputRequirements: "Requires an input image + text prompt describing desired motion",
    duration: "1-15 seconds",
    ratios: ["auto", "16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16"],
    resolutions: ["480p", "720p"],
    promptTips: [
      "Describe the MOTION you want, not the static scene (the image already shows that)",
      "Keep motion descriptions simple: 'she turns her head and smiles' or 'wind blows through her hair'",
      "Subtle motions look more realistic than dramatic ones",
      "6-8 seconds is the sweet spot for social media clips",
    ],
    examplePrompt: "She slowly turns her head toward the camera and gives a natural, warm smile. A gentle breeze moves her hair. The background stays slightly out of focus with natural ambient movement.",
  },
  {
    name: "Grok Text-to-Video",
    id: "kiara-grok-text-to-video",
    provider: "fal.ai (xAI Grok Imagine Video)",
    type: "text-to-video (no image needed)",
    strengths: "Generate video from text description only — no input image required, includes audio",
    inputRequirements: "Text prompt only, no image needed",
    duration: "1-15 seconds",
    ratios: ["16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16"],
    resolutions: ["480p", "720p"],
    promptTips: [
      "Describe the full scene including subject, environment, and motion",
      "Be specific about camera movement: 'slow dolly in' or 'handheld tracking shot'",
      "Include audio cues if desired: 'ambient cafe noise, soft music'",
    ],
    examplePrompt: "A young woman walks through a sunlit farmer's market, picking up a peach and smelling it. She wears a straw hat and a white sundress. Handheld camera follows her casually. Natural ambient sound of the market crowd. Golden morning light, warm color grading.",
  },
  {
    name: "Grok Edit Video",
    id: "kiara-grok-edit-video",
    provider: "fal.ai (xAI Grok Imagine Video)",
    type: "video-to-video editing",
    strengths: "Edit existing videos with text prompts — change style, environment, or details",
    inputRequirements: "Requires existing video + edit prompt. Input resized to 854x480, max 8 seconds",
    duration: "Same as input (max 8 seconds)",
    ratios: [],
    resolutions: ["auto", "480p", "720p"],
    promptTips: [
      "Describe what you want to CHANGE about the video",
      "Style changes work well: 'make it look like a vintage film' or 'add dramatic lighting'",
      "Keep input videos short (under 8 seconds) for best results",
    ],
    examplePrompt: "Transform the video to look like it was shot on 35mm film with warm vintage color grading, slight film grain, and soft vignetting. Keep the subject's movements identical.",
  },
  {
    name: "Kiara Vision Video",
    id: "kiara-vision",
    provider: "RunwayML (Gen4 Turbo)",
    type: "image-to-video",
    strengths: "High quality motion, good character consistency, supports keyframe-based animation",
    inputRequirements: "Input image + motion prompt",
    duration: "5-10 seconds",
    ratios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    promptTips: [
      "Good at character performance and facial expressions",
      "Supports keyframe-based animation for precise control",
      "Describe emotional beats: 'she goes from thoughtful to laughing'",
    ],
    examplePrompt: "The woman slowly tilts her head, her expression shifting from contemplative to a bright, genuine laugh. Camera stays locked. Her hair moves naturally with the head tilt.",
  },
  {
    name: "Animate X",
    id: "kiara-animate-x",
    provider: "RunningHub (ComfyUI AnimateX workflow)",
    type: "image-to-video",
    strengths: "Customizable ComfyUI workflow, good at specific animation styles, supports video reference for motion transfer",
    inputRequirements: "Input image required, optional video reference for motion style",
    duration: "1-30 seconds (configurable)",
    ratios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    resolutions: ["720p"],
    promptTips: [
      "Can use a reference video to transfer motion style",
      "Good for longer animations (up to 30s)",
      "FPS is configurable (1-30)",
      "More artistic/stylized motion than Grok Video",
    ],
    examplePrompt: "Gentle breathing motion, hair swaying in a light breeze, subtle eye movement looking from left to right, natural idle animation. Smooth 24fps cinematic motion.",
  },
];

// ─── Influencer Realism Bible ────────────────────────────────────────────────

const REALISM_GUIDE = `
## INFLUENCER REALISM — PHONE CAMERA AESTHETIC

You are creating images that must look INDISTINGUISHABLE from real Instagram/TikTok photos taken on an iPhone. This is the #1 priority for influencer content.

### THE GOLDEN RULES:
1. **Phone camera look**: Slight wide-angle distortion (especially selfies), natural vignetting at edges, subtle sensor noise in shadows, shallow-but-not-cinema depth of field from a small sensor, slight JPEG compression artifacts
2. **Imperfect = Real**: Micro motion blur on extremities, one eye slightly sharper, asymmetric lighting on face, a strand of hair out of place, a wrinkle in the shirt
3. **Natural light ALWAYS**: Window light, golden hour, overcast diffused sky, ring light for selfies, neon signs for night shots. NEVER generic "studio lighting" unless explicitly requested
4. **Skin is SKIN**: Visible pores on nose/cheeks, subtle texture variation, realistic undertones (not uniform color), natural blemishes/freckles, NO porcelain/airbrushed smoothness
5. **Casual body language**: Weight on one hip, slightly turned torso, hand doing something natural (touching hair, holding phone, resting on chin, adjusting earring), NOT symmetrical model poses
6. **Real locations**: Bedroom mirror, bathroom counter, cafe booth, car passenger seat, beach towel, gym mirror, restaurant table, hotel balcony — NOT floating in void or generic "background"
7. **Clothing physics**: Fabric wrinkles at joints, gravity on loose fabric, realistic transparency with backlighting, visible seams and texture, straps that follow shoulder contour

### CRITICAL MISTAKES TO AVOID:
- Extra/fused fingers, wrong thumb direction, impossible hand poses
- Perfectly symmetrical face (humans are always asymmetric)
- Hair that looks like a solid mass (should have individual strands, flyaways)
- Floating jewelry or accessories defying gravity
- Text, logos, or writing (AI renders text poorly — avoid it)
- Over-saturated colors (real phone cameras have muted, natural color science)
- Perfect teeth (slight irregularity is realistic)
- Background that's too clean/perfect (real rooms have stuff in them)

### PROMPT STRUCTURE FOR MAXIMUM REALISM:
1. **SUBJECT**: Age and descriptors: "23 year old woman" — NEVER "beautiful gorgeous stunning model"
2. **CAMERA**: "iPhone selfie, front camera, arm's length" / "phone propped on nightstand, timer shot" / "friend taking the photo with their phone"
3. **POSE**: Natural action: "mid-laugh, looking slightly past camera" / "adjusting her sunglasses with one hand"
4. **SETTING**: Real place with details: "small apartment kitchen, morning dishes on counter, plants on windowsill"
5. **LIGHTING**: Source + quality: "late afternoon sun through blinds, creating stripe shadows" / "bathroom vanity lights, warm 3000K"
6. **OUTFIT**: Materials + fit: "oversized vintage band tee, slightly faded black, tucked loosely into high-waisted jeans"
7. **MOOD**: Energy, not adjectives: "lazy Sunday morning energy" / "just got good news excitement" / "post-workout flush"
8. **TECHNICAL**: "natural phone camera grain, slight lens flare from window, shallow phone DoF"
`;

// ─── Model Selection Decision Tree ───────────────────────────────────────────

const MODEL_SELECTION_GUIDE = `
## MODEL SELECTION — DECISION TREE

### When user uploads reference images:
- **Keep face identical + change scene** → kiara-grok-image (xAI) — BEST face identity preservation
- **Style transfer or artistic edit** → kiara-seedream-edit or kiara-seedream-v4-edit — good style control + up to 10 refs
- **Single ref + significant changes** → kiara-grok-imagine (auto-switches to edit mode with ref) — good structural edits
- **Multiple refs for consistency** → Seedream edit models — supports up to 10 reference images

### When NO reference images (text-to-image):
- **Photorealistic influencer content** → kiara-grok-imagine — BEST photorealism, most natural-looking results
- **Quick iterations / many options** → kiara-grok-image (xAI) — fastest (2-5s per image)
- **Artistic/editorial/custom style** → kiara-z-max — LoRA support for trained styles
- **Maximum quality / 4K detail** → kiara-seedream (Seedream 4.5) — true 4K output, incredible detail
- **Speed doesn't matter, want best** → kiara-seedream at 4K quality

### When user wants video:
- **Have an image, want it animated** → kiara-grok-video — best i2v quality
- **No image, want video from text** → kiara-grok-text-to-video — generates video + audio
- **Edit an existing video** → kiara-grok-edit-video — style/content changes on video
- **Character performance/expressions** → kiara-vision (RunwayML) — best for acting/emotions
- **Long animation (>15s)** → kiara-animate-x — supports up to 30 seconds

### DEFAULT CHOICES (when user doesn't specify):
- Influencer photo, no refs → **kiara-grok-imagine** (best realism)
- Influencer photo, with refs → **kiara-grok-image** (best face preservation)
- Quick test/preview → **kiara-grok-image** (fastest)
- Portfolio/print quality → **kiara-seedream** at 4K
- Short video clip → **kiara-grok-video** at 6-8 seconds
`;

// ─── Build the prompt injection ──────────────────────────────────────────────

function formatModelProfile(m: ModelProfile): string {
  return `### ${m.name} (\`${m.id}\`)
- **Provider**: ${m.provider}
- **Type**: ${m.type}
- **Strengths**: ${m.strengths}
- **Weaknesses**: ${m.weaknesses}
- **Best for**: ${m.bestFor}
- **Prompt style**: ${m.promptStyle}
- **Ratios**: ${m.ratios.join(", ")}
- **Quality**: ${m.quality ? m.quality.join(", ") : "N/A"}
- **Max images**: ${m.maxImages} | **Ref images**: ${m.supportsRefImages ? `yes (max ${m.maxRefImages})` : "no"} | **LoRA**: ${m.supportsLoRA ? "yes" : "no"}
- **Prompt tips**:
${m.promptTips.map((t) => `  - ${t}`).join("\n")}
- **Example prompt**: "${m.examplePrompt}"`;
}

function formatVideoProfile(m: VideoModelProfile): string {
  return `### ${m.name} (\`${m.id}\`)
- **Provider**: ${m.provider}
- **Type**: ${m.type}
- **Strengths**: ${m.strengths}
- **Input**: ${m.inputRequirements}
- **Duration**: ${m.duration}
- **Ratios**: ${m.ratios.length ? m.ratios.join(", ") : "matches input"}
- **Resolutions**: ${m.resolutions.join(", ")}
- **Prompt tips**:
${m.promptTips.map((t) => `  - ${t}`).join("\n")}
- **Example prompt**: "${m.examplePrompt}"`;
}

/**
 * Build the complete model knowledge prompt to inject into Grok's system message.
 * ~7K tokens — negligible in the 2M context window.
 */
export function buildModelKnowledgePrompt(): string {
  const sections: string[] = [];

  sections.push("# MODEL KNOWLEDGE — INTERNAL REFERENCE\n");
  sections.push("Use this knowledge to choose models, craft prompts, and advise users. NEVER dump this raw data to users — synthesize it naturally.\n");

  // Image models
  sections.push("## IMAGE GENERATION MODELS\n");
  for (const m of IMAGE_MODELS) {
    sections.push(formatModelProfile(m));
  }

  // Video models
  sections.push("\n## VIDEO GENERATION MODELS\n");
  for (const m of VIDEO_MODELS) {
    sections.push(formatVideoProfile(m));
  }

  // Realism bible
  sections.push("\n" + REALISM_GUIDE);

  // Model selection
  sections.push("\n" + MODEL_SELECTION_GUIDE);

  return sections.join("\n\n");
}
