-- DEPRECATED: Use supabase/migrations/*.sql instead.
-- ============================================
-- COMPREHENSIVE SUPABASE DATABASE SCHEMA
-- AI Influencer Studio - WAN 2.1 & Seedream
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: user_profiles
-- User account information and credits
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Profile Info
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Credits & Subscription
  credits INTEGER DEFAULT 100 NOT NULL CHECK (credits >= 0),
  is_pro BOOLEAN DEFAULT false NOT NULL,
  pro_expires_at TIMESTAMPTZ,

  -- Stats
  total_images_generated INTEGER DEFAULT 0 NOT NULL,
  total_loras_trained INTEGER DEFAULT 0 NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- ============================================
-- TABLE: lora_models
-- Trained LoRA models from WAN 2.1
-- ============================================
CREATE TABLE IF NOT EXISTS lora_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Model Info
  name TEXT NOT NULL,
  description TEXT,
  trigger_word TEXT NOT NULL DEFAULT 'p3r5on',
  model_type TEXT NOT NULL DEFAULT 'wan-2.1', -- 'wan-2.1', 'wan-2.2', 'qwen', etc.

  -- LoRA Files (WAN 2.1 has 1 file, WAN 2.2 has 2)
  lora_url TEXT NOT NULL, -- Primary LoRA file URL
  lora_url_secondary TEXT, -- For models with multiple LoRAs (e.g., WAN 2.2 high/low noise)

  -- Training Settings (stored for reference)
  training_steps INTEGER,
  learning_rate NUMERIC,
  lora_rank INTEGER,
  training_images_count INTEGER,

  -- Files
  thumbnail_url TEXT,
  zip_url TEXT, -- URL to original training images ZIP

  -- Training Job Reference
  training_job_id UUID, -- References training_jobs table

  -- Metadata
  is_public BOOLEAN DEFAULT false NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  downloads_count INTEGER DEFAULT 0 NOT NULL,
  uses_count INTEGER DEFAULT 0 NOT NULL, -- How many times used in generations

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lora_models_user_id ON lora_models(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lora_models_public ON lora_models(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_lora_models_deleted ON lora_models(is_deleted) WHERE is_deleted = false;

-- ============================================
-- TABLE: training_jobs
-- Track LoRA training job progress
-- ============================================
CREATE TABLE IF NOT EXISTS training_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Job Info
  external_job_id TEXT, -- WavespeedAI prediction ID
  model_type TEXT NOT NULL DEFAULT 'wan-2.1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Training Parameters
  trigger_word TEXT NOT NULL DEFAULT 'p3r5on',
  steps INTEGER NOT NULL DEFAULT 2000,
  learning_rate NUMERIC NOT NULL DEFAULT 0.0001,
  lora_rank INTEGER NOT NULL DEFAULT 32,

  -- Files
  training_images_zip_url TEXT NOT NULL, -- URL to uploaded ZIP
  training_images_count INTEGER,

  -- Results
  lora_model_id UUID REFERENCES lora_models(id) ON DELETE SET NULL, -- Created LoRA model
  output_urls JSONB, -- Array of output URLs from API

  -- Progress & Timing
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_time_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Errors
  error_message TEXT,
  error_details JSONB,

  -- Credits
  credits_cost INTEGER NOT NULL DEFAULT 150,
  credits_refunded BOOLEAN DEFAULT false NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_jobs_user_id ON training_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_jobs_status ON training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_training_jobs_external_id ON training_jobs(external_job_id);

-- ============================================
-- TABLE: generations
-- All AI-generated images (WAN 2.1, Seedream, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Model Info
  model_type TEXT NOT NULL CHECK (model_type IN ('wan-2.1', 'wan-2.2', 'seedream-v4', 'qwen', 'other')),
  model_variant TEXT, -- e.g., 'text-to-image', 'image-to-image', 'edit', etc.

  -- Generation Parameters
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  seed INTEGER,

  -- WAN 2.1 Specific
  loras JSONB, -- Array of {path: string, scale: number}
  strength NUMERIC, -- For img2img
  output_format TEXT, -- 'jpeg', 'png', 'webp'

  -- Seedream Specific
  input_images JSONB, -- Array of input image URLs
  edit_mode TEXT, -- 'edit', 'edit-sequential'

  -- Common
  image_size TEXT NOT NULL, -- e.g., '1024*1024'

  -- Results
  output_images JSONB NOT NULL, -- Array of generated image URLs
  task_id TEXT, -- External API task/prediction ID
  has_nsfw_contents JSONB, -- Array of boolean for each output

  -- Performance
  inference_time INTEGER, -- milliseconds
  generation_time INTEGER, -- milliseconds (total time)

  -- Credits
  credits_cost INTEGER NOT NULL,

  -- User Actions
  is_favorite BOOLEAN DEFAULT false NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  is_public BOOLEAN DEFAULT false NOT NULL,

  -- Metadata
  metadata JSONB, -- Additional custom data
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_model_type ON generations(model_type);
CREATE INDEX IF NOT EXISTS idx_generations_favorites ON generations(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_generations_deleted ON generations(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_generations_public ON generations(is_public) WHERE is_public = true;

-- ============================================
-- TABLE: credit_transactions
-- Track all credit movements
-- ============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Transaction Info
  amount INTEGER NOT NULL, -- Positive for credits added, negative for credits used
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'generation', 'training', 'refund', 'bonus', 'subscription', 'admin')),

  -- References
  generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
  training_job_id UUID REFERENCES training_jobs(id) ON DELETE SET NULL,

  -- Payment Info (for purchases)
  payment_provider TEXT, -- 'stripe', 'paypal', etc.
  payment_id TEXT,
  payment_amount NUMERIC, -- Actual money paid
  payment_currency TEXT DEFAULT 'USD',

  -- Description
  description TEXT,
  metadata JSONB,

  -- Balance After Transaction
  balance_after INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- ============================================
-- TABLE: collections
-- User-created collections of generations
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,

  is_public BOOLEAN DEFAULT false NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id, created_at DESC);

-- ============================================
-- TABLE: collection_items
-- Junction table for collections and generations
-- ============================================
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  generation_id UUID REFERENCES generations(id) ON DELETE CASCADE NOT NULL,

  position INTEGER DEFAULT 0, -- For ordering items

  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(collection_id, generation_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id, position);

-- ============================================
-- TABLE: api_usage_logs
-- Track API calls for monitoring
-- ============================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- API Info
  api_provider TEXT NOT NULL, -- 'wavespeed', 'replicate', etc.
  api_endpoint TEXT NOT NULL,
  model_type TEXT,

  -- Request/Response
  request_params JSONB,
  response_status INTEGER,
  response_time INTEGER, -- milliseconds

  -- Costs
  credits_charged INTEGER,

  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_logs(api_provider);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lora_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: user_profiles
-- ============================================
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: lora_models
-- ============================================
CREATE POLICY "Users can view their own LoRAs"
  ON lora_models FOR SELECT
  USING (auth.uid() = user_id OR (is_public = true AND is_deleted = false));

CREATE POLICY "Users can insert their own LoRAs"
  ON lora_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LoRAs"
  ON lora_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LoRAs"
  ON lora_models FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: training_jobs
-- ============================================
CREATE POLICY "Users can view their own training jobs"
  ON training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training jobs"
  ON training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training jobs"
  ON training_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: generations
-- ============================================
CREATE POLICY "Users can view their own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id OR (is_public = true AND is_deleted = false));

CREATE POLICY "Users can insert their own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
  ON generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
  ON generations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: credit_transactions
-- ============================================
CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Note: Only server-side functions can INSERT transactions

-- ============================================
-- POLICIES: collections
-- ============================================
CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: collection_items
-- ============================================
CREATE POLICY "Users can view items in accessible collections"
  ON collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND (collections.user_id = auth.uid() OR collections.is_public = true)
    )
  );

CREATE POLICY "Users can add items to their collections"
  ON collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove items from their collections"
  ON collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES: api_usage_logs
-- ============================================
CREATE POLICY "Users can view their own API logs"
  ON api_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    email,
    credits,
    is_pro
  )
  VALUES (
    NEW.id,
    NEW.email,
    100, -- Starting credits
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check and deduct credits (with atomic transaction)
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the user profile row for update
  SELECT credits INTO v_current_credits
  FROM user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Check if enough credits
  IF v_current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. You have % credits but need %', v_current_credits, p_amount;
  END IF;

  -- Deduct credits
  UPDATE user_profiles
  SET credits = credits - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING credits INTO v_new_balance;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after
  )
  VALUES (
    p_user_id,
    -p_amount,
    p_transaction_type,
    p_description,
    v_new_balance
  );

  RETURN TRUE;
END;
$$;

-- Function to add credits
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_payment_id TEXT DEFAULT NULL,
  p_payment_amount NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Add credits
  UPDATE user_profiles
  SET credits = credits + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING credits INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    payment_id,
    payment_amount,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    p_transaction_type,
    p_description,
    p_payment_id,
    p_payment_amount,
    v_new_balance
  );

  RETURN TRUE;
END;
$$;

-- Function to refund credits (for failed generations/training)
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_generation_id UUID DEFAULT NULL,
  p_training_job_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT 'Credit refund'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Add credits back
  UPDATE user_profiles
  SET credits = credits + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING credits INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Record refund transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    generation_id,
    training_job_id,
    description,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    p_generation_id,
    p_training_job_id,
    p_description,
    v_new_balance
  );

  RETURN TRUE;
END;
$$;

-- Function to update user stats
CREATE OR REPLACE FUNCTION public.increment_user_stat(
  p_user_id UUID,
  p_stat_name TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_stat_name = 'images_generated' THEN
    UPDATE user_profiles
    SET total_images_generated = total_images_generated + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSIF p_stat_name = 'loras_trained' THEN
    UPDATE user_profiles
    SET total_loras_trained = total_loras_trained + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid stat name: %', p_stat_name;
  END IF;

  RETURN TRUE;
END;
$$;

-- ============================================
-- STORAGE BUCKETS SETUP
-- ============================================
-- Note: You need to create these in Supabase Dashboard > Storage
-- OR run these if you have service_role access:

/*
-- Bucket for generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket for LoRA files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lora-models',
  'lora-models',
  true,
  524288000, -- 500MB (LoRA files can be large)
  ARRAY['application/octet-stream', 'application/x-safetensors']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket for training images (ZIP files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-images',
  'training-images',
  false, -- Private
  1073741824, -- 1GB
  ARRAY['application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for generated-images
CREATE POLICY "Users can view all public images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

CREATE POLICY "Users can upload their own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Similar policies for other buckets...
*/

-- ============================================
-- INITIAL DATA / SEED
-- ============================================

-- You can add any initial data here if needed

-- ============================================
-- DONE!
-- ============================================
/*
 * Database setup complete!
 *
 * Next steps:
 * 1. Run this SQL in your Supabase SQL Editor
 * 2. Create storage buckets in Supabase Dashboard:
 *    - generated-images (public)
 *    - lora-models (public)
 *    - training-images (private)
 *    - avatars (public)
 * 3. Enable authentication providers (Email, Google, etc.)
 * 4. Update your .env file with Supabase credentials
 * 5. Test by creating a user and generating an image!
 */
