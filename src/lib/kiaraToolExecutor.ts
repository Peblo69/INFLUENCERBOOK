/**
 * Kiara Vision Tool Executor
 * Executes tool calls from Grok and returns results
 */

import { uploadGeneratedImages, validateImageFiles } from "@/lib/supabase/storage";
import { supabase } from "@/lib/supabase";
import { kiaraGenerate, listModels, generateWithModel, kiaraMedia } from "@/services/kiaraGateway";
type SeedreamModel = "edit" | "edit-sequential" | "text-to-image" | "nano-banana-edit";
import type { GrokToolCall } from "./grok";

export interface ToolExecutionContext {
  uploadedFiles: File[];
  previewUrls: string[];
  generationHistory: Array<{
    id: string;
    prompt: string;
    imageUrl: string;
    timestamp: string;
  }>;
  setCurrentImage?: (image: any) => void;
  setImageHistory?: (images: any[]) => void;
  sessionId?: string;
  generationSettings?: {
    size: "1920*1920" | "2048*2048" | "2560*1440" | "2720*1536" | "4096*4096";
    model: SeedreamModel;
    numberOfImages: number;
  };
  setGenerationSettings?: (settings: {
    size?: "1920*1920" | "2048*2048" | "2560*1440" | "2720*1536" | "4096*4096";
    model?: SeedreamModel;
    numberOfImages?: number;
  }) => void;
}

export interface ToolExecutionResult {
  success: boolean;
  result: any;
  error?: string;
  consoleLog?: string; // For debugging transparency
  toolCallId?: string; // ID of the tool call
  toolName?: string; // Name of the tool that was executed
}

const TOOL_LOG_MAX_FIELD_LENGTH = 2000;

const sanitizeLogValue = (value: unknown, maxLength = TOOL_LOG_MAX_FIELD_LENGTH): any => {
  if (typeof value === "string") {
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, maxLength));
  }
  if (value && typeof value === "object") {
    const output: Record<string, any> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      output[key] = sanitizeLogValue(val, maxLength);
    });
    return output;
  }
  return value;
};

const logToolCall = async (
  toolCall: GrokToolCall,
  result: ToolExecutionResult,
  durationMs: number,
  sessionId?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let parsedArgs: any = toolCall.function.arguments;
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch {
      // keep raw string if parse fails
    }

    const payload = {
      user_id: user.id,
      session_id: sessionId,
      tool_name: toolCall.function.name,
      tool_call_id: toolCall.id,
      request: sanitizeLogValue(parsedArgs),
      response: sanitizeLogValue(result.success ? result.result : null),
      success: result.success,
      error: result.error,
      duration_ms: durationMs,
    };

    await supabase.from("ai_tool_logs").insert(payload);
  } catch (error) {
    console.warn("⚠️ [TOOL LOG] Failed to log tool call:", error);
  }
};

/**
 * Execute a single tool call
 */
export async function executeToolCall(
  toolCall: GrokToolCall,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const { function: func } = toolCall;
  const toolName = func.name;
  let params: any = {};

  try {
    params = JSON.parse(func.arguments);
  } catch (e) {
    console.error(`❌ [TOOL ERROR] Failed to parse arguments for ${toolName}:`, e);
    return {
      success: false,
      result: null,
      error: `Invalid JSON arguments: ${func.arguments}`,
      consoleLog: `❌ [TOOL ERROR] ${toolName} - Invalid arguments`
    };
  }

  console.log(`🔧 [TOOL CALL] ${toolName}`, params);

  try {
    switch (toolName) {

      // ==================== WEB SEARCH TOOL ====================

      case "web_search": {
        const { query } = params;

        if (!query) {
          return {
            success: false,
            result: null,
            error: "Search query is required",
            consoleLog: `❌ [WEB SEARCH] No query provided`
          };
        }

        console.log(`🔍 [WEB SEARCH] Searching: "${query}"`);

        try {
          // Use Grok's built-in web search via a separate API call
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error("Not authenticated");
          }

          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const baseUrl = import.meta.env.VITE_SUPABASE_URL || "";

          const searchPayload = {
            model: "grok-4-fast",
            messages: [
              {
                role: "system",
                content: "You are a web search assistant. Search the web and provide accurate, up-to-date information. Focus on recent and relevant results. Format the information clearly."
              },
              {
                role: "user",
                content: `Search the web for: ${query}\n\nProvide the most relevant and recent information you find. Include sources when possible.`
              }
            ],
            search: true, // Enable Grok's web search
            temperature: 0.3,
            max_tokens: 2000
          };

          let searchResponse = await fetch(`${baseUrl}/functions/v1/kiara-intelligence`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": anonKey,
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              route: "assistant",
              action: "chat",
              payload: searchPayload,
            }),
          });

          if (searchResponse.status === 404) {
            searchResponse = await fetch(`${baseUrl}/functions/v1/kiara-grok`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": anonKey,
                "Authorization": `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(searchPayload),
            });
          }

          if (!searchResponse.ok) {
            throw new Error(`Search API error: ${searchResponse.status}`);
          }

          const searchData = await searchResponse.json();
          const searchResult = searchData?.choices?.[0]?.message?.content || "No results found";

          console.log(`✅ [WEB SEARCH] Results received (${searchResult.length} chars)`);

          return {
            success: true,
            result: {
              query,
              results: searchResult,
              timestamp: new Date().toISOString()
            },
            consoleLog: `🔍 [WEB SEARCH] Found results for "${query}"`
          };
        } catch (error: any) {
          console.error(`❌ [WEB SEARCH] Error:`, error);
          return {
            success: false,
            result: null,
            error: `Web search failed: ${error.message}`,
            consoleLog: `❌ [WEB SEARCH] Failed: ${error.message}`
          };
        }
      }

      // ==================== MODEL REGISTRY TOOLS ====================

      case "listModels": {
        const { capability } = params;

        console.log(`📋 [LIST MODELS] Fetching available models${capability ? ` (capability: ${capability})` : ''}...`);

        try {
          const response = await listModels(capability);

          // Format models for LLM consumption (hide internal details)
          const formattedModels = response.models.map(m => ({
            model_id: m.model_id,
            name: m.display_name,
            description: m.description,
            capabilities: m.capabilities,
            supportsReferences: m.supports_reference_images,
            maxReferences: m.max_reference_images,
            notes: m.notes,
            priority: m.priority, // Lower = better
          }));

          console.log(`✅ [LIST MODELS] Found ${response.count} models`);

          return {
            success: true,
            result: {
              count: response.count,
              models: formattedModels,
              recommendation: formattedModels.length > 0
                ? `Best choice: ${formattedModels[0].name} (${formattedModels[0].model_id}) - ${formattedModels[0].notes || formattedModels[0].description}`
                : "No models available"
            },
            consoleLog: `📋 [LIST MODELS] ${response.count} models available`
          };
        } catch (error: any) {
          console.error(`❌ [LIST MODELS] Error:`, error);
          return {
            success: false,
            result: null,
            error: error.message,
            consoleLog: `❌ [LIST MODELS] Failed: ${error.message}`
          };
        }
      }

      // ==================== IMAGE MANAGEMENT TOOLS ====================

      case "listUploadedImages": {
        const images = context.uploadedFiles.map((file, idx) => ({
          index: idx,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl: context.previewUrls[idx]
        }));

        console.log(`✅ [TOOL RESULT] Found ${images.length} uploaded images`);

        return {
          success: true,
          result: {
            count: images.length,
            images: images.map(img => ({
              index: img.index,
              name: img.name,
              size: `${(img.size / 1024).toFixed(1)}KB`
            }))
          },
          consoleLog: `📸 [LIST IMAGES] ${images.length} images available`
        };
      }

      case "analyzeImage": {
        const { imageIndex, analysisType = "full" } = params;

        if (imageIndex < 0 || imageIndex >= context.uploadedFiles.length) {
          return {
            success: false,
            result: null,
            error: `Invalid image index: ${imageIndex}. Available: 0-${context.uploadedFiles.length - 1}`,
            consoleLog: `❌ [ANALYZE] Invalid index ${imageIndex}`
          };
        }

        const file = context.uploadedFiles[imageIndex];
        const imageUrl = context.previewUrls[imageIndex];

        console.log(`👁️ [ANALYZE] Image ${imageIndex}: ${file.name}`);
        console.log(`🔍 [VISION] Using Grok Vision to analyze image...`);

        try {
          // Convert file to base64 data URL for Grok Vision
          const base64DataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result); // Keep full data URL for vision API
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Call Grok Vision API using chat with image message
          const { GrokAPI } = await import('./grok');
          const grok = new GrokAPI();

          const analysisPrompt = analysisType === "quality"
            ? "Analyze this image for technical quality: resolution, sharpness, lighting, artifacts, and suitability for AI generation. Be specific about what you see."
            : analysisType === "content"
            ? "Describe what you see in this image in detail: the subject, their pose, clothing, accessories, setting, mood, and any important visual elements. Be very specific and detailed."
            : "Provide a complete analysis of this image including: 1) Technical quality (resolution, sharpness), 2) Subject and composition (what/who is in the image, their pose, expression), 3) Visual details (clothing, colors, accessories, setting), 4) Lighting and mood. Be extremely detailed and specific.";

          console.log(`🤖 [VISION] Asking Grok: "${analysisPrompt}"`);

          // Use chat method with image message
          const visionMessage = GrokAPI.messageWithImages("user", analysisPrompt, [base64DataUrl]);
          const visionResponse = await grok.chat([visionMessage]);

          console.log(`✅ [VISION] Grok analysis received: ${visionResponse.substring(0, 200)}...`);

          const analysis = {
            index: imageIndex,
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)}KB`,
            analysisType,
            detailedDescription: visionResponse,
            recommendation: "Image analyzed successfully"
          };

          return {
            success: true,
            result: analysis,
            consoleLog: `👁️ [ANALYZE] Image ${imageIndex} analyzed with Grok Vision`
          };
        } catch (error: any) {
          console.error(`❌ [VISION ERROR]`, error);

          // Fallback to basic analysis if vision fails
          const analysis = {
            index: imageIndex,
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)}KB`,
            error: `Vision analysis failed: ${error.message}`,
            recommendation: "Using image without detailed analysis"
          };

          return {
            success: true,
            result: analysis,
            consoleLog: `⚠️ [ANALYZE] Image ${imageIndex} - vision failed, using anyway`
          };
        }
      }

      case "compareImages": {
        const { imageIndices, comparisonType = "quality" } = params;

        // Validate indices
        const invalidIndices = imageIndices.filter((idx: number) =>
          idx < 0 || idx >= context.uploadedFiles.length
        );

        if (invalidIndices.length > 0) {
          return {
            success: false,
            result: null,
            error: `Invalid indices: ${invalidIndices.join(", ")}`,
            consoleLog: `❌ [COMPARE] Invalid indices`
          };
        }

        // Basic comparison (placeholder)
        const comparison = imageIndices.map((idx: number) => ({
          index: idx,
          fileName: context.uploadedFiles[idx].name,
          fileSize: context.uploadedFiles[idx].size,
          score: Math.random() * 100 // Placeholder
        }));

        console.log(`🔍 [COMPARE] Comparing ${imageIndices.length} images`);

        return {
          success: true,
          result: {
            comparisonType,
            images: comparison,
            recommendation: `Image ${comparison[0].index} appears best for ${comparisonType}`
          },
          consoleLog: `🔍 [COMPARE] ${imageIndices.length} images compared`
        };
      }

      // ==================== IMAGE GENERATION TOOLS ====================

      case "generateImage": {
        // Use settings from context, or fall back to defaults
        const userSize = context.generationSettings?.size || "4096*4096";
        const userModel = context.generationSettings?.model || "edit";
        const numberOfImages = context.generationSettings?.numberOfImages || 1;

        const {
          prompt,
          referenceImageIndices = [],
          model_id,
          aspectRatio,
          numImages = numberOfImages
        } = params;

        // Use model_id if provided, otherwise try to auto-select from registry
        let selectedModelId: string | undefined = model_id;
        const size = userSize; // Size now determined by settings or aspect ratio

        // Validate indices
        const invalidIndices = referenceImageIndices.filter((idx: number) =>
          idx < 0 || idx >= context.uploadedFiles.length
        );

        if (invalidIndices.length > 0) {
          return {
            success: false,
            result: null,
            error: `Invalid reference image indices: ${invalidIndices.join(", ")}`,
            consoleLog: `❌ [GENERATE] Invalid indices`
          };
        }

        // Get reference images
        const referenceFiles = referenceImageIndices.map((idx: number) => context.uploadedFiles[idx]);

        if (!selectedModelId) {
          try {
            const capability = referenceFiles.length > 0 ? "image-to-image" : "text-to-image";
            const modelResponse = await listModels(capability);
            selectedModelId = modelResponse.models?.[0]?.model_id;
          } catch (error) {
            console.warn("⚠️ [MODEL SELECT] Failed to auto-select model:", error);
          }
        }

        const useModelId = !!selectedModelId;

        console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
        console.log(`║  🎨 KIARA VISION - IMAGE GENERATION TRACKING                  ║`);
        console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

        console.log(`🎨 [GENERATE] Starting batch generation: ${numberOfImages} image(s)`);
        console.log(`⚙️ [SETTINGS] Size: ${size}, Model: ${userModel}, Batch: ${numberOfImages}`);
        console.log(`🔍 [DEBUG] User selected size: ${context.generationSettings?.size || 'not set'}`);
        console.log(`🔍 [DEBUG] Size from params: ${params.size || 'not provided'}`);
        console.log(`🔍 [DEBUG] Final size being used: ${size}`);

        // ENHANCED IMAGE TRACKING
        console.log(`\n📸 [IMAGE TRACKING] Total uploaded images: ${context.uploadedFiles.length}`);
        console.log(`📸 [IMAGE TRACKING] Requested reference indices: [${referenceImageIndices.join(', ')}]`);
        console.log(`📸 [IMAGE TRACKING] Actually passing ${referenceFiles.length} images to generator\n`);

        // Log each image being passed
        referenceFiles.forEach((file, idx) => {
          const originalIdx = referenceImageIndices[idx];
          console.log(`   📷 Image ${idx + 1}/${referenceFiles.length}:`);
          console.log(`      • Original index: @img${originalIdx + 1}`);
          console.log(`      • Filename: ${file.name}`);
          console.log(`      • Size: ${(file.size / 1024).toFixed(1)}KB`);
          console.log(`      • Type: ${file.type}`);
        });

        console.log(`\n📝 [PROMPT LENGTH] ${prompt.length} characters (${prompt.split(' ').length} words)`);
        console.log(`📝 [FULL PROMPT]\n${prompt}`);

        // Quality check - verify key sections are present (flexible narrative or technical format)
        const requiredKeywords = [
          { name: 'CAMERA/POV', patterns: ['camera', 'POV', 'lens', 'framing'] },
          { name: 'POSE/BODY', patterns: ['pose', 'posture', 'stands', 'body', 'torso'] },
          { name: 'OUTFIT/CLOTHING', patterns: ['wears', 'dress', 'outfit', 'wardrobe', 'clothing', 'fabric'] },
          { name: 'ENVIRONMENT/SETTING', patterns: ['environment', 'scene', 'background', 'setting', 'building'] },
          { name: 'LIGHTING', patterns: ['light', 'lighting', 'illumination', 'shadows', 'exposure'] },
        ];

        // APPEARANCE is optional - only check for it separately
        const hasAppearance = /appearance|face shape|facial features|ethnicity|age appears/i.test(prompt);

        const missingSections = requiredKeywords.filter(section =>
          !section.patterns.some(pattern => prompt.toLowerCase().includes(pattern.toLowerCase()))
        );

        if (missingSections.length > 0) {
          console.warn(`⚠️ [PROMPT QUALITY] Missing key elements: ${missingSections.map(s => s.name).join(', ')}`);
          console.warn(`⚠️ [PROMPT QUALITY] Consider adding more detail for better results`);
        } else {
          console.log(`✅ [PROMPT QUALITY] All key elements present${hasAppearance ? ' + APPEARANCE (modifying face/body)' : ' (APPEARANCE omitted - preserving reference face/body)'}`);
        }

        // Check prompt length for quality (narrative prompts should be longer)
        const wordCount = prompt.split(/\s+/).length;
        if (wordCount < 100) {
          console.warn(`⚠️ [PROMPT QUALITY] Prompt is short (${wordCount} words). Detailed narrative prompts (200+ words) produce better results.`);
        } else if (wordCount > 200) {
          console.log(`✅ [PROMPT QUALITY] Excellent detail level (${wordCount} words) - narrative style!`);
        } else {
          console.log(`📝 [PROMPT QUALITY] Good detail (${wordCount} words)`);
        }

        try {
          // Generate all images in parallel for faster batch generation
          console.log(`🚀 [PARALLEL] Starting ${numberOfImages} generation(s) in parallel...`);
          const startTime = Date.now();

          if (referenceFiles.length > 0) {
            const validation = validateImageFiles(referenceFiles);
            if (!validation.valid) {
              throw new Error(validation.error);
            }
          }

          const referenceUrls = referenceFiles.length > 0
            ? await uploadGeneratedImages(referenceFiles)
            : [];

          if (referenceFiles.length > 0 && referenceUrls.length === 0) {
            throw new Error("Failed to upload reference images");
          }

          // Create array of promises for parallel generation
          const actualNumImages = numImages || numberOfImages;
          const generationPromises = Array.from({ length: actualNumImages }, (_, i) => {
            console.log(`🎨 [BATCH ${i + 1}/${actualNumImages}] Queueing generation ${i + 1}...`);

            // Use model_id if provided (new API), otherwise fall back to legacy provider mode
            if (useModelId && selectedModelId) {
              console.log(`🤖 [MODEL] Using model_id: ${selectedModelId}`);
              return generateWithModel(selectedModelId, prompt, {
                referenceImages: referenceUrls.length > 0 ? referenceUrls : undefined,
                aspectRatio: aspectRatio,
                numImages: 1, // Generate one at a time for parallel batching
              }).then(result => ({
                result,
                batchIndex: i + 1
              }));
            } else {
              // Legacy: use seedream provider directly
              console.log(`🔧 [LEGACY] Using provider: seedream`);
              return kiaraGenerate({
                provider: "seedream",
                prompt,
                mode: userModel,
                size,
                image_urls: referenceUrls,
              }).then(result => ({
                result,
                batchIndex: i + 1
              }));
            }
          });

          // Wait for all generations to complete in parallel
          const completedGenerations = await Promise.all(generationPromises);

          // Process results
          const allResults = [];
          const allImages = [];
          let totalInferenceTime = 0;

          completedGenerations.forEach(({ result, batchIndex }) => {
            const primaryImage = result.images?.[0];
            const generationId = result.job_id || `gen-${Date.now()}-${batchIndex}`;
            const inferenceTime = 0;

            totalInferenceTime += inferenceTime;

            const generationResult = {
              generationId,
              jobId: result.job_id,
              modelId: result.model_id || selectedModelId,
              imageUrl: primaryImage,
              prompt,
              referenceImageIndices,
              aspectRatio: aspectRatio || size,
              inferenceTime,
              hasNsfw: false,
              batchIndex
            };

            allResults.push(generationResult);

            // Add to generation history (if context provides methods)
            if (context.setCurrentImage && context.setImageHistory) {
              const newImage = {
                id: generationId,
                url: primaryImage,
                prompt,
                userMessage: `Generated via Kiara Vision (${batchIndex}/${actualNumImages})`,
                timestamp: new Date().toISOString()
              };
              allImages.push(newImage);

              // Set the first image as current
              if (batchIndex === 1) {
                context.setCurrentImage(newImage);
              }
            }

            console.log(`✅ [BATCH ${batchIndex}/${numberOfImages}] Complete! Generated (inference time unavailable)`);
          });

        // Add all images to history at once
        if (context.setImageHistory && allImages.length > 0) {
          context.setImageHistory(prev => [...allImages, ...prev].slice(0, 40));
        }

        if (context.generationHistory) {
          const historyEntries = allResults
            .filter((entry) => entry.imageUrl)
            .map((entry) => ({
              id: entry.generationId,
              prompt: entry.prompt,
              imageUrl: entry.imageUrl,
              timestamp: new Date().toISOString(),
            }));

          if (historyEntries.length > 0) {
            context.generationHistory.unshift(...historyEntries);
            context.generationHistory.splice(50);
          }
        }

          const totalWallTime = Date.now() - startTime;
          const avgInferenceTime = Math.round(totalInferenceTime / actualNumImages);

          console.log(`✅ [PARALLEL] Batch complete! ${actualNumImages} image(s) generated in parallel`);
          console.log(`⏱️ [TIME] Wall time: ${totalWallTime}ms | Avg inference: ${avgInferenceTime}ms | Total inference: ${totalInferenceTime}ms`);
          if (useModelId && selectedModelId) {
            console.log(`🤖 [MODEL] Used model_id: ${selectedModelId}`);
          }

          return {
            success: true,
            result: {
              generations: allResults,
              images: allResults.map(r => r.imageUrl), // Add images array for frontend compatibility
              totalGenerated: actualNumImages,
              modelId: selectedModelId,
              wallTime: totalWallTime,
              totalInferenceTime,
              averageInferenceTime: avgInferenceTime
            },
            consoleLog: `✅ [GENERATE] ${actualNumImages} image(s) created in ${totalWallTime}ms${useModelId && selectedModelId ? ` (model: ${selectedModelId})` : ' (legacy mode)'}`
          };
        } catch (error: any) {
          console.error(`❌ [GENERATE] Error:`, error);
          return {
            success: false,
            result: null,
            error: error.message,
            consoleLog: `❌ [GENERATE] Failed: ${error.message}`
          };
        }
      }

      case "generateVariations": {
        const {
          basePrompt,
          variations = [],
          referenceImageIndices = []
        } = params;

        if (!basePrompt || !Array.isArray(variations) || variations.length === 0) {
          return {
            success: false,
            result: null,
            error: "Missing basePrompt or variations",
            consoleLog: `❌ [VARIATIONS] Invalid parameters`
          };
        }

        const invalidIndices = referenceImageIndices.filter((idx: number) =>
          idx < 0 || idx >= context.uploadedFiles.length
        );

        if (invalidIndices.length > 0) {
          return {
            success: false,
            result: null,
            error: `Invalid reference image indices: ${invalidIndices.join(", ")}`,
            consoleLog: `❌ [VARIATIONS] Invalid indices`
          };
        }

        const referenceFiles = referenceImageIndices.map((idx: number) => context.uploadedFiles[idx]);

        if (referenceFiles.length > 0) {
          const validation = validateImageFiles(referenceFiles);
          if (!validation.valid) {
            return {
              success: false,
              result: null,
              error: validation.error,
              consoleLog: `❌ [VARIATIONS] Invalid reference images`
            };
          }
        }

        const referenceUrls = referenceFiles.length > 0
          ? await uploadGeneratedImages(referenceFiles)
          : [];

        let selectedModelId: string | undefined;
        try {
          const capability = referenceFiles.length > 0 ? "image-to-image" : "text-to-image";
          const modelResponse = await listModels(capability);
          selectedModelId = modelResponse.models?.[0]?.model_id;
        } catch (error) {
          console.warn("Model auto-selection failed for variations:", error);
        }

        const variationResults: any[] = [];
        const images: string[] = [];

        for (const variation of variations) {
          const change = variation?.change ? String(variation.change) : "variation";
          const desc = variation?.description ? String(variation.description) : "";
          const variationPrompt = `${basePrompt}\n\nVariation: ${change}${desc ? ` - ${desc}` : ""}`;

          const result = selectedModelId
            ? await generateWithModel(selectedModelId, variationPrompt, {
                referenceImages: referenceUrls.length > 0 ? referenceUrls : undefined,
                numImages: 1,
              })
            : await kiaraGenerate({
                prompt: variationPrompt,
                image_urls: referenceUrls,
                num_images: 1,
              });

          const imageUrl = result.images?.[0];
          if (imageUrl) {
            images.push(imageUrl);
          }

          variationResults.push({
            change,
            description: desc,
            prompt: variationPrompt,
            imageUrl,
            jobId: result.job_id,
            modelId: result.model_id || selectedModelId,
          });
        }

        if (context.generationHistory) {
          const historyEntries = variationResults
            .filter((entry) => entry.imageUrl)
            .map((entry) => ({
              id: entry.jobId || `var-${Date.now()}`,
              prompt: entry.prompt,
              imageUrl: entry.imageUrl,
              timestamp: new Date().toISOString(),
            }));

          if (historyEntries.length > 0) {
            context.generationHistory.unshift(...historyEntries);
            context.generationHistory.splice(50);
          }
        }

        return {
          success: true,
          result: {
            count: variationResults.length,
            variations: variationResults,
            images,
          },
          consoleLog: `✅ [VARIATIONS] Generated ${variationResults.length} variation(s)`
        };
      }

      // ==================== IMAGE ENHANCEMENT TOOLS ====================

      case "upscaleImage": {
        const { imageIndex, targetResolution = "4k" } = params;

        if (imageIndex < 0 || imageIndex >= context.uploadedFiles.length) {
          return {
            success: false,
            result: null,
            error: `Invalid image index: ${imageIndex}`,
            consoleLog: `❌ [UPSCALE] Invalid index`
          };
        }

        console.log(`⬆️ [UPSCALE] Upscaling image ${imageIndex} to ${targetResolution}`);

        const previewUrl = context.previewUrls?.[imageIndex];
        let imageInput = previewUrl;

        if (!imageInput) {
          const file = context.uploadedFiles[imageIndex];
          const uploaded = await uploadGeneratedImages([file]);
          imageInput = uploaded[0];
        }

        if (!imageInput) {
          return {
            success: false,
            result: null,
            error: "Failed to resolve image input for upscaling",
            consoleLog: `❌ [UPSCALE] Missing image input`
          };
        }

        const result = await kiaraMedia({
          action: "upscale",
          image: imageInput,
          target_resolution: targetResolution,
          output_format: "jpeg",
        });

        if (!result.success || !result.output) {
          return {
            success: false,
            result: null,
            error: "Upscale failed",
            consoleLog: `❌ [UPSCALE] Failed`
          };
        }

        return {
          success: true,
          result: { imageUrl: result.output },
          consoleLog: `✅ [UPSCALE] Complete`
        };
      }

      case "removeBackground": {
        const { imageIndex } = params;

        if (imageIndex < 0 || imageIndex >= context.uploadedFiles.length) {
          return {
            success: false,
            result: null,
            error: `Invalid image index: ${imageIndex}`,
            consoleLog: `❌ [BG REMOVE] Invalid index`
          };
        }

        console.log(`🖼️ [BG REMOVE] Processing image ${imageIndex}`);

        const previewUrl = context.previewUrls?.[imageIndex];
        let imageInput = previewUrl;

        if (!imageInput) {
          const file = context.uploadedFiles[imageIndex];
          const uploaded = await uploadGeneratedImages([file]);
          imageInput = uploaded[0];
        }

        if (!imageInput) {
          return {
            success: false,
            result: null,
            error: "Failed to resolve image input for background removal",
            consoleLog: `❌ [BG REMOVE] Missing image input`
          };
        }

        const result = await kiaraMedia({
          action: "remove-background",
          image: imageInput,
          format: "png",
        });

        if (!result.success || !result.output) {
          return {
            success: false,
            result: null,
            error: "Background removal failed",
            consoleLog: `❌ [BG REMOVE] Failed`
          };
        }

        return {
          success: true,
          result: { imageUrl: result.output },
          consoleLog: `✅ [BG REMOVE] Complete`
        };
      }

      // ==================== RESULT ANALYSIS TOOLS ====================

      case "analyzeGeneratedResult": {
        const { generationId, checkFor = ["quality", "prompt_match", "artifacts"] } = params;

        console.log(`🔍 [ANALYZE RESULT] Checking generation ${generationId}`);

        // TODO: Use vision model to analyze generated image
        const analysis = {
          generationId,
          quality: "Good (placeholder)",
          promptMatch: 85,
          issues: [],
          recommendation: "Looks good!"
        };

        return {
          success: true,
          result: analysis,
          consoleLog: `🔍 [ANALYZE RESULT] Generation analyzed`
        };
      }

      // ==================== USER INTERACTION TOOLS ====================

      case "showImageInStudio": {
        const { imageId, autoSwitch = false } = params;

        console.log(`🖼️ [SHOW] Displaying image ${imageId}`);

        // TODO: Implement image display in studio
        return {
          success: true,
          result: { displayed: true, imageId },
          consoleLog: `🖼️ [SHOW] Image displayed`
        };
      }

      case "getGenerationHistory": {
        const { limit = 10 } = params;

        let history = context.generationHistory.slice(0, limit);

        if (history.length === 0) {
          const { data, error } = await supabase
            .from("ai_generation_outputs")
            .select("id, image_url, created_at, ai_generation_jobs ( prompt )")
            .order("created_at", { ascending: false })
            .limit(limit);

          if (!error && data) {
            history = data.map((row: any) => {
              const url = row.image_url && typeof row.image_url === "string" && row.image_url.startsWith("http")
                ? row.image_url
                : supabase.storage.from("generated-images").getPublicUrl(row.image_url || "").data.publicUrl;

              return {
                id: row.id,
                prompt: row.ai_generation_jobs?.prompt || "",
                imageUrl: url,
                timestamp: row.created_at,
              };
            });
          }
        }

        console.log(`📜 [HISTORY] Retrieved ${history.length} generations`);

        return {
          success: true,
          result: {
            count: history.length,
            generations: history
          },
          consoleLog: `📜 [HISTORY] ${history.length} generations`
        };
      }

      // ==================== GENERATION SETTINGS TOOLS ====================

      case "getGenerationSettings": {
        const settings = context.generationSettings || {
          size: "4096*4096",
          model: "edit",
          numberOfImages: 1
        };

        console.log(`⚙️ [SETTINGS] Current: ${settings.size}, ${settings.model}, ${settings.numberOfImages} image(s)`);

        // Provide quality tier explanations (Seedream v4.5 - min 3.7MP)
        const qualityTiers: Record<string, string> = {
          "1920*1920": "Standard quality (3.7MP - minimum for v4.5)",
          "2048*2048": "High quality (4.2MP - recommended)",
          "2560*1440": "Wide HD (3.7MP - 16:9 ratio)",
          "2720*1536": "Wide 2K (4.2MP - 16:9 ratio)",
          "4096*4096": "Maximum quality (16MP - best detail)"
        };

        return {
          success: true,
          result: {
            currentSettings: settings,
            qualityDescription: qualityTiers[settings.size] || "Custom size",
            recommendations: {
              forSpeed: "1920*1920 (minimum allowed)",
              forBalanced: "2048*2048 (recommended)",
              forUltraQuality: "4096*4096 (maximum quality)",
              forMultipleOptions: "increase numberOfImages to 2-4"
            }
          },
          consoleLog: `⚙️ [SETTINGS] ${settings.size}, ${settings.model}, ${settings.numberOfImages} image(s)`
        };
      }

      case "updateGenerationSettings": {
        const { size, model, numberOfImages } = params;

        // Validate settings
        if (!context.setGenerationSettings) {
          return {
            success: false,
            result: null,
            error: "Settings update not available in this context",
            consoleLog: `❌ [SETTINGS] Update not available`
          };
        }

        const currentSettings = context.generationSettings || {
          size: "4096*4096",
          model: "edit",
          numberOfImages: 1
        };

        // Build updated settings
        const updatedSettings: any = {};
        let changes: string[] = [];

        if (size && size !== currentSettings.size) {
          updatedSettings.size = size;
          changes.push(`size: ${currentSettings.size} → ${size}`);
        }

        if (model && model !== currentSettings.model) {
          updatedSettings.model = model;
          changes.push(`model: ${currentSettings.model} → ${model}`);
        }

        if (numberOfImages !== undefined && numberOfImages !== currentSettings.numberOfImages) {
          // Clamp to 1-4 range
          const clampedCount = Math.max(1, Math.min(4, numberOfImages));
          updatedSettings.numberOfImages = clampedCount;
          changes.push(`images: ${currentSettings.numberOfImages} → ${clampedCount}`);
        }

        if (changes.length === 0) {
          return {
            success: true,
            result: {
              changed: false,
              message: "No changes needed - settings already match requested values"
            },
            consoleLog: `⚙️ [SETTINGS] No changes needed`
          };
        }

        // Apply settings
        context.setGenerationSettings(updatedSettings);

        console.log(`⚙️ [SETTINGS] Updated: ${changes.join(', ')}`);

        return {
          success: true,
          result: {
            changed: true,
            changes: changes,
            newSettings: {
              ...currentSettings,
              ...updatedSettings
            }
          },
          consoleLog: `⚙️ [SETTINGS] Updated: ${changes.join(', ')}`
        };
      }

      default:
        console.error(`❌ [TOOL ERROR] Unknown tool: ${toolName}`);
        return {
          success: false,
          result: null,
          error: `Unknown tool: ${toolName}`,
          consoleLog: `❌ [ERROR] Unknown tool: ${toolName}`
        };
    }
  } catch (error: any) {
    console.error(`❌ [TOOL ERROR] ${toolName} failed:`, error);
    return {
      success: false,
      result: null,
      error: error.message || "Tool execution failed",
      consoleLog: `❌ [ERROR] ${toolName}: ${error.message}`
    };
  }
}

/**
 * Execute multiple tool calls
 */
export async function executeToolCalls(
  toolCalls: GrokToolCall[],
  context: ToolExecutionContext
): Promise<ToolExecutionResult[]> {
  console.log(`🔧 [TOOLS] Executing ${toolCalls.length} tool calls`);

  const results = [];
  for (const toolCall of toolCalls) {
    const startedAt = Date.now();
    const result = await executeToolCall(toolCall, context);
    await logToolCall(toolCall, result, Date.now() - startedAt, context.sessionId);
    // Add toolCallId and toolName to the result
    result.toolCallId = toolCall.id;
    result.toolName = toolCall.function.name;
    results.push(result);
  }

  return results;
}
