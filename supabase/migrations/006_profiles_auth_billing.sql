-- ============================================
-- PROFILES, AUTH SYNC, AND BILLING PREP
-- ============================================

-- Ensure profiles table exists (canonical user profile table)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 1000,
  plan TEXT DEFAULT 'free',
  preferences JSONB DEFAULT '{"theme":"dark","notifications":true,"memory_enabled":true,"auto_save":true,"language":"en"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add profile fields used by the app (if missing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_images_generated INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_loras_trained INTEGER DEFAULT 0;

-- Billing / subscription fields (future payments)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_payment_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure defaults are correct
ALTER TABLE profiles ALTER COLUMN credits SET DEFAULT 1000;
ALTER TABLE profiles ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE profiles ALTER COLUMN plan_status SET DEFAULT 'free';
ALTER TABLE profiles ALTER COLUMN preferences SET DEFAULT '{"theme":"dark","notifications":true,"memory_enabled":true,"auto_save":true,"language":"en"}'::jsonb;

-- Backfill sensible defaults when missing
UPDATE profiles
SET preferences = '{"theme":"dark","notifications":true,"memory_enabled":true,"auto_save":true,"language":"en"}'::jsonb
WHERE preferences IS NULL;

UPDATE profiles
SET plan_status = plan
WHERE plan_status IS NULL AND plan IS NOT NULL;

UPDATE profiles
SET billing_email = email
WHERE billing_email IS NULL AND email IS NOT NULL;

-- Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_plan_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
      CHECK (plan IN ('free', 'pro', 'premium', 'enterprise'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_plan_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_plan_status_check
      CHECK (plan_status IN ('free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_credits_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_credits_check
      CHECK (credits >= 0);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Column-level privileges: users can only update safe fields
REVOKE INSERT, UPDATE ON profiles FROM authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, preferences, username, display_name, bio) ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Helper: generate a stable username
CREATE OR REPLACE FUNCTION public.generate_username_from_email(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
BEGIN
  base_username := lower(regexp_replace(split_part(COALESCE(p_email, ''), '@', 1), '[^a-z0-9_]+', '', 'g'));
  IF base_username IS NULL OR length(base_username) = 0 THEN
    base_username := 'user';
  END IF;
  RETURN base_username;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_full_name TEXT;
  base_username TEXT;
  final_username TEXT;
BEGIN
  raw_full_name := NULLIF(NEW.raw_user_meta_data->>'full_name', '');

  base_username := NULLIF(NEW.raw_user_meta_data->>'username', '');
  IF base_username IS NULL THEN
    base_username := public.generate_username_from_email(NEW.email);
  ELSE
    base_username := lower(regexp_replace(base_username, '[^a-z0-9_]+', '', 'g'));
  END IF;

  final_username := base_username;
  IF EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(final_username)) THEN
    final_username := base_username || '-' || substring(NEW.id::text, 1, 6);
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    billing_email,
    full_name,
    display_name,
    username,
    credits,
    plan,
    plan_status,
    is_pro
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email,
    raw_full_name,
    COALESCE(raw_full_name, final_username),
    final_username,
    1000,
    'free',
    'free',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Sync profile when auth user updates (email / metadata)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
  raw_full_name TEXT;
BEGIN
  raw_full_name := NULLIF(NEW.raw_user_meta_data->>'full_name', '');

  UPDATE public.profiles
  SET
    email = NEW.email,
    billing_email = COALESCE(billing_email, NEW.email),
    full_name = COALESCE(full_name, raw_full_name),
    display_name = COALESCE(display_name, raw_full_name),
    updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- Emergency fallback: ensure profile exists for the current user
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS void AS $$
DECLARE
  jwt JSONB;
  email_value TEXT;
  raw_full_name TEXT;
  base_username TEXT;
  final_username TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    RETURN;
  END IF;

  jwt := auth.jwt();
  email_value := jwt->>'email';
  raw_full_name := NULLIF(jwt->'user_metadata'->>'full_name', '');

  base_username := NULLIF(jwt->'user_metadata'->>'username', '');
  IF base_username IS NULL THEN
    base_username := public.generate_username_from_email(email_value);
  ELSE
    base_username := lower(regexp_replace(base_username, '[^a-z0-9_]+', '', 'g'));
  END IF;

  final_username := base_username;
  IF EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(final_username)) THEN
    final_username := base_username || '-' || substring(auth.uid()::text, 1, 6);
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    billing_email,
    full_name,
    display_name,
    username,
    credits,
    plan,
    plan_status,
    is_pro
  )
  VALUES (
    auth.uid(),
    email_value,
    email_value,
    raw_full_name,
    COALESCE(raw_full_name, final_username),
    final_username,
    1000,
    'free',
    'free',
    false
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;
