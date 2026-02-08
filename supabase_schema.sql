-- DEPRECATED: Use supabase/migrations/*.sql instead.
-- ============================================
-- SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: user_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  gems_balance INTEGER DEFAULT 100 NOT NULL,
  is_pro BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- TABLE: generations
-- ============================================
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Generation Parameters
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  style TEXT NOT NULL,
  quality TEXT NOT NULL,
  image_size TEXT NOT NULL,
  pose TEXT,
  filter TEXT,
  emotion TEXT,

  -- Sliders
  age_slider INTEGER,
  weight_slider NUMERIC,
  breast_slider NUMERIC,
  ass_slider NUMERIC,
  detail NUMERIC,
  creativity INTEGER,

  -- Settings
  restore_faces BOOLEAN DEFAULT false NOT NULL,
  seed INTEGER,

  -- Result
  image_url TEXT,
  thumbnail_url TEXT,
  gems_cost INTEGER NOT NULL,
  generation_time NUMERIC,

  -- Metadata
  is_favorite BOOLEAN DEFAULT false NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for generations
CREATE INDEX IF NOT EXISTS idx_user_generations ON generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites ON generations(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_not_deleted ON generations(user_id, is_deleted) WHERE is_deleted = false;

-- ============================================
-- TABLE: character_presets
-- ============================================
CREATE TABLE IF NOT EXISTS character_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  style TEXT NOT NULL,
  quality TEXT,
  image_size TEXT,

  -- Sliders
  age_slider INTEGER,
  weight_slider NUMERIC,
  breast_slider NUMERIC,
  ass_slider NUMERIC,
  detail NUMERIC,
  creativity INTEGER,

  -- Settings
  filter TEXT,
  emotion TEXT,
  restore_faces BOOLEAN DEFAULT false NOT NULL,
  seed INTEGER,

  -- Metadata
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for character_presets
CREATE INDEX IF NOT EXISTS idx_user_characters ON character_presets(user_id, created_at DESC);

-- ============================================
-- TABLE: collections
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for collections
CREATE INDEX IF NOT EXISTS idx_user_collections ON collections(user_id, created_at DESC);

-- ============================================
-- TABLE: collection_items
-- ============================================
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  generation_id UUID REFERENCES generations(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(collection_id, generation_id)
);

-- ============================================
-- TABLE: gem_transactions
-- ============================================
CREATE TABLE IF NOT EXISTS gem_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('generation', 'purchase', 'refund', 'bonus')),
  generation_id UUID REFERENCES generations(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for gem_transactions
CREATE INDEX IF NOT EXISTS idx_user_transactions ON gem_transactions(user_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_transactions ENABLE ROW LEVEL SECURITY;

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
-- POLICIES: generations
-- ============================================
CREATE POLICY "Users can view their own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = false);

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
-- POLICIES: character_presets
-- ============================================
CREATE POLICY "Users can view their own presets"
  ON character_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets"
  ON character_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
  ON character_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON character_presets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: collections
-- ============================================
CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view items in their collections"
  ON collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
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
-- POLICIES: gem_transactions
-- ============================================
CREATE POLICY "Users can view their own transactions"
  ON gem_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, gems_balance, is_pro)
  VALUES (NEW.id, 100, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create generation and deduct gems
CREATE OR REPLACE FUNCTION public.create_generation(
  p_params JSONB,
  p_gems_cost INTEGER,
  p_image_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_generation_id UUID;
  v_current_gems INTEGER;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user has enough gems
  SELECT gems_balance INTO v_current_gems
  FROM user_profiles
  WHERE user_id = v_user_id;

  IF v_current_gems < p_gems_cost THEN
    RAISE EXCEPTION 'Insufficient gems. You have % gems but need %', v_current_gems, p_gems_cost;
  END IF;

  -- Create generation record
  INSERT INTO generations (
    user_id, prompt, negative_prompt, style, quality,
    image_size, pose, filter, emotion, age_slider,
    weight_slider, breast_slider, ass_slider, detail,
    creativity, restore_faces, seed, image_url, gems_cost
  )
  VALUES (
    v_user_id,
    p_params->>'prompt',
    p_params->>'negative_prompt',
    p_params->>'style',
    p_params->>'quality',
    p_params->>'image_size',
    p_params->>'pose',
    p_params->>'filter',
    p_params->>'emotion',
    (p_params->>'age_slider')::INTEGER,
    (p_params->>'weight_slider')::NUMERIC,
    (p_params->>'breast_slider')::NUMERIC,
    (p_params->>'ass_slider')::NUMERIC,
    (p_params->>'detail')::NUMERIC,
    (p_params->>'creativity')::INTEGER,
    (p_params->>'restore_faces')::BOOLEAN,
    (p_params->>'seed')::INTEGER,
    p_image_url,
    p_gems_cost
  )
  RETURNING id INTO v_generation_id;

  -- Deduct gems
  UPDATE user_profiles
  SET gems_balance = gems_balance - p_gems_cost,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO gem_transactions (user_id, amount, transaction_type, generation_id, description)
  VALUES (v_user_id, -p_gems_cost, 'generation', v_generation_id, 'Image generation');

  RETURN v_generation_id;
END;
$$;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Note: Run these separately in the Storage section of Supabase dashboard
-- Or uncomment if you have the service role key

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('generated-images', 'generated-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DONE!
-- ============================================
-- Your database is now ready to use!
-- Next steps:
-- 1. Enable Email authentication in Supabase Dashboard
-- 2. Create storage buckets: 'generated-images' and 'avatars'
-- 3. Test by signing up a new user
