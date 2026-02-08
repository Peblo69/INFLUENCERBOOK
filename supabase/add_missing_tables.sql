-- Add missing tables for WAN 2.1 LoRA system

-- ============================================
-- TABLE: lora_models
-- ============================================
CREATE TABLE IF NOT EXISTS lora_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Model Info
  name TEXT NOT NULL,
  description TEXT,
  trigger_word TEXT NOT NULL DEFAULT 'p3r5on',
  model_type TEXT NOT NULL DEFAULT 'wan-2.1',

  -- LoRA Files
  lora_url TEXT NOT NULL,
  lora_url_secondary TEXT,

  -- Training Settings
  training_steps INTEGER,
  learning_rate NUMERIC,
  lora_rank INTEGER,
  training_images_count INTEGER,

  -- Files
  thumbnail_url TEXT,
  zip_url TEXT,
  training_job_id UUID,

  -- Metadata
  is_public BOOLEAN DEFAULT false NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  downloads_count INTEGER DEFAULT 0 NOT NULL,
  uses_count INTEGER DEFAULT 0 NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lora_models_user_id ON lora_models(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lora_models_public ON lora_models(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_lora_models_deleted ON lora_models(is_deleted) WHERE is_deleted = false;

-- ============================================
-- TABLE: training_jobs
-- ============================================
CREATE TABLE IF NOT EXISTS training_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Job Info
  external_job_id TEXT,
  model_type TEXT NOT NULL DEFAULT 'wan-2.1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Training Parameters
  trigger_word TEXT NOT NULL DEFAULT 'p3r5on',
  steps INTEGER NOT NULL DEFAULT 2000,
  learning_rate NUMERIC NOT NULL DEFAULT 0.0001,
  lora_rank INTEGER NOT NULL DEFAULT 32,

  -- Files
  training_images_zip_url TEXT NOT NULL,
  training_images_count INTEGER,

  -- Results
  lora_model_id UUID REFERENCES lora_models(id) ON DELETE SET NULL,
  output_urls JSONB,

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
-- TABLE: credit_transactions
-- ============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Transaction Info
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'generation', 'training', 'refund', 'bonus', 'subscription', 'admin')),

  -- References
  generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
  training_job_id UUID REFERENCES training_jobs(id) ON DELETE SET NULL,

  -- Payment Info
  payment_provider TEXT,
  payment_id TEXT,
  payment_amount NUMERIC,
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
-- Update user_profiles to add credits field if missing
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100 NOT NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_images_generated INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_loras_trained INTEGER DEFAULT 0 NOT NULL;

-- ============================================
-- Update generations table for WAN 2.1 support
-- ============================================
ALTER TABLE generations ADD COLUMN IF NOT EXISTS model_type TEXT DEFAULT 'seedream-v4';
ALTER TABLE generations ADD COLUMN IF NOT EXISTS model_variant TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS loras JSONB;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS strength NUMERIC;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS output_format TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS input_images JSONB;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS edit_mode TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS output_images JSONB;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS task_id TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS has_nsfw_contents JSONB;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS inference_time INTEGER;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS credits_cost INTEGER DEFAULT 10;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE lora_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- LoRA Models Policies
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

-- Training Jobs Policies
CREATE POLICY "Users can view their own training jobs"
  ON training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training jobs"
  ON training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training jobs"
  ON training_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Credit Transactions Policies
CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check and deduct credits
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
  -- Lock the user profile row
  SELECT credits INTO v_current_credits
  FROM user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Check credits
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

-- Function to refund credits
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

  -- Record refund
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

-- Function to increment user stats
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

-- Done!
SELECT 'All missing tables and functions created successfully!' AS result;
