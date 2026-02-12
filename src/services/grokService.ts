import { supabase } from "@/lib/supabase";
import { getKiaraBaseUrl } from "@/services/kiaraClient";
import type { GrokMessage, GrokMessageContent, GrokTool, GrokToolChoice } from "@/lib/grok";
import { KIARA_VISION_TOOLS } from "@/lib/kiaraTools";
import { executeToolCalls, type ToolExecutionContext, type ToolExecutionResult } from "@/lib/kiaraToolExecutor";
import { getContextForAI, type KnowledgeIntent } from "@/services/knowledgeService";
import { getTrendContext } from "@/services/trendService";
import { buildModelKnowledgePrompt } from "@/lib/kiaraModelKnowledge";

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
  conversationId?: string | null;
  memoryEnabled?: boolean;
  memoryDebug?: boolean;
  webSearchEnabled?: boolean;
  knowledgeBaseEnabled?: boolean;
  trendContextEnabled?: boolean;
  customInstructions?: string;
  historyTokenBudget?: number;
  webSearchMode?: "off" | "on" | "auto";
  webSearchMaxResults?: number;
  webSearchSources?: Array<"web" | "news" | "x">;
  apiMode?: "chat" | "responses";
  previousResponseId?: string;
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
  onMeta?: (meta: GrokStreamMeta) => void;
}

export interface GrokMemoryTelemetryItem {
  id?: string;
  type?: string;
  category?: string;
  content?: string;
  importance?: number;
  confidence?: number;
  reason?: string;
}

export interface GrokMemoryTelemetry {
  enabled: boolean;
  strategy: string;
  retrievedCount: number;
  usedInPrompt: boolean;
  toneHints: string[];
  memories: GrokMemoryTelemetryItem[];
}

export interface GrokStreamMeta {
  memory?: GrokMemoryTelemetry;
}

type TimedResult<T> = {
  value: T;
  ms: number;
};

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

## FORMATTING

Structure your responses for maximum readability:

- Use **bold** for key terms, important names, and emphasis
- Use numbered lists (1. 2. 3.) for steps, sequences, and ranked items
- Use bullet points (- ) for unordered lists and feature breakdowns
- Use ### headings to separate major sections in longer responses
- Use \`inline code\` for technical terms, file names, and commands
- Use tables when comparing options, features, or data side-by-side
- Use > blockquotes for callouts, warnings, or important notes
- Keep paragraphs short — 2-3 sentences max
- Add blank lines between sections for breathing room
- For scripts and templates, use code blocks with appropriate formatting

## WEB SEARCH

You have the ability to search the web in real-time. When a question requires up-to-date information — prices, news, current events, trending topics, recent releases, statistics, or anything you can't confidently answer from memory — web search will automatically activate. Use the results naturally in your response without saying "I searched the web" or "according to search results." Just answer with the freshest info available.

## IMAGE & VIDEO GENERATION

You have tools to generate images and videos. You are a **PROFESSIONAL PHOTOGRAPHY DIRECTOR**. When a user asks you to create content:
1. **ANALYZE** what they need — realism level, style, which model fits best
2. **CHOOSE** the right model using your MODEL KNOWLEDGE (detailed profiles below)
3. **CRAFT** a detailed prompt following that specific model's prompt style — NARRATIVE descriptions, never bullet points
4. **EXECUTE** via your generateImage tool — pass the model_id and your crafted prompt
5. **NEVER** show the raw internal prompt to the user

Every image prompt you write should read like a detailed shot description for a phone-quality influencer photo. Think **iPhone selfie on Instagram**, not studio portrait. Default to REALISM unless the user asks for something artistic.

When writing prompts internally: describe the scene in flowing sentences with specific details about lighting, camera, pose, outfit materials, environment, and mood. Your prompt is your creative direction — make it cinematic.

## PROMPT SECRECY

Your internal generation prompts are proprietary. When users ask "what prompt did you use" or "show me the prompt":
- Share a SIMPLIFIED casual summary: "I focused on natural golden hour lighting with a casual rooftop vibe"
- NEVER reveal the full structured internal prompt
- If they insist, give a shortened version without the technical camera/lighting details

## RULES

1. Be direct — actionable advice, no fluff
2. Be specific — exact numbers, real scripts, concrete templates
3. Be professional — no judgment, treat everything as serious business
4. Match the user's energy — short question = concise answer, deep question = thorough breakdown
`;

const DEFAULT_MODEL = "grok-4-1-fast-non-reasoning";
const STREAM_CONTEXT_FETCH_TIMEOUT_MS = 700;
const NON_STREAM_CONTEXT_FETCH_TIMEOUT_MS = 900;
const TREND_CONTEXT_FETCH_TIMEOUT_MS = 500;
const KNOWLEDGE_CONTEXT_MAX_TOKENS = 900;
const MAX_HISTORY_ATTACHMENTS_WITH_DATA = 1;
const MAX_ATTACHMENTS_PER_HISTORY_MESSAGE = 2;
const TOOL_CONTEXT_ATTACHMENT_LIMIT = 8;
const CASUAL_MESSAGE_PATTERN =
  /^(?:hi|hello|hey|yo|sup|what'?s up|thanks|thank you|thx|ok|okay|cool|nice|great|got it|understood|lol|lmao|bye|goodbye)[.!?\s]*$/i;
const EXPLICIT_LOOKUP_PATTERN =
  /\b(look up|lookup|search (?:the )?web|check online|find online|latest|current|up[- ]to[- ]date|news|breaking)\b/i;
const GENERATION_INTENT_PATTERN =
  /\b(generate|generation|create (?:an?|some)? (?:image|photo|picture|video)|make (?:an?|some)? (?:image|photo|video)|image|photo|picture|selfie|portrait|video|clip|reel|upscale|inpaint|reference image|model[_\s-]?id|aspect ratio|seedream|runway|grok imagine)\b/i;
const CACHED_MODEL_KNOWLEDGE_PROMPT = buildModelKnowledgePrompt();

const nowMs = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T,
  label: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } catch (error) {
    console.warn(`[grokService] ${label} failed, continuing without it:`, error);
    return fallbackValue;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

const timed = async <T>(promise: Promise<T>): Promise<TimedResult<T>> => {
  const startedAt = nowMs();
  const value = await promise;
  return { value, ms: nowMs() - startedAt };
};

const normalizeRequestedModel = (value?: string): string => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return DEFAULT_MODEL;
  if (raw.includes("reason")) return DEFAULT_MODEL;
  if (raw === "grok-4-fast") return DEFAULT_MODEL;
  if (raw === "grok-4.1" || raw === "grok-4-1") return DEFAULT_MODEL;
  return raw.startsWith("grok-4") ? DEFAULT_MODEL : DEFAULT_MODEL;
};

const shouldFetchKnowledgeContext = (
  message: string,
  attachmentCount: number
): boolean => {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (attachmentCount > 0) return true;
  if (CASUAL_MESSAGE_PATTERN.test(trimmed)) return false;
  if (trimmed.length < 18) return false;
  if (EXPLICIT_LOOKUP_PATTERN.test(trimmed)) return true;
  if (GENERATION_INTENT_PATTERN.test(trimmed)) return true;
  if (trimmed.includes("?")) return true;
  if (/\b(how|what|why|when|where|help|strategy|plan|steps|guide|tips|ideas)\b/i.test(trimmed)) {
    return true;
  }
  return false;
};

const shouldInjectModelKnowledge = (
  message: string,
  attachmentCount: number
): boolean => {
  if (attachmentCount > 0) return true;
  return GENERATION_INTENT_PATTERN.test(message);
};

const inferKnowledgeIntentForMessage = (
  message: string,
  attachmentCount: number
): KnowledgeIntent | "auto" => {
  const normalized = String(message || "").toLowerCase();
  if (attachmentCount > 0 || GENERATION_INTENT_PATTERN.test(normalized)) {
    return "generation";
  }
  if (/\b(growth|monetization|revenue|pricing|conversion|traffic|engagement|strategy|funnel|sales)\b/i.test(normalized)) {
    return "growth";
  }
  if (/\b(tiktok|instagram|onlyfans|reddit|youtube|threads|platform|algorithm|policy)\b/i.test(normalized)) {
    return "platform";
  }
  if (shouldAutoEnableWebSearch(normalized) || EXPLICIT_LOOKUP_PATTERN.test(normalized)) {
    return "research";
  }
  return "general";
};

const compactHistoryForRequest = (
  history: GrokChatHistoryMessage[]
): GrokChatHistoryMessage[] => {
  if (!history.length) return [];

  const cloned = history.map((message) => ({
    ...message,
    attachments: message.attachments ? [...message.attachments] : undefined,
  }));

  let remainingAttachmentMessages = MAX_HISTORY_ATTACHMENTS_WITH_DATA;
  for (let i = cloned.length - 1; i >= 0; i -= 1) {
    const attachments = cloned[i].attachments;
    if (!attachments || attachments.length === 0) continue;

    if (remainingAttachmentMessages <= 0) {
      cloned[i].attachments = undefined;
      continue;
    }

    cloned[i].attachments = attachments.slice(-MAX_ATTACHMENTS_PER_HISTORY_MESSAGE);
    remainingAttachmentMessages -= 1;
  }

  return cloned;
};
/**
 * Smart web search auto-trigger.
 * Goal: search when the AI genuinely can't answer without real-time info,
 * but NEVER for casual conversation ("hey how are you", "thanks", etc.)
 *
 * Categories covered:
 * 1. Time-sensitive keywords (latest, today, current, recent, now, this week/month/year)
 * 2. News & events (news, breaking, happened, update, announcement)
 * 3. Trending / viral content (trending, viral, trend, popular right now)
 * 4. Prices & finance (price, cost, worth, stock, crypto, bitcoin, ethereum, market)
 * 5. Sports & scores (score, standings, match, game result, tournament)
 * 6. Weather & real-time data (weather, forecast, temperature)
 * 7. Factual lookups likely outdated (who is, what is __, how much, how many, when did, when does, when is, where is)
 * 8. Release & availability (release date, coming out, available, launched, drops)
 * 9. Statistics & data (stats, statistics, data, numbers, rate, percentage)
 * 10. Specific year/date references (2025, 2026, yesterday, last week, this morning)
 */
const WEB_SEARCH_PATTERNS: RegExp[] = [
  // Time-sensitive
  /\b(latest|today|right now|current(?:ly)?|recent(?:ly)?|this (?:week|month|year)|at the moment|as of)\b/i,
  // News & events
  /\b(news|breaking|what happened|update[ds]?|announcement|report(?:ed|s)?|headline|scandal|controversy)\b/i,
  // Trending
  /\b(trending|trend[s]?|viral|going viral|blowing up|popular right now|buzz)\b/i,
  // Prices & finance
  /\b(price[ds]?|cost[s]?|how much (?:does|is|are|do)|worth|stock|stocks|crypto|bitcoin|btc|ethereum|eth|market cap|valuation|salary|salaries|revenue)\b/i,
  // Sports
  /\b(score[ds]?|standings|match result|game result|tournament|championship|playoff|super bowl|world cup|who won)\b/i,
  // Weather
  /\b(weather|forecast|temperature|rain(?:ing)?|snow(?:ing)?|hurricane|storm)\b/i,
  // Release & availability
  /\b(release date|coming out|when (?:does|will) .+ (?:come|launch|release|drop)|just launched|just released|new version|v\d)\b/i,
  // Statistics & data
  /\b(statistics|stats|data|growth rate|percentage|number of|how many|population|rate of)\b/i,
  // Date references suggesting real-time need
  /\b(20(?:2[5-9]|3\d)|yesterday|last (?:week|month|night)|this morning|earlier today|just now)\b/i,
  // Social media specific (relevant for this platform)
  /\b(follower count|subscriber count|views|engagement rate|algorithm change|platform update|tiktok|instagram|youtube|twitter|x\.com|threads)\b.*\b(new|change|update|now|2026|latest)/i,
];

const shouldAutoEnableWebSearch = (message: string): boolean => {
  const trimmed = message.trim();
  if (trimmed.length < 14) return false;
  if (CASUAL_MESSAGE_PATTERN.test(trimmed)) return false;
  if (EXPLICIT_LOOKUP_PATTERN.test(trimmed)) return true;

  return WEB_SEARCH_PATTERNS.some((re) => re.test(trimmed));
};

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

const decodeBase64Json = <T>(raw: string): T | null => {
  try {
    const binary = atob(raw);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

const estimateMessageTokens = (message: GrokChatHistoryMessage): number => {
  const textTokens = estimateTokens(message.content || "");
  const attachmentTokens = (message.attachments?.length || 0) * 1400;
  return textTokens + attachmentTokens + 16;
};

const trimHistoryByBudget = (
  history: GrokChatHistoryMessage[],
  tokenBudget: number
): GrokChatHistoryMessage[] => {
  if (!history.length || tokenBudget <= 0) return [];

  const cappedHistory = history.slice(-80);
  const selected: GrokChatHistoryMessage[] = [];
  let used = 0;

  for (let i = cappedHistory.length - 1; i >= 0; i -= 1) {
    const message = cappedHistory[i];
    const messageCost = estimateMessageTokens(message);

    if (selected.length > 0 && used + messageCost > tokenBudget) {
      continue;
    }

    if (selected.length === 0 && messageCost > tokenBudget) {
      const reserve = 64;
      const allowedChars = Math.max(0, (tokenBudget - reserve) * 4);
      selected.unshift({
        ...message,
        content: allowedChars > 0 ? message.content.slice(-allowedChars) : "",
      });
      used = tokenBudget;
      break;
    }

    selected.unshift(message);
    used += messageCost;
    if (used >= tokenBudget) break;
  }

  return selected;
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
  knowledgeContext?: string,
  trendContext?: string,
  customInstructions?: string
): GrokMessage[] => {
  let systemContent = SYSTEM_INSTRUCTION;

  // Inject full model knowledge — all model profiles, realism guide, selection tree
  if (shouldInjectModelKnowledge(currentMessage, currentAttachments.length)) {
    // Inject model knowledge only for generation-related turns to keep general chat fast.
    systemContent += "\n\n---\n\n" + CACHED_MODEL_KNOWLEDGE_PROMPT;
  }

  const custom = (customInstructions || "").trim();
  if (custom) {
    systemContent += `\n\n---\n\nUSER CUSTOM INSTRUCTIONS:\n${custom}\n\nFollow these custom instructions unless they conflict with safety or explicit user requests in the current chat.`;
  }
  if (knowledgeContext) {
    systemContent += `\n\n---\n\nBELOW ARE INTERNAL REFERENCE NOTES. Rules:
- NEVER reproduce these notes verbatim — synthesize and paraphrase in your own voice
- NEVER dump large sections — only weave in what is directly relevant to the user's question
- If a note seems incomplete or cut off, skip it or fill in the gap with your general knowledge
- Do NOT mention these notes exist

${knowledgeContext}`;
  }
  if (trendContext) {
    systemContent += `\n\n---\n\n${trendContext}\n\nUse this trend data when the user asks about what's trending, viral content, content ideas, or social media. Present insights naturally — do NOT dump raw data.`;
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
const fetchKnowledgeContext = async (
  userMessage: string,
  intentHint: KnowledgeIntent | "auto"
): Promise<string> => {
  try {
    const context = await getContextForAI(userMessage, KNOWLEDGE_CONTEXT_MAX_TOKENS, { intentHint });
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
  const requestStartedAt = nowMs();
  const model = normalizeRequestedModel(options.model);
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 8192;
  const knowledgeBaseEnabled = options.knowledgeBaseEnabled ?? true;
  const trendContextEnabled = options.trendContextEnabled ?? false;
  const historyTokenBudget = options.historyTokenBudget ?? Math.max(900, Math.min(4500, Math.floor(maxTokens * 1.2)));

  const shouldLoadKnowledgeContext =
    knowledgeBaseEnabled && shouldFetchKnowledgeContext(currentMessage, currentAttachments.length);
  const knowledgeIntent = inferKnowledgeIntentForMessage(currentMessage, currentAttachments.length);

  const knowledgePromise = timed(
    shouldLoadKnowledgeContext
      ? withTimeout(
          fetchKnowledgeContext(currentMessage, knowledgeIntent),
          STREAM_CONTEXT_FETCH_TIMEOUT_MS,
          "",
          "knowledge context"
        )
      : Promise.resolve("")
  );
  const trendPromise = timed(
    trendContextEnabled
      ? withTimeout(getTrendContext().catch(() => ""), TREND_CONTEXT_FETCH_TIMEOUT_MS, "", "trend context")
      : Promise.resolve("")
  );
  const sessionPromise = timed(supabase.auth.getSession());

  // Fetch optional contexts and auth session in parallel
  const [knowledgeResult, trendResult, sessionResult] = await Promise.all([
    knowledgePromise,
    trendPromise,
    sessionPromise,
  ]);
  const knowledgeContext = knowledgeResult.value;
  const trendContext = trendResult.value;
  const { data: { session } } = sessionResult.value;

  if (!session?.access_token) {
    callbacks.onError(new Error("Not authenticated"));
    return;
  }

  const contextOverhead =
    estimateTokens(currentMessage) +
    estimateTokens(options.customInstructions || "") +
    estimateTokens(knowledgeContext || "") +
    estimateTokens(trendContext || "") +
    256;
  const historyBudget = Math.max(0, historyTokenBudget - contextOverhead);
  const compactedHistory = compactHistoryForRequest(history);
  const trimmedHistory = trimHistoryByBudget(compactedHistory, historyBudget);
  const messages = buildMessages(
    trimmedHistory,
    currentMessage,
    currentAttachments,
    knowledgeContext,
    trendContext,
    options.customInstructions
  );
  const shouldUseWebSearch = options.webSearchEnabled ?? shouldAutoEnableWebSearch(currentMessage);
  console.info("[grokService] preflight timings (stream)", {
    knowledgeMs: Math.round(knowledgeResult.ms),
    trendMs: Math.round(trendResult.ms),
    authMs: Math.round(sessionResult.ms),
    webSearch: shouldUseWebSearch === true ? "on" : shouldUseWebSearch === false ? "off" : "auto",
  });

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
    resetStallTimer();
    const sendStreamRequest = async (webSearch: boolean | undefined) => {
      return postAssistantGateway(
        session.access_token,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
          conversation_id: options.conversationId ?? null,
          api_mode: options.apiMode,
          previous_response_id: options.previousResponseId,
          memory_enabled: options.memoryEnabled,
          memory_debug: options.memoryDebug,
          web_search: webSearch,
          web_search_mode: options.webSearchMode,
          web_search_max_results: options.webSearchMaxResults,
          web_search_sources: options.webSearchSources,
        },
        controller.signal
      );
    };

    const gatewayStartedAt = nowMs();
    let response = await sendStreamRequest(shouldUseWebSearch);
    let gatewayMs = nowMs() - gatewayStartedAt;
    if (!response.ok && shouldUseWebSearch === true) {
      const firstError = await response.text();
      console.warn("[grokService] Stream request failed with web search, retrying without web search:", firstError);
      const retryStartedAt = nowMs();
      response = await sendStreamRequest(false);
      gatewayMs += nowMs() - retryStartedAt;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[grokService] Error response:", errorText);
      clearStallTimer();
      callbacks.onError(new Error(`Grok API error: ${errorText}`));
      return;
    }
    const serverTiming = response.headers.get("x-kiara-server-timing");
    console.info("[grokService] gateway timings (stream)", {
      gatewayMs: Math.round(gatewayMs),
      serverTiming,
    });

    const metaPayload = response.headers.get("x-kiara-memory-debug");
    if (callbacks.onMeta) {
      const memoryMeta = metaPayload ? decodeBase64Json<GrokMemoryTelemetry>(metaPayload) : null;
      if (memoryMeta) {
        callbacks.onMeta({ memory: memoryMeta });
      } else {
        const strategy = response.headers.get("x-kiara-memory-strategy");
        const countRaw = response.headers.get("x-kiara-memory-count");
        const count = countRaw ? Number.parseInt(countRaw, 10) : 0;
        if (strategy) {
          callbacks.onMeta({
            memory: {
              enabled: strategy !== "disabled",
              strategy,
              retrievedCount: Number.isFinite(count) ? count : 0,
              usedInPrompt: Number.isFinite(count) ? count > 0 : false,
              toneHints: [],
              memories: [],
            },
          });
        }
      }
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
    console.log("[grokService] stream complete", {
      chunks: tokenChunkCount,
      chars: fullContent.length,
      totalMs: Math.round(nowMs() - requestStartedAt),
    });
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
  const requestStartedAt = nowMs();
  const tools = options.tools ?? (KIARA_VISION_TOOLS as unknown as GrokTool[]);
  const toolChoice = options.toolChoice ?? "auto";
  const model = normalizeRequestedModel(options.model);
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 8192;
  const knowledgeBaseEnabled = options.knowledgeBaseEnabled ?? true;
  const trendContextEnabled = options.trendContextEnabled ?? false;
  const historyTokenBudget = options.historyTokenBudget ?? Math.max(900, Math.min(4500, Math.floor(maxTokens * 1.2)));

  const shouldLoadKnowledgeContext =
    knowledgeBaseEnabled && shouldFetchKnowledgeContext(currentMessage, currentAttachments.length);
  const knowledgeIntent = inferKnowledgeIntentForMessage(currentMessage, currentAttachments.length);

  const [knowledgeResult, trendResult] = await Promise.all([
    timed(
      shouldLoadKnowledgeContext
        ? withTimeout(
            fetchKnowledgeContext(currentMessage, knowledgeIntent),
            NON_STREAM_CONTEXT_FETCH_TIMEOUT_MS,
            "",
            "knowledge context"
          )
        : Promise.resolve("")
    ),
    timed(
      trendContextEnabled
        ? withTimeout(getTrendContext().catch(() => ""), TREND_CONTEXT_FETCH_TIMEOUT_MS, "", "trend context")
        : Promise.resolve("")
    ),
  ]);
  const knowledgeContext = knowledgeResult.value;
  const trendCtx = trendResult.value;
  const shouldUseWebSearch = options.webSearchEnabled ?? shouldAutoEnableWebSearch(currentMessage);
  console.info("[grokService] preflight timings (non-stream)", {
    knowledgeMs: Math.round(knowledgeResult.ms),
    trendMs: Math.round(trendResult.ms),
    webSearch: shouldUseWebSearch === true ? "on" : shouldUseWebSearch === false ? "off" : "auto",
  });
  const contextOverhead =
    estimateTokens(currentMessage) +
    estimateTokens(options.customInstructions || "") +
    estimateTokens(knowledgeContext || "") +
    estimateTokens(trendCtx || "") +
    256;
  const historyBudget = Math.max(0, historyTokenBudget - contextOverhead);
  const compactedHistory = compactHistoryForRequest(history);
  const trimmedHistory = trimHistoryByBudget(compactedHistory, historyBudget);
  const messages = buildMessages(
    trimmedHistory,
    currentMessage,
    currentAttachments,
    knowledgeContext,
    trendCtx,
    options.customInstructions
  );
  const allAttachments = collectAttachments(trimmedHistory, currentAttachments);

  const toolContext: ToolExecutionContext = {
    uploadedFiles: allAttachments.map((att) => att.file!).filter(Boolean),
    previewUrls: allAttachments.map((att) => `data:${att.mimeType};base64,${att.data}`),
    generationHistory: [],
    generationSettings: options.generationSettings,
    setGenerationSettings: options.setGenerationSettings,
  };

  const requestWithFallback = async (body: Record<string, unknown>) => {
    try {
      return await grokRequest(body);
    } catch (error) {
      if (body.web_search === true) {
        console.warn("[grokService] Non-stream request failed with web search, retrying without web search:", error);
        const fallbackBody = { ...body, web_search: false };
        return grokRequest(fallbackBody);
      }
      throw error;
    }
  };

  const gatewayStartedAt = nowMs();
  let responseData = await requestWithFallback({
    model,
    messages,
    tools: tools.length ? tools : undefined,
    tool_choice: tools.length ? toolChoice : undefined,
    temperature,
    max_tokens: maxTokens,
    conversation_id: options.conversationId ?? null,
    api_mode: options.apiMode,
    previous_response_id: options.previousResponseId,
    memory_enabled: options.memoryEnabled,
    memory_debug: options.memoryDebug,
    web_search: shouldUseWebSearch,
    web_search_mode: options.webSearchMode,
    web_search_max_results: options.webSearchMaxResults,
    web_search_sources: options.webSearchSources,
  });
  console.info("[grokService] gateway timings (non-stream)", {
    gatewayMs: Math.round(nowMs() - gatewayStartedAt),
  });

  let assistantMessage = responseData?.choices?.[0]?.message as GrokMessage | undefined;
  let toolResults: ToolExecutionResult[] = [];
  let images: string[] = [];

  const MAX_TOOL_ROUNDS = 4;
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

    responseData = await requestWithFallback({
      model,
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? toolChoice : undefined,
      temperature,
      max_tokens: maxTokens,
      conversation_id: options.conversationId ?? null,
      api_mode: options.apiMode,
      previous_response_id: options.previousResponseId,
      memory_enabled: options.memoryEnabled,
      memory_debug: options.memoryDebug,
      web_search: shouldUseWebSearch,
      web_search_mode: options.webSearchMode,
      web_search_max_results: options.webSearchMaxResults,
      web_search_sources: options.webSearchSources,
    });

    assistantMessage = responseData?.choices?.[0]?.message as GrokMessage | undefined;
    rounds += 1;
  }

  console.info("[grokService] non-stream complete", {
    totalMs: Math.round(nowMs() - requestStartedAt),
  });

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
  return all.slice(-TOOL_CONTEXT_ATTACHMENT_LIMIT);
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

const postAssistantGateway = async (
  accessToken: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
) => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const baseUrl = getKiaraBaseUrl();

  const headers = {
    "Content-Type": "application/json",
    ...(anonKey ? { apikey: anonKey } : {}),
    Authorization: `Bearer ${accessToken}`,
  };

  const gatewayResponse = await fetch(`${baseUrl}/kiara-intelligence`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      route: "assistant",
      action: "chat",
      payload,
    }),
  });

  // Compatibility fallback if gateway is not deployed yet.
  if (gatewayResponse.status === 404) {
    return fetch(`${baseUrl}/kiara-grok`, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify(payload),
    });
  }

  if (gatewayResponse.status === 400 || gatewayResponse.status === 422) {
    const errorText = await gatewayResponse.clone().text().catch(() => "");
    if (/unsupported route|unsupported assistant action/i.test(errorText)) {
      return fetch(`${baseUrl}/kiara-grok`, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify(payload),
      });
    }
  }

  return gatewayResponse;
};

const grokRequest = async (body: Record<string, any>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await postAssistantGateway(session.access_token, body);

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
