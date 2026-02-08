-- ============================================================================
-- RunningHub model template for Kiara Z MAX workflow
-- Notes:
-- 1) Replace provider_model_id with your RunningHub workflowId.
-- 2) Save/run the workflow once in RunningHub before enabling API usage.
-- 3) Set active=true only after workflowId + node mapping are verified.
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
    priority,
    active,
    notes
) VALUES (
    'kiara-z-max',
    'Kiara Z MAX (RunningHub)',
    'Serverless RunningHub workflow execution for Kiara Z MAX image generation',
    'runninghub',
    'REPLACE_WITH_RUNNINGHUB_WORKFLOW_ID',
    '["text-to-image", "image-to-image", "inpainting"]'::jsonb,
    '{
      "nodeInfoList": [
        { "nodeId": "REPLACE_PROMPT_NODE_ID", "fieldName": "text", "fieldValue": "{{prompt}}" }
      ]
    }'::jsonb,
    '{
      "type": "object",
      "properties": {
        "workflowId": { "type": "string" },
        "workflow_id": { "type": "string" },
        "nodeInfoList": { "type": "array" },
        "node_info_list": { "type": "array" },
        "prompt_node_id": { "type": "string" },
        "promptNodeId": { "type": "string" },
        "prompt_field_name": { "type": "string" },
        "promptFieldName": { "type": "string" },
        "negative_prompt_node_id": { "type": "string" },
        "negativePromptNodeId": { "type": "string" },
        "negative_prompt_field_name": { "type": "string" },
        "negativePromptFieldName": { "type": "string" },
        "reference_image_node_mappings": { "type": "array" },
        "referenceImageNodeMappings": { "type": "array" },
        "reference_image_node_ids": { "type": "array" },
        "referenceImageNodeIds": { "type": "array" },
        "reference_image_field_name": { "type": "string" },
        "referenceImageFieldName": { "type": "string" },
        "addMetadata": { "type": "string" },
        "add_metadata": { "type": "string" }
      }
    }'::jsonb,
    true,
    4,
    5,
    false,
    'Set provider_model_id to workflowId, map node IDs, then activate. RunningHub API requires workflow to be saved/run once.'
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
    priority = EXCLUDED.priority,
    active = EXCLUDED.active,
    notes = EXCLUDED.notes,
    updated_at = NOW();
