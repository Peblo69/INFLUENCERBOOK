import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const XAI_API_KEY =
  Deno.env.get("XAI_API_KEY") ??
  Deno.env.get("GROK_API_KEY") ??
  "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-kiara-memory-strategy, x-kiara-memory-count, x-kiara-memory-debug",
};

type MemoryItem = {
  type?: string;
  category?: string;
  content?: string;
  importance?: number;
};

type ProfileMemorySections = {
  likes?: string[];
  dislikes?: string[];
  goals?: string[];
  capabilities?: string[];
  tone?: string[];
};

type MemoryTelemetry = {
  enabled: boolean;
  strategy: string;
  retrievedCount: number;
  usedInPrompt: boolean;
  toneHints: string[];
  memories: Array<{
    id?: string;
    type?: string;
    category?: string;
    content?: string;
    importance?: number;
    confidence?: number;
    reason?: string;
  }>;
};

const extractText = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") {
        return (item as { text: string }).text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
};

const getLatestUserMessage = (messages: unknown): string => {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i] as { role?: string; content?: unknown };
    if (msg?.role === "user") {
      return extractText(msg.content).trim();
    }
  }
  return "";
};

const normalizeStringList = (value: unknown, limit = 6): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().replace(/\s+/g, " ").slice(0, 180);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
    if (output.length >= limit) break;
  }
  return output;
};

const encodeTelemetryHeader = (value: MemoryTelemetry): string => {
  try {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return btoa(binary);
  } catch {
    return "";
  }
};

const buildMemoryBlock = (
  memories: MemoryItem[],
  profileSections: ProfileMemorySections = {},
  toneHints: string[] = [],
): string => {
  const likes = normalizeStringList(profileSections.likes, 4);
  const dislikes = normalizeStringList(profileSections.dislikes, 4);
  const goals = normalizeStringList(profileSections.goals, 4);
  const capabilities = normalizeStringList(profileSections.capabilities, 4);
  const tone = normalizeStringList(profileSections.tone, 4);
  const toneHintsNormalized = normalizeStringList(toneHints, 4);
  const tones = toneHintsNormalized.length ? toneHintsNormalized : tone;

  if (
    memories.length === 0 &&
    likes.length === 0 &&
    dislikes.length === 0 &&
    goals.length === 0 &&
    capabilities.length === 0 &&
    tones.length === 0
  ) {
    return "";
  }

  const sectionMap = new Map<string, string[]>();
  for (const memory of memories) {
    const content = (memory.content ?? "").trim();
    if (!content) continue;

    const key = (memory.category || memory.type || "general").toLowerCase();
    const existing = sectionMap.get(key) ?? [];
    existing.push(content);
    sectionMap.set(key, existing);
  }

  const sections: string[] = [];
  if (likes.length > 0) sections.push(`Likes:\n${likes.map((v) => `- ${v}`).join("\n")}`);
  if (dislikes.length > 0) sections.push(`Dislikes:\n${dislikes.map((v) => `- ${v}`).join("\n")}`);
  if (goals.length > 0) sections.push(`Goals:\n${goals.map((v) => `- ${v}`).join("\n")}`);
  if (capabilities.length > 0) sections.push(`Capabilities:\n${capabilities.map((v) => `- ${v}`).join("\n")}`);
  if (tones.length > 0) sections.push(`Tone Preferences:\n${tones.map((v) => `- ${v}`).join("\n")}`);

  for (const [key, entries] of sectionMap.entries()) {
    const title = key
      .split("_")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    sections.push(`${title}:\n${entries.slice(0, 3).map((v) => `- ${v}`).join("\n")}`);
  }

  return [
    "MEMORY PROFILE (internal, high priority):",
    "Use these as user-specific facts/preferences. If any memory conflicts with a newer user message, prefer the newer message.",
    "Adapt wording and response structure to the user's tone preferences while staying accurate.",
    "",
    ...sections.slice(0, 8),
  ].join("\n");
};

const injectMemoryIntoMessages = (messages: unknown, memoryBlock: string): unknown => {
  if (!memoryBlock || !Array.isArray(messages) || messages.length === 0) return messages;

  const cloned = messages.map((m) => ({ ...(m as Record<string, unknown>) }));
  const systemIndex = cloned.findIndex((m) => m.role === "system");

  if (systemIndex >= 0) {
    const existingContent = cloned[systemIndex].content;
    const systemText = extractText(existingContent);
    cloned[systemIndex].content = `${systemText}\n\n---\n\n${memoryBlock}`.trim();
    return cloned;
  }

  return [{ role: "system", content: memoryBlock }, ...cloned];
};

const filterMessagesForExtraction = (messages: unknown): Array<{ role: string; content: string }> => {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((msg) => {
      const m = msg as { role?: string; content?: unknown };
      return {
        role: typeof m.role === "string" ? m.role : "",
        content: extractText(m.content).trim(),
      };
    })
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.length > 0)
    .slice(-20);
};

/**
 * Convert a Responses API SSE event block into chat completions SSE format.
 * Handles both the Responses API format (response.output_text.delta) and
 * the chat completions format (choices[0].delta.content) for compatibility.
 */
const convertResponsesEvent = (eventBlock: string): string | null => {
  const lines = eventBlock.split("\n");
  let dataPayload = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) {
      dataPayload += trimmed.slice(5).trim();
    }
  }

  if (!dataPayload || dataPayload === "[DONE]") {
    return "data: [DONE]\n\n";
  }

  try {
    const parsed = JSON.parse(dataPayload);

    // Already in chat completions format? Pass through.
    if (parsed.choices) {
      return `data: ${dataPayload}\n\n`;
    }

    // Responses API: text delta
    if (parsed.type === "response.output_text.delta" && typeof parsed.delta === "string") {
      const ccChunk = {
        choices: [{ index: 0, delta: { content: parsed.delta, role: "assistant" } }],
      };
      return `data: ${JSON.stringify(ccChunk)}\n\n`;
    }

    // Responses API: completed / done
    if (parsed.type === "response.completed" || parsed.type === "response.done") {
      return "data: [DONE]\n\n";
    }

    // Responses API: content part delta (alternative format)
    if (parsed.type === "response.content_part.delta" && typeof parsed.delta?.text === "string") {
      const ccChunk = {
        choices: [{ index: 0, delta: { content: parsed.delta.text, role: "assistant" } }],
      };
      return `data: ${JSON.stringify(ccChunk)}\n\n`;
    }

    // Other event types (response.created, response.in_progress, etc.) — skip
    if (typeof parsed.type === "string" && parsed.type.startsWith("response.")) {
      return null;
    }

    // Unknown format — pass through raw
    return `data: ${dataPayload}\n\n`;
  } catch {
    // Not JSON — pass through
    return `data: ${dataPayload}\n\n`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!XAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "XAI_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const jwt = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(jwt);

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const requestBody = await req.json().catch(() => null);
  if (!requestBody || typeof requestBody !== "object") {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = { ...(requestBody as Record<string, unknown>) };
  const userMessage = getLatestUserMessage(body.messages);
  const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;
  const extractionMessages = filterMessagesForExtraction(body.messages);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle();
  const profilePreferences = profile?.preferences ?? {};
  let memoryTelemetry: MemoryTelemetry = {
    enabled: false,
    strategy: "disabled",
    retrievedCount: 0,
    usedInPrompt: false,
    toneHints: [],
    memories: [],
  };

  let memoryEnabled = true;
  let memoryDebug = true;
  if (typeof body.memory_enabled === "boolean") {
    memoryEnabled = body.memory_enabled;
  } else {
    const prefEnabled = profilePreferences?.memory_enabled;
    if (typeof prefEnabled === "boolean") {
      memoryEnabled = prefEnabled;
    }
  }
  if (typeof body.memory_debug === "boolean") {
    memoryDebug = body.memory_debug;
  } else {
    const prefDebug = profilePreferences?.ai_settings?.memory_debug;
    if (typeof prefDebug === "boolean") {
      memoryDebug = prefDebug;
    }
  }
  memoryTelemetry.enabled = memoryEnabled;
  memoryTelemetry.strategy = memoryEnabled ? "none" : "disabled";

  if (memoryEnabled && userMessage.length > 0) {
    try {
      const retrieveResponse = await fetch(`${SUPABASE_URL}/functions/v1/retrieve-memories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          ...(SUPABASE_ANON_KEY ? { "apikey": SUPABASE_ANON_KEY } : {}),
        },
        body: JSON.stringify({
          userMessage,
          maxMemories: 8,
          cooldownHours: 12,
          useSemanticSearch: true,
        }),
      });

      if (retrieveResponse.ok) {
        const retrieveData = await retrieveResponse.json().catch(() => null);
        const memories = Array.isArray(retrieveData?.memories) ? (retrieveData.memories as MemoryItem[]) : [];
        memoryTelemetry.strategy = typeof retrieveData?.search_strategy === "string"
          ? retrieveData.search_strategy
          : "none";
        memoryTelemetry.retrievedCount = memories.length;
        memoryTelemetry.memories = memories.slice(0, 6).map((m) => ({
          id: typeof (m as { id?: unknown }).id === "string" ? (m as { id: string }).id : undefined,
          type: m.type,
          category: m.category,
          content: typeof m.content === "string" ? m.content.slice(0, 220) : m.content,
          importance: m.importance,
          confidence: typeof (m as { confidence?: unknown }).confidence === "number"
            ? (m as { confidence: number }).confidence
            : undefined,
          reason: typeof (m as { reason?: unknown }).reason === "string"
            ? (m as { reason: string }).reason
            : undefined,
        }));
        const profileSections =
          retrieveData?.profile_sections && typeof retrieveData.profile_sections === "object"
            ? (retrieveData.profile_sections as ProfileMemorySections)
            : {};
        const toneHints = Array.isArray(retrieveData?.tone_hints) ? (retrieveData.tone_hints as string[]) : [];
        memoryTelemetry.toneHints = toneHints.slice(0, 4);
        const memoryBlock = buildMemoryBlock(memories, profileSections, toneHints);
        if (memoryBlock.length > 0) {
          body.messages = injectMemoryIntoMessages(body.messages, memoryBlock);
          memoryTelemetry.usedInPrompt = true;
        }
      }
    } catch (error) {
      console.warn("[kiara-grok] Memory retrieval skipped:", error);
      memoryTelemetry.strategy = "error";
    }
  }

  // Web search: use Agent Tools API (search_parameters is deprecated / returns 410)
  const webSearchEnabled = body.web_search === true;
  if (webSearchEnabled) {
    // Inject web_search as a tool via the new Agent Tools API
    const existingTools = Array.isArray(body.tools) ? body.tools : [];
    const hasWebSearch = existingTools.some((t: any) => t?.type === "web_search");
    if (!hasWebSearch) {
      existingTools.push({ type: "web_search" });
    }
    body.tools = existingTools;
  }
  // Remove any legacy search_parameters to avoid 410 errors
  delete body.search_parameters;

  // Remove Kiara-internal transport keys before calling xAI.
  delete body.conversation_id;
  delete body.memory_enabled;
  delete body.memory_debug;
  delete body.web_search;
  delete body.web_search_mode;
  delete body.web_search_max_results;
  delete body.web_search_sources;

  // Use Responses API (/v1/responses) when tools are present (web_search requires it).
  // Otherwise use legacy chat completions which still works for plain chat.
  const useResponsesApi = Array.isArray(body.tools) && body.tools.some((t: any) => t?.type === "web_search");
  const isStreaming = body.stream === true;
  let apiUrl: string;

  if (useResponsesApi) {
    apiUrl = "https://api.x.ai/v1/responses";
    // Responses API uses "input" instead of "messages"
    if (body.messages && !body.input) {
      body.input = body.messages;
      delete body.messages;
    }
    // Responses API doesn't support some chat completions params
    delete body.tool_choice;
  } else {
    apiUrl = "https://api.x.ai/v1/chat/completions";
  }

  const upstreamResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (memoryEnabled && conversationId && extractionMessages.length > 0) {
    const extractPromise = fetch(`${SUPABASE_URL}/functions/v1/extract-memory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        ...(SUPABASE_ANON_KEY ? { "apikey": SUPABASE_ANON_KEY } : {}),
      },
      body: JSON.stringify({
        conversationId,
        messages: extractionMessages,
      }),
    }).catch((error) => {
      console.warn("[kiara-grok] Memory extraction skipped:", error);
    });

    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (typeof edgeRuntime?.waitUntil === "function") {
      edgeRuntime.waitUntil(extractPromise);
    }
  }

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    const isInvalidJwt =
      upstreamResponse.status === 401 &&
      errorText.toLowerCase().includes("invalid jwt");
    const errorMessage = isInvalidJwt
      ? "XAI API key is missing or invalid. Set XAI_API_KEY (or GROK_API_KEY) in Supabase secrets."
      : "Grok upstream error.";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        status: upstreamResponse.status,
        upstream: errorText,
      }),
      { status: upstreamResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    responseHeaders.set(key, value);
  }
  responseHeaders.set("x-kiara-memory-strategy", memoryTelemetry.strategy);
  responseHeaders.set("x-kiara-memory-count", String(memoryTelemetry.retrievedCount));
  if (memoryDebug) {
    const telemetryHeader = encodeTelemetryHeader(memoryTelemetry);
    if (telemetryHeader) {
      responseHeaders.set("x-kiara-memory-debug", telemetryHeader);
    }
  }

  // If using the Responses API with streaming, transform SSE to chat completions format.
  // The Responses API may use events like "response.output_text.delta" instead of
  // the "choices[0].delta.content" format the frontend expects.
  if (useResponsesApi && isStreaming) {
    const upstreamReader = upstreamResponse.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let sseBuffer = "";

    const transformedStream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await upstreamReader.read();
          if (done) {
            // Flush any remaining buffer
            if (sseBuffer.trim()) {
              const converted = convertResponsesEvent(sseBuffer);
              if (converted) controller.enqueue(encoder.encode(converted));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          sseBuffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (delimited by double newline)
          let idx: number;
          while ((idx = sseBuffer.indexOf("\n\n")) !== -1) {
            const eventBlock = sseBuffer.slice(0, idx);
            sseBuffer = sseBuffer.slice(idx + 2);
            const converted = convertResponsesEvent(eventBlock);
            if (converted) {
              controller.enqueue(encoder.encode(converted));
            }
          }
        } catch (err) {
          console.error("[kiara-grok] stream transform error:", err);
          controller.close();
        }
      },
      cancel() {
        upstreamReader.cancel();
      },
    });

    return new Response(transformedStream, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  // For non-streaming Responses API, convert the response format
  if (useResponsesApi) {
    const responseJson = await upstreamResponse.json();
    // Extract text from Responses API format
    let text = "";
    if (responseJson?.output) {
      for (const item of responseJson.output) {
        if (item?.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c?.type === "output_text" && typeof c.text === "string") {
              text += c.text;
            }
          }
        }
      }
    }
    // Fallback: check for choices format (if xAI uses same format)
    if (!text && responseJson?.choices?.[0]?.message?.content) {
      text = responseJson.choices[0].message.content;
    }

    // Return in chat completions format
    const ccResponse = {
      id: responseJson?.id ?? "resp-" + Date.now(),
      object: "chat.completion",
      model: responseJson?.model ?? body.model,
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage: responseJson?.usage ?? {},
    };

    return new Response(JSON.stringify(ccResponse), {
      status: 200,
      headers: { ...Object.fromEntries(responseHeaders.entries()), "Content-Type": "application/json" },
    });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
});
