-- ============================================================================
-- AI Generation System Schema
-- Tables: ai_model_registry, ai_generation_jobs, ai_generation_outputs, ai_tool_logs
-- ============================================================================

-- 1) AI Model Registry
-- Stores available models, capabilities, and default parameters
-- Provider info is internal only - never exposed to LLM or frontend
CREATE TABLE IF NOT EXISTS ai_model_registry (
    model_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    provider TEXT NOT NULL, -- internal only: 'fal', 'seedream', 'replicate', etc.
    provider_model_id TEXT NOT NULL, -- internal: actual model endpoint
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['text-to-image', 'image-to-image', 'inpainting']
    default_params JSONB NOT NULL DEFAULT '{}'::jsonb, -- default generation params
    param_schema JSONB, -- JSON schema for allowed params
    prompt_template TEXT, -- server-side prompt injection template
    negative_prompt_default TEXT, -- default negative prompt
    max_width INTEGER DEFAULT 4096,
    max_height INTEGER DEFAULT 4096,
    min_width INTEGER DEFAULT 512,
    min_height INTEGER DEFAULT 512,
    max_images INTEGER DEFAULT 4,
    supports_reference_images BOOLEAN DEFAULT false,
    max_reference_images INTEGER DEFAULT 0,
    cost_per_image DECIMAL(10,4) DEFAULT 0, -- for credit tracking
    priority INTEGER DEFAULT 100, -- lower = higher priority for selection
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) AI Generation Jobs
-- Tracks each generation request
CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL REFERENCES ai_model_registry(model_id),
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT, -- prompt after server-side injection
    negative_prompt TEXT,
    params JSONB DEFAULT '{}'::jsonb, -- width, height, num_images, etc.
    reference_image_urls TEXT[], -- URLs of reference images used
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    error TEXT,
    fal_request_id TEXT, -- for async polling if needed
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_duration_ms INTEGER,
    credits_charged DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) AI Generation Outputs
-- Stores individual generated images from a job
CREATE TABLE IF NOT EXISTS ai_generation_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES ai_generation_jobs(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL, -- Supabase storage URL
    original_url TEXT, -- original provider URL (before we store it)
    thumbnail_url TEXT,
    seed BIGINT,
    width INTEGER,
    height INTEGER,
    meta JSONB DEFAULT '{}'::jsonb, -- any additional metadata from provider
    is_nsfw BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) AI Tool Logs
-- Logs every LLM tool call for debugging and analytics
CREATE TABLE IF NOT EXISTS ai_tool_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- chat session identifier
    tool_name TEXT NOT NULL,
    tool_call_id TEXT, -- from LLM response
    request JSONB NOT NULL, -- tool arguments
    response JSONB, -- tool result
    success BOOLEAN DEFAULT true,
    error TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_user_id ON ai_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_status ON ai_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_created_at ON ai_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generation_outputs_job_id ON ai_generation_outputs(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_logs_user_id ON ai_tool_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_logs_created_at ON ai_tool_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_registry_active ON ai_model_registry(active) WHERE active = true;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_logs ENABLE ROW LEVEL SECURITY;

-- ai_model_registry: All authenticated users can read active models
CREATE POLICY "ai_model_registry_select" ON ai_model_registry
    FOR SELECT TO authenticated
    USING (active = true);

-- ai_model_registry: Only service role can insert/update/delete
CREATE POLICY "ai_model_registry_service_all" ON ai_model_registry
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ai_generation_jobs: Users can only see their own jobs
CREATE POLICY "ai_generation_jobs_select_own" ON ai_generation_jobs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "ai_generation_jobs_insert_own" ON ai_generation_jobs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_generation_jobs_update_own" ON ai_generation_jobs
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Service role can do everything on jobs
CREATE POLICY "ai_generation_jobs_service_all" ON ai_generation_jobs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ai_generation_outputs: Users can see outputs from their jobs
CREATE POLICY "ai_generation_outputs_select_own" ON ai_generation_outputs
    FOR SELECT TO authenticated
    USING (
        job_id IN (
            SELECT id FROM ai_generation_jobs WHERE user_id = auth.uid()
        )
    );

-- Service role can do everything on outputs
CREATE POLICY "ai_generation_outputs_service_all" ON ai_generation_outputs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ai_tool_logs: Users can only see their own logs
CREATE POLICY "ai_tool_logs_select_own" ON ai_tool_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "ai_tool_logs_insert_own" ON ai_tool_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Service role can do everything on logs
CREATE POLICY "ai_tool_logs_service_all" ON ai_tool_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ai_model_registry_updated_at ON ai_model_registry;
CREATE TRIGGER update_ai_model_registry_updated_at
    BEFORE UPDATE ON ai_model_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_generation_jobs_updated_at ON ai_generation_jobs;
CREATE TRIGGER update_ai_generation_jobs_updated_at
    BEFORE UPDATE ON ai_generation_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed initial model registry with fal.ai models
-- ============================================================================
INSERT INTO ai_model_registry (
    model_id, display_name, description, provider, provider_model_id,
    capabilities, default_params, supports_reference_images, max_reference_images,
    priority, notes
) VALUES
(
    'flux-pro-ultra',
    'Flux Pro Ultra',
    'Highest quality photorealistic image generation with exceptional detail',
    'fal',
    'fal-ai/flux-pro/v1.1-ultra',
    '["text-to-image"]'::jsonb,
    '{"aspect_ratio": "16:9", "output_format": "jpeg", "safety_tolerance": 6}'::jsonb,
    false, 0,
    10,
    'Best for photorealistic, high-detail images'
),
(
    'flux-pro',
    'Flux Pro',
    'High quality image generation, balanced speed and quality',
    'fal',
    'fal-ai/flux-pro',
    '["text-to-image"]'::jsonb,
    '{"image_size": "landscape_16_9", "num_inference_steps": 28, "guidance_scale": 3.5}'::jsonb,
    false, 0,
    20,
    'Good balance of quality and speed'
),
(
    'flux-dev',
    'Flux Dev',
    'Fast development model for quick iterations',
    'fal',
    'fal-ai/flux/dev',
    '["text-to-image"]'::jsonb,
    '{"image_size": "landscape_16_9", "num_inference_steps": 28}'::jsonb,
    false, 0,
    30,
    'Faster, good for testing prompts'
),
(
    'flux-realism',
    'Flux Realism',
    'Specialized for realistic human portraits and photos',
    'fal',
    'fal-ai/flux-realism',
    '["text-to-image"]'::jsonb,
    '{"image_size": "landscape_16_9", "num_inference_steps": 28, "guidance_scale": 3.5}'::jsonb,
    false, 0,
    15,
    'Best for realistic portraits'
),
(
    'ideogram-v2',
    'Ideogram V2',
    'Excellent text rendering and creative compositions',
    'fal',
    'fal-ai/ideogram/v2',
    '["text-to-image"]'::jsonb,
    '{"aspect_ratio": "16:9", "expand_prompt": true}'::jsonb,
    false, 0,
    25,
    'Best for images with text/typography'
),
(
    'ideogram-v2-turbo',
    'Ideogram V2 Turbo',
    'Fast version of Ideogram with good text rendering',
    'fal',
    'fal-ai/ideogram/v2/turbo',
    '["text-to-image"]'::jsonb,
    '{"aspect_ratio": "16:9", "expand_prompt": true}'::jsonb,
    false, 0,
    35,
    'Faster Ideogram for quick iterations'
),
(
    'recraft-v3',
    'Recraft V3',
    'Versatile model with multiple style presets',
    'fal',
    'fal-ai/recraft-v3',
    '["text-to-image"]'::jsonb,
    '{"image_size": {"width": 1920, "height": 1080}, "style": "realistic_image"}'::jsonb,
    false, 0,
    40,
    'Multiple art styles available'
),
(
    'stable-diffusion-v35',
    'Stable Diffusion 3.5 Large',
    'Latest Stable Diffusion with improved quality',
    'fal',
    'fal-ai/stable-diffusion-v35-large',
    '["text-to-image"]'::jsonb,
    '{"image_size": "landscape_16_9", "num_inference_steps": 28}'::jsonb,
    false, 0,
    50,
    'Classic SD with latest improvements'
),
(
    'omnigen-v1',
    'OmniGen V1',
    'Multi-modal generation with reference image support',
    'fal',
    'fal-ai/omnigen-v1',
    '["text-to-image", "image-to-image"]'::jsonb,
    '{"image_size": {"width": 1024, "height": 1024}}'::jsonb,
    true, 3,
    45,
    'Supports reference images for style transfer'
),
(
    'kling-image',
    'Kling Image',
    'High quality image generation from Kling',
    'fal',
    'fal-ai/kling-video/v1.5/pro/image-to-video',
    '["text-to-image"]'::jsonb,
    '{"aspect_ratio": "16:9"}'::jsonb,
    false, 0,
    55,
    'Alternative high-quality option'
)
ON CONFLICT (model_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    provider = EXCLUDED.provider,
    provider_model_id = EXCLUDED.provider_model_id,
    capabilities = EXCLUDED.capabilities,
    default_params = EXCLUDED.default_params,
    supports_reference_images = EXCLUDED.supports_reference_images,
    max_reference_images = EXCLUDED.max_reference_images,
    priority = EXCLUDED.priority,
    notes = EXCLUDED.notes,
    updated_at = NOW();
