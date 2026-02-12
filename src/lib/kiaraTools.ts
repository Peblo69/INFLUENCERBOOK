/**
 * Kiara Vision Tool Definitions
 * These tools give Kiara Vision agency to interact with images and generate content
 */

export interface KiaraTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * All tools available to Kiara Vision
 */
export const KIARA_VISION_TOOLS: KiaraTool[] = [
  // ==================== WEB SEARCH TOOL ====================

  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for real-time information. Use this for: current platform policies/updates (OnlyFans, TikTok, etc.), trending topics and hashtags, latest marketing strategies, news about content creator industry, pricing benchmarks, and any information that may have changed recently. Always search when users ask about current trends, platform rules, or 'what's working now'.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query. Be specific and include relevant keywords like 'OnlyFans', 'TikTok', '2024', 'content creator', etc."
          }
        },
        required: ["query"]
      }
    }
  },

  // ==================== MODEL REGISTRY TOOLS ====================

  {
    type: "function",
    function: {
      name: "listModels",
      description: "Get list of available AI models for image generation. Each model has different capabilities (text-to-image, image-to-image), quality levels, and specializations. Use this to help users choose the best model for their needs. Returns model_id (use in generateImage), display_name, capabilities, and notes.",
      parameters: {
        type: "object",
        properties: {
          capability: {
            type: "string",
            enum: ["text-to-image", "image-to-image", "inpainting"],
            description: "Optional filter by capability. If user has reference images, filter by 'image-to-image'. If no references, use 'text-to-image'."
          }
        },
        required: []
      }
    }
  },

  // ==================== IMAGE MANAGEMENT TOOLS ====================

  {
    type: "function",
    function: {
      name: "listUploadedImages",
      description: "Get list of all currently uploaded reference images with their IDs and preview info. Use this when you need to know what images are available.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },

  {
    type: "function",
    function: {
      name: "analyzeImage",
      description: "Analyze a specific uploaded image for quality, content, and details. Returns detailed analysis including subject, quality issues, and suitability for generation. 🚨 CRITICAL WORKFLOW: This is STEP 1 of 2! After receiving analysis results, you MUST immediately call generateImage (STEP 2) in your next tool call! DO NOT just respond with text after this - the user wants GENERATION, not just analysis! After calling this, CONTINUE to generateImage - don't stop and wait for user input!",
      parameters: {
        type: "object",
        properties: {
          imageIndex: {
            type: "number",
            description: "Index of the image to analyze (0-based, e.g., 0 for first image, 1 for second)"
          },
          analysisType: {
            type: "string",
            enum: ["quality", "content", "full"],
            description: "Type of analysis: 'quality' (resolution, artifacts), 'content' (subject, pose, details), or 'full' (both)"
          }
        },
        required: ["imageIndex"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "compareImages",
      description: "Compare multiple uploaded images to find similarities, differences, or best quality. Useful when user uploads multiple images and you need to help them choose.",
      parameters: {
        type: "object",
        properties: {
          imageIndices: {
            type: "array",
            items: { type: "number" },
            description: "Array of image indices to compare (e.g., [0, 1, 2])"
          },
          comparisonType: {
            type: "string",
            enum: ["quality", "subject", "style"],
            description: "What to compare: 'quality' (resolution, clarity), 'subject' (person, pose), or 'style' (lighting, mood)"
          }
        },
        required: ["imageIndices"]
      }
    }
  },

  // ==================== IMAGE GENERATION TOOLS ====================

  {
    type: "function",
    function: {
      name: "generateImage",
      description: "Generate images using the optimal AI model. Consult your MODEL KNOWLEDGE to choose the right model_id and craft model-specific prompts. Write prompts as RICH NARRATIVE DESCRIPTIONS in full sentences — never tags or bullet points. For influencer content, default to photorealistic phone-camera aesthetic (iPhone selfie, natural lighting, casual pose, real setting). Include camera angle, lighting source, specific outfit materials, environment details, and authentic mood. If user uploaded reference images, prefer an edit-capable model. NEVER reveal the full internal prompt to users — it's proprietary.",
      parameters: {
        type: "object",
        properties: {
          model_id: {
            type: "string",
            description: "Model to use — pick from your MODEL KNOWLEDGE. Key options: 'kiara-grok-imagine' (best photorealism from text), 'kiara-grok-image' (fastest + best face preservation with refs), 'kiara-seedream-edit' or 'kiara-seedream-v4-edit' (up to 10 refs, 4K quality), 'kiara-z-max' (LoRA/artistic). Auto-selects best model if omitted."
          },
          prompt: {
            type: "string",
            description: "INTERNAL prompt — never shown to user. Write like a professional photography director: flowing narrative sentences describing subject, camera, pose, outfit (materials + colors), environment (specific real location), lighting (source + quality + time), and mood. Minimum 80 words for quality results."
          },
          referenceImageIndices: {
            type: "array",
            items: { type: "number" },
            description: "Indices of uploaded images to use as references (0-based). When provided, edit-capable models are preferred."
          },
          aspectRatio: {
            type: "string",
            enum: ["1:1", "16:9", "9:16", "4:3", "3:4"],
            description: "Output ratio. 9:16 for Stories/Reels/TikTok, 1:1 for feed posts, 16:9 for landscape/banners, 4:3 for portraits."
          },
          quality: {
            type: "string",
            enum: ["standard", "hd", "4k"],
            description: "Output quality. 'standard' for quick previews, 'hd' for good quality (default), '4k' for maximum detail (Seedream models only)."
          },
          numImages: {
            type: "number",
            description: "Number of images to generate (1-6 depending on model). More = more options but slower."
          }
        },
        required: ["prompt"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "generateVariations",
      description: "Generate multiple variations of an image with different prompts. Useful when user wants to explore different options.",
      parameters: {
        type: "object",
        properties: {
          basePrompt: {
            type: "string",
            description: "Base structured prompt to vary"
          },
          variations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                change: { type: "string" },
                description: { type: "string" }
              }
            },
            description: "Array of variations to generate (e.g., [{change: 'red dress', description: 'Change outfit to red dress'}])"
          },
          referenceImageIndices: {
            type: "array",
            items: { type: "number" },
            description: "Reference images to use for all variations"
          }
        },
        required: ["basePrompt", "variations", "referenceImageIndices"]
      }
    }
  },

  // ==================== IMAGE ENHANCEMENT TOOLS ====================

  {
    type: "function",
    function: {
      name: "upscaleImage",
      description: "Upscale a low-resolution image to 4K quality. Use this when reference images are too small (< 1024px) or user requests upscaling.",
      parameters: {
        type: "object",
        properties: {
          imageIndex: {
            type: "number",
            description: "Index of the uploaded image to upscale"
          },
          targetResolution: {
            type: "string",
            enum: ["2k", "4k"],
            description: "Target resolution. Default: 4k"
          }
        },
        required: ["imageIndex"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "removeBackground",
      description: "Remove background from an image. Useful for isolating subjects before generation.",
      parameters: {
        type: "object",
        properties: {
          imageIndex: {
            type: "number",
            description: "Index of the image to process"
          }
        },
        required: ["imageIndex"]
      }
    }
  },

  // ==================== HISTORY & SETTINGS TOOLS ====================

  {
    type: "function",
    function: {
      name: "getGenerationHistory",
      description: "Get list of recent generations with their prompts and results. Useful for 'show me what we made' or iterating on previous work.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of recent generations to retrieve. Default: 10"
          }
        },
        required: []
      }
    }
  },

  // ==================== GENERATION SETTINGS TOOLS ====================

  {
    type: "function",
    function: {
      name: "getGenerationSettings",
      description: "Check the current generation settings (image size/resolution, model type, number of images). Use this to understand what quality settings the user has configured before making suggestions or generating.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },

  {
    type: "function",
    function: {
      name: "updateGenerationSettings",
      description: "Change generation settings to optimize quality or speed. Use this when user wants faster generations, or multiple variations. IMPORTANT: Always explain WHY you're changing settings. Default is 4096*4096 (maximum quality).",
      parameters: {
        type: "object",
        properties: {
          size: {
            type: "string",
            enum: ["1920*1920", "2048*2048", "2560*1440", "2720*1536", "4096*4096"],
            description: "Output resolution for models that accept explicit sizes. Use smaller for speed (1920*1920), balanced (2048*2048), or ultra quality (4096*4096)."
          },
          model: {
            type: "string",
            enum: ["edit", "edit-sequential", "text-to-image"],
            description: "Legacy mode for models that support editing vs text-to-image. Use only if the selected model exposes these modes."
          },
          numberOfImages: {
            type: "number",
            description: "How many images to generate (1-4). More images = more options to choose from but takes longer"
          }
        },
        required: []
      }
    }
  }
];

/**
 * Tool choice options for Grok
 */
export type ToolChoice = "auto" | "none" | "required" | { type: "function"; function: { name: string } };

/**
 * Helper to get tool by name
 */
export function getToolByName(name: string): KiaraTool | undefined {
  return KIARA_VISION_TOOLS.find(tool => tool.function.name === name);
}

/**
 * Helper to validate tool call parameters
 */
export function validateToolCall(toolName: string, parameters: any): { valid: boolean; error?: string } {
  const tool = getToolByName(toolName);

  if (!tool) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  const required = tool.function.parameters.required || [];
  for (const param of required) {
    if (!(param in parameters)) {
      return { valid: false, error: `Missing required parameter: ${param}` };
    }
  }

  return { valid: true };
}
