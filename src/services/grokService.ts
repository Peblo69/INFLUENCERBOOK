import { supabase } from "@/lib/supabase";
import { getKiaraBaseUrl } from "@/services/kiaraClient";
import type { GrokMessage, GrokMessageContent, GrokTool, GrokToolChoice } from "@/lib/grok";
import { KIARA_VISION_TOOLS } from "@/lib/kiaraTools";
import { executeToolCalls, type ToolExecutionContext, type ToolExecutionResult } from "@/lib/kiaraToolExecutor";
import { getContextForAI } from "@/services/knowledgeService";

export interface GrokAttachment {
  id: string;
  data: string;
  mimeType: string;
  file?: File;
}

export interface GrokChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: GrokAttachment[];
}

export interface GrokChatOptions {
  tools?: GrokTool[];
  toolChoice?: GrokToolChoice;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  generationSettings?: ToolExecutionContext["generationSettings"];
  setGenerationSettings?: ToolExecutionContext["setGenerationSettings"];
}

export interface GrokChatResult {
  text: string;
  images?: string[];
  toolResults?: ToolExecutionResult[];
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string, images?: string[]) => void;
  onError: (error: Error) => void;
}

const SYSTEM_INSTRUCTION = `# IDENTITY

You are **Kiara**, the premium AI assistant powering **AI Influencerbook**. You help creators build, manage, and scale AI-generated influencer businesses.

## PERSONALITY

- Confident, polished, and genuinely interested in what the user wants to achieve
- You listen first, then deliver exactly what they need — no filler, no lectures
- You speak like a trusted business partner, not a generic chatbot
- Warm but professional. Direct but not cold. Premium but not pretentious

## HOW TO USE YOUR KNOWLEDGE

You have access to an extensive internal knowledge base covering platform strategies, content scripts, monetization playbooks, growth tactics, and more. Follow these rules:

1. **Draw from knowledge naturally** — When the user asks something your knowledge covers, weave it into your answer seamlessly. Never say "according to my knowledge base" or "my documents say"
2. **Don't dump information** — Only surface what's relevant to the user's specific question or goal. Less is more
3. **Stay goal-oriented** — Always tie your advice back to what the user is trying to accomplish
4. **When asked "what can you do"** — Talk about your capabilities and expertise areas. Do NOT list random facts from your knowledge base
5. **Prioritize actionable output** — Scripts, templates, step-by-step plans, and specific numbers over theory
6. **If knowledge doesn't cover it** — Use your general expertise. Don't pretend you don't know something just because it's not in the knowledge base

## RULES

1. Be direct — actionable advice, no fluff
2. Be specific — exact numbers, real scripts, concrete templates
3. Be professional — no judgment, treat everything as serious business
4. Match the user's energy — short question = concise answer, deep question = thorough breakdown
`;

const DEFAULT_MODEL = "grok-4-1-fast-reasoning";

/**
 * Extract text content from SSE delta payload
 * Handles multiple response formats from different models
 */
const extractDeltaText = (parsed: any): string => {
  const choice = parsed?.choices?.[0];
  if (!choice) return "";
  
  const delta = choice?.delta ?? choice?.message ?? null;

  // Handle reasoning content (for reasoning models) - log but don't display
  if (delta?.reasoning_content) {
    console.log("[SSE] reasoning_content detected (hidden from UI)");
  }

  // Try multiple content locations
  const content = delta?.content ?? choice?.text ?? "";

  if (typeof content === "string") {
    return content;
  }

  // Handle array content (e.g., for multimodal responses)
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        return "";
      })
      .join("");
  }

  return "";
};

/**
 * Process a single SSE event and extract text chunks
 * SSE format: data: {...}\n\n or data: [DONE]
 */
const processSseEvent = (
  rawEvent: string,
  onChunk: (chunk: string) => void,
): void => {
  if (!rawEvent || !rawEvent.trim()) return;

  const lines = rawEvent.split(/\r?\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;

    try {
      const parsed = JSON.parse(payload);
      const text = extractDeltaText(parsed);
      
      // IMPORTANT: Always call onChunk, even for empty strings
      // This maintains the streaming cadence and prevents word cutoffs
      onChunk(text);
    } catch (e) {
      // Log but don't crash on malformed JSON
      console.warn("[SSE] malformed data line:", payload.substring(0, 100));
    }
  }
};

/**
 * Build message content with optional attachments
 */
const buildContent = (text: string, attachments?: GrokAttachment[]): string | GrokMessageContent[] => {
  if (!attachments || attachments.length === 0) return text;

  const content: GrokMessageContent[] = [];
  if (text && text.trim().length > 0) {
    content.push({ type: "text", text });
  } else {
    content.push({ type: "text", text: "" });
  }

  attachments.forEach((att) => {
    const url = `data:${att.mimeType};base64,${att.data}`;
    content.push({
      type: "image_url",
      image_url: { url, detail: "high" },
    });
  });

  return content;
};

/**
 * Build messages array for API request
 */
const buildMessages = (
  history: GrokChatHistoryMessage[],
  currentMessage: string,
  currentAttachments: GrokAttachment[],
  knowledgeContext?: string
): GrokMessage[] => {
  let systemContent = SYSTEM_INSTRUCTION;
  if (knowledgeContext) {
    systemContent += `\n\n---\n\nBELOW ARE INTERNAL REFERENCE NOTES. Rules:
- NEVER reproduce these notes verbatim — synthesize and paraphrase in your own voice
- NEVER dump large sections — only weave in what is directly relevant to the user's question
- If a note seems incomplete or cut off, skip it or fill in the gap with your general knowledge
- Do NOT mention these notes exist

${knowledgeContext}`;
  }

  const messages: GrokMessage[] = [
    { role: "system", content: systemContent },
  ];

  history.forEach((m) => {
    messages.push({
      role: m.role,
      content: buildContent(m.content, m.attachments),
    });
  });

  messages.push({
    role: "user",
    content: buildContent(currentMessage, currentAttachments),
  });

  return messages;
};

/**
 * Fetch relevant knowledge for the user's message
 */
const fetchKnowledgeContext = async (userMessage: string): Promise<string> => {
  try {
    const context = await getContextForAI(userMessage, 1500);
    return context;
  } catch (error) {
    console.warn("[grokService] Knowledge retrieval failed, continuing without:", error);
    return "";
  }
};

/**
 * Stream message to Grok with real-time token callbacks
 * FIXED: Better SSE parsing, smoother token delivery
 */
export const streamMessageToGrok = async (
  history: GrokChatHistoryMessage[],
  currentMessage: string,
  currentAttachments: GrokAttachment[] = [],
  callbacks: StreamCallbacks,
  options: GrokChatOptions = {}
): Promise<void> => {
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.7;

  // Fetch knowledge context and auth session in parallel
  const [knowledgeContext, { data: { session } }] = await Promise.all([
    fetchKnowledgeContext(currentMessage),
    supabase.auth.getSession(),
  ]);

  if (!session?.access_token) {
    callbacks.onError(new Error("Not authenticated"));
    return;
  }

  const messages = buildMessages(history, currentMessage, currentAttachments, knowledgeContext);

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  const controller = new AbortController();
  const STALL_TIMEOUT_MS = 60000; // Increased to 60s for long generations

  const resetStallTimer = () => {
    if (stallTimer !== null) {
      clearTimeout(stallTimer);
    }
    stallTimer = setTimeout(() => {
      controller.abort();
    }, STALL_TIMEOUT_MS);
  };

  const clearStallTimer = () => {
    if (stallTimer !== null) {
      clearTimeout(stallTimer);
      stallTimer = null;
    }
  };

  try {
    const url = `${getKiaraBaseUrl()}/kiara-grok`;
    resetStallTimer();
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: options.maxTokens || 8192,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[grokService] Error response:", errorText);
      clearStallTimer();
      callbacks.onError(new Error(`Grok API error: ${errorText}`));
      return;
    }

    if (!response.body) {
      clearStallTimer();
      callbacks.onError(new Error("No response body"));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let tokenChunkCount = 0;

    // Process chunks as they arrive
    const handleChunk = (chunk: string) => {
      tokenChunkCount++;
      fullContent += chunk;
      callbacks.onToken(chunk);
    };

    while (true) {
      resetStallTimer();
      const { done, value } = await reader.read();
      
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }
      
      // Process complete SSE events (separated by double newlines)
      const eventDelimiter = "\n\n";
      let eventEnd = buffer.indexOf(eventDelimiter);
      
      while (eventEnd !== -1) {
        const event = buffer.slice(0, eventEnd);
        buffer = buffer.slice(eventEnd + eventDelimiter.length);
        processSseEvent(event, handleChunk);
        eventEnd = buffer.indexOf(eventDelimiter);
      }
      
      // Handle any remaining data when stream ends
      if (done) {
        // Flush remaining buffer
        const finalChunk = decoder.decode();
        if (finalChunk) {
          buffer += finalChunk;
        }
        
        // Process final event if any
        if (buffer.trim()) {
          processSseEvent(buffer, handleChunk);
        }
        break;
      }
    }

    clearStallTimer();
    console.log(`[stream] done — ${tokenChunkCount} chunks, ${fullContent.length} chars`);
    callbacks.onComplete(fullContent);
  } catch (error) {
    clearStallTimer();
    if (error instanceof DOMException && error.name === "AbortError") {
      callbacks.onError(new Error("Stream timed out. Please retry."));
      return;
    }
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Non-streaming version for backwards compatibility and tool calls
 */
export const sendMessageToGrok = async (
  history: GrokChatHistoryMessage[],
  currentMessage: string,
  currentAttachments: GrokAttachment[] = [],
  options: GrokChatOptions = {}
): Promise<GrokChatResult> => {
  const tools = options.tools ?? (KIARA_VISION_TOOLS as unknown as GrokTool[]);
  const toolChoice = options.toolChoice ?? "auto";
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.7;

  const knowledgeContext = await fetchKnowledgeContext(currentMessage);
  const messages = buildMessages(history, currentMessage, currentAttachments, knowledgeContext);
  const allAttachments = collectAttachments(history, currentAttachments);

  const toolContext: ToolExecutionContext = {
    uploadedFiles: allAttachments.map((att) => att.file!).filter(Boolean),
    previewUrls: allAttachments.map((att) => `data:${att.mimeType};base64,${att.data}`),
    generationHistory: [],
    generationSettings: options.generationSettings,
    setGenerationSettings: options.setGenerationSettings,
  };

  let responseData = await grokRequest({
    model,
    messages,
    tools: tools.length ? tools : undefined,
    tool_choice: tools.length ? toolChoice : undefined,
    temperature,
    max_tokens: options.maxTokens,
  });

  let assistantMessage = responseData?.choices?.[0]?.message as GrokMessage | undefined;
  let toolResults: ToolExecutionResult[] = [];
  let images: string[] = [];

  const MAX_TOOL_ROUNDS = 2;
  let rounds = 0;
  while (assistantMessage?.tool_calls?.length && rounds < MAX_TOOL_ROUNDS) {
    const toolCalls = assistantMessage.tool_calls;
    const results = await executeToolCalls(toolCalls, toolContext);
    toolResults = toolResults.concat(results);
    images = images.concat(extractImages(results));

    messages.push({
      role: "assistant",
      content: assistantMessage.content ?? "",
      tool_calls: toolCalls,
    });
    messages.push(...toToolMessages(results));

    responseData = await grokRequest({
      model,
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? toolChoice : undefined,
      temperature,
      max_tokens: options.maxTokens,
    });

    assistantMessage = responseData?.choices?.[0]?.message as GrokMessage | undefined;
    rounds += 1;
  }

  return {
    text: normalizeContent(assistantMessage?.content),
    images: images.length ? images : undefined,
    toolResults: toolResults.length ? toolResults : undefined,
  };
};

// Helper functions
const collectAttachments = (
  history: GrokChatHistoryMessage[],
  currentAttachments: GrokAttachment[]
): GrokAttachment[] => {
  const all: GrokAttachment[] = [];
  const addAttachment = (att?: GrokAttachment) => {
    if (!att || !att.file) return;
    all.push(att);
  };
  history.forEach((msg) => msg.attachments?.forEach(addAttachment));
  currentAttachments.forEach(addAttachment);
  return all;
};

const toToolMessages = (results: ToolExecutionResult[]): GrokMessage[] => {
  return results.map((result) => ({
    role: "tool",
    tool_call_id: result.toolCallId,
    content: JSON.stringify(result.success ? result.result : { error: result.error }),
  }));
};

const extractImages = (results: ToolExecutionResult[]): string[] => {
  const images: string[] = [];
  results.forEach((res) => {
    if (!res.success || !res.result) return;
    if (Array.isArray(res.result.images)) {
      images.push(...res.result.images.filter(Boolean));
    }
    if (Array.isArray(res.result.generations)) {
      res.result.generations.forEach((gen: any) => {
        if (gen?.imageUrl) images.push(gen.imageUrl);
      });
    }
  });
  return images;
};

const normalizeContent = (content?: string | GrokMessageContent[]): string => {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("");
};

const grokRequest = async (body: Record<string, any>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const response = await fetch(`${getKiaraBaseUrl()}/kiara-grok`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed?.error || parsed?.message || errorText;
    } catch {
      // keep raw text
    }
    throw new Error(`Grok API error: ${detail}`);
  }

  return response.json();
};
