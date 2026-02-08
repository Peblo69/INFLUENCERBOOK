-- ============================================
-- SUPABASE STORAGE BUCKETS SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('training-images', 'training-images', false, 1073741824, ARRAY['application/zip', 'application/x-zip-compressed']::text[]),
  ('generated-images', 'generated-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]),
  ('lora-models', 'lora-models', true, 524288000, ARRAY['application/octet-stream']::text[]),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO NOTHING;

-- Ensure bucket visibility matches security model
UPDATE storage.buckets SET public = false WHERE id = 'training-images';
UPDATE storage.buckets SET public = true WHERE id IN ('generated-images', 'lora-models', 'avatars');

-- ============================================
-- STORAGE POLICIES
-- ============================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe to re-run)
DROP POLICY IF EXISTS "Allow authenticated users to upload training images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own training images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own training images" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload generated images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to generated images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own generated images" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload LoRA models" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to LoRA models" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own LoRA models" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;

DROP POLICY IF EXISTS "Training images insert own" ON storage.objects;
DROP POLICY IF EXISTS "Training images select own" ON storage.objects;
DROP POLICY IF EXISTS "Training images delete own" ON storage.objects;

DROP POLICY IF EXISTS "Generated images insert own" ON storage.objects;
DROP POLICY IF EXISTS "Generated images select public" ON storage.objects;
DROP POLICY IF EXISTS "Generated images update own" ON storage.objects;
DROP POLICY IF EXISTS "Generated images delete own" ON storage.objects;

DROP POLICY IF EXISTS "LoRA models insert own" ON storage.objects;
DROP POLICY IF EXISTS "LoRA models select public" ON storage.objects;
DROP POLICY IF EXISTS "LoRA models update own" ON storage.objects;
DROP POLICY IF EXISTS "LoRA models delete own" ON storage.objects;

DROP POLICY IF EXISTS "Avatars insert own" ON storage.objects;
DROP POLICY IF EXISTS "Avatars select public" ON storage.objects;
DROP POLICY IF EXISTS "Avatars update own" ON storage.objects;
DROP POLICY IF EXISTS "Avatars delete own" ON storage.objects;

-- Training Images (private)
CREATE POLICY "Training images insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Training images select own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Training images delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Generated Images (public read, private write)
CREATE POLICY "Generated images insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Generated images select public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generated-images');

CREATE POLICY "Generated images update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'generated-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Generated images delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'generated-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- LoRA Models (public read, private write)
CREATE POLICY "LoRA models insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lora-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "LoRA models select public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lora-models');

CREATE POLICY "LoRA models update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lora-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "LoRA models delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lora-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars (public read, private write)
CREATE POLICY "Avatars insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatars select public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Avatars update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatars delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
