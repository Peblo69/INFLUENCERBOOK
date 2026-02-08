-- Migration: Add RunningHub LoRA support columns to lora_models table
-- These columns enable uploading LoRA files to RunningHub and referencing them in workflows

ALTER TABLE lora_models ADD COLUMN IF NOT EXISTS rh_lora_name TEXT;
ALTER TABLE lora_models ADD COLUMN IF NOT EXISTS rh_upload_status TEXT DEFAULT 'pending'
  CHECK (rh_upload_status IN ('pending', 'uploading', 'completed', 'failed'));
ALTER TABLE lora_models ADD COLUMN IF NOT EXISTS rh_md5_hex TEXT;
ALTER TABLE lora_models ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE lora_models ADD COLUMN IF NOT EXISTS default_strength NUMERIC DEFAULT 0.8;
ALTER TABLE lora_models ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload'
  CHECK (source IN ('upload', 'training', 'external'));

-- Index for quick lookup by RunningHub name
CREATE INDEX IF NOT EXISTS idx_lora_models_rh_name
  ON lora_models(rh_lora_name) WHERE rh_lora_name IS NOT NULL;

-- Index for listing user's completed LoRAs efficiently
CREATE INDEX IF NOT EXISTS idx_lora_models_user_rh_status
  ON lora_models(user_id, rh_upload_status) WHERE is_deleted = false;
