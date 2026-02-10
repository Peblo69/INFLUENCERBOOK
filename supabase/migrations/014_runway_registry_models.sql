-- ============================================================================
-- Register Kiara Vision models in ai_model_registry so generations can be
-- persisted in ai_generation_jobs / ai_generation_outputs with FK integrity.
-- ============================================================================

INSERT INTO ai_model_registry (
  model_id,
  display_name,
  description,
  provider,
  provider_model_id,
  capabilities,
  default_params,
  param_schema,
  supports_reference_images,
  max_reference_images,
  cost_per_image,
  priority,
  active,
  notes
)
VALUES
(
  'kiara-vision',
  'Kiara Vision',
  'Fast image generation model that requires at least one reference image.',
  'kiara',
  'gen4_image_turbo',
  '["text-to-image","image-to-image"]'::jsonb,
  '{"ratio":"1024:1024"}'::jsonb,
  '{
    "type":"object",
    "properties":{
      "promptText":{"type":"string"},
      "ratio":{"type":"string"},
      "seed":{"type":"integer"},
      "referenceImages":{"type":"array"},
      "contentModeration":{"type":"object"}
    }
  }'::jsonb,
  true,
  3,
  18.0000,
  16,
  true,
  'Kiara Vision via kiara-vision gateway.'
),
(
  'kiara-vision-max',
  'Kiara Vision MAX',
  'High quality image generation model.',
  'kiara',
  'gen4_image',
  '["text-to-image","image-to-image"]'::jsonb,
  '{"ratio":"1024:1024"}'::jsonb,
  '{
    "type":"object",
    "properties":{
      "promptText":{"type":"string"},
      "ratio":{"type":"string"},
      "seed":{"type":"integer"},
      "referenceImages":{"type":"array"},
      "contentModeration":{"type":"object"}
    }
  }'::jsonb,
  true,
  3,
  15.0000,
  17,
  true,
  'Kiara Vision MAX via kiara-vision gateway.'
),
(
  'kiara-vision-flash',
  'Kiara Vision Flash',
  'Fast Kiara Vision image generation profile.',
  'kiara',
  'gemini_2.5_flash',
  '["text-to-image","image-to-image"]'::jsonb,
  '{"ratio":"1024:1024"}'::jsonb,
  '{
    "type":"object",
    "properties":{
      "promptText":{"type":"string"},
      "ratio":{"type":"string"},
      "seed":{"type":"integer"},
      "referenceImages":{"type":"array"},
      "contentModeration":{"type":"object"}
    }
  }'::jsonb,
  true,
  3,
  12.0000,
  18,
  true,
  'Kiara Vision Flash via kiara-vision gateway.'
)
ON CONFLICT (model_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  provider = EXCLUDED.provider,
  provider_model_id = EXCLUDED.provider_model_id,
  capabilities = EXCLUDED.capabilities,
  default_params = EXCLUDED.default_params,
  param_schema = EXCLUDED.param_schema,
  supports_reference_images = EXCLUDED.supports_reference_images,
  max_reference_images = EXCLUDED.max_reference_images,
  cost_per_image = EXCLUDED.cost_per_image,
  priority = EXCLUDED.priority,
  active = EXCLUDED.active,
  notes = EXCLUDED.notes,
  updated_at = NOW();
