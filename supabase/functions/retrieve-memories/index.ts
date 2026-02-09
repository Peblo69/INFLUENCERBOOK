// ============================================
// SMART MEMORY RETRIEVAL EDGE FUNCTION
// Combines keyword + semantic search with cooldown
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://fonzxpqtsdfhvlyvqjru.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MemoryRetrievalRequest {
  userMessage: string;
  maxMemories?: number;
  cooldownHours?: number;
  useSemanticSearch?: boolean;
}

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  category: string;
  importance: number;
  similarity?: number;
  relevance?: number;
  last_accessed: string;
  access_count: number;
  metadata?: Record<string, unknown> | null;
}

interface ProfileMemorySections {
  likes: string[];
  dislikes: string[];
  goals: string[];
  capabilities: string[];
  tone: string[];
}

const toObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const normalizeStringList = (value: unknown, limit = 8): string[] => {
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

const getProfileSections = (preferences: unknown): ProfileMemorySections => {
  const pref = toObject(preferences);
  const profileMemory = toObject(pref.memory_profile);
  return {
    likes: normalizeStringList(profileMemory.likes, 8),
    dislikes: normalizeStringList(profileMemory.dislikes, 8),
    goals: normalizeStringList(profileMemory.goals, 8),
    capabilities: normalizeStringList(profileMemory.capabilities, 8),
    tone: normalizeStringList(profileMemory.tone, 8),
  };
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const getMemoryConfidence = (memory: Memory): number => {
  const metadata = toObject(memory.metadata);
  if (typeof metadata.confidence === "number") {
    return clamp01(metadata.confidence);
  }
  return clamp01(memory.importance ?? 0.6);
};

const getSelectionReason = (memory: Memory, strategy: string): string => {
  if (strategy === "semantic" && typeof memory.similarity === "number") {
    return `semantic similarity ${memory.similarity.toFixed(3)}`;
  }
  if (strategy === "keyword" && typeof memory.relevance === "number") {
    return `keyword relevance ${memory.relevance.toFixed(3)}`;
  }
  if (strategy === "fallback") {
    return `fallback by importance ${Number(memory.importance ?? 0).toFixed(2)}`;
  }
  return "selected by ranking";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;
    const {
      userMessage,
      maxMemories = 8,
      cooldownHours = 24,
      useSemanticSearch = true,
    }: MemoryRetrievalRequest = await req.json();

    if (!userMessage || userMessage.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "userMessage is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", userId)
      .maybeSingle();

    const preferences = toObject(profile?.preferences);
    const profileSections = getProfileSections(preferences);

    if (preferences.memory_enabled === false) {
      return new Response(
        JSON.stringify({
          success: true,
          memories: [],
          count: 0,
          search_strategy: "disabled",
          profile_sections: profileSections,
          tone_hints: profileSections.tone.slice(0, 4),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let retrievedMemories: Memory[] = [];
    let searchStrategy = "none";

    // Strategy 1: keyword search
    try {
      const { data: keywordMemories, error: keywordError } = await supabase.rpc(
        "search_memories_keyword",
        {
          query_text: userMessage,
          query_user_id: userId,
          match_count: maxMemories,
          cooldown_hours: cooldownHours,
        },
      );

      if (!keywordError && Array.isArray(keywordMemories) && keywordMemories.length > 0) {
        retrievedMemories = keywordMemories;
        searchStrategy = "keyword";
      }
    } catch (error) {
      console.error("[retrieve-memories] Keyword search failed:", error);
    }

    // Strategy 2: semantic search
    if (retrievedMemories.length === 0 && useSemanticSearch) {
      try {
        const embeddingResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-embedding`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            ...(Deno.env.get("SUPABASE_ANON_KEY")
              ? { apikey: Deno.env.get("SUPABASE_ANON_KEY") as string }
              : {}),
          },
          body: JSON.stringify({ text: userMessage }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData?.embedding;

          if (Array.isArray(embedding) && embedding.length > 0) {
            const { data: semanticMemories, error: semanticError } = await supabase.rpc(
              "search_memories_semantic",
              {
                query_embedding: embedding,
                query_user_id: userId,
                match_threshold: 0.7,
                match_count: maxMemories,
                cooldown_hours: cooldownHours,
              },
            );

            if (!semanticError && Array.isArray(semanticMemories) && semanticMemories.length > 0) {
              retrievedMemories = semanticMemories;
              searchStrategy = "semantic";
            }
          }
        }
      } catch (error) {
        console.error("[retrieve-memories] Semantic search failed:", error);
      }
    }

    // Strategy 3: fallback
    if (retrievedMemories.length === 0) {
      try {
        const { data: fallbackMemories, error: fallbackError } = await supabase
          .from("memories")
          .select("id, content, memory_type, category, importance, last_accessed, access_count")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("importance", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(Math.min(3, maxMemories));

        if (!fallbackError && Array.isArray(fallbackMemories)) {
          retrievedMemories = fallbackMemories;
          searchStrategy = "fallback";
        }
      } catch (error) {
        console.error("[retrieve-memories] Fallback failed:", error);
      }
    }

    const balancedMemories = balanceMemoryTypes(retrievedMemories, maxMemories);

    const memoryIds = balancedMemories.map((m) => m.id);
    for (const memoryId of memoryIds) {
      await supabase.rpc("mark_memory_accessed", { memory_id: memoryId });
    }

    const metadataMap = new Map<string, Record<string, unknown>>();
    if (memoryIds.length > 0) {
      const { data: metadataRows } = await supabase
        .from("memories")
        .select("id, metadata")
        .in("id", memoryIds);

      for (const row of metadataRows || []) {
        metadataMap.set(row.id, toObject(row.metadata));
      }
    }

    const formattedMemories = balancedMemories.map((m) => {
      const memoryWithMetadata: Memory = {
        ...m,
        metadata: metadataMap.get(m.id) ?? m.metadata ?? null,
      };
      const confidence = getMemoryConfidence(memoryWithMetadata);
      const reason = getSelectionReason(memoryWithMetadata, searchStrategy);

      return {
        id: m.id,
        type: m.memory_type,
        category: m.category,
        content: m.content,
        importance: m.importance,
        confidence,
        reason,
        similarity: typeof m.similarity === "number" ? m.similarity : undefined,
        relevance: typeof m.relevance === "number" ? m.relevance : undefined,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        memories: formattedMemories,
        count: formattedMemories.length,
        search_strategy: searchStrategy,
        profile_sections: profileSections,
        tone_hints: profileSections.tone.slice(0, 4),
        debug: {
          strategy: searchStrategy,
          selected_count: formattedMemories.length,
          memories: formattedMemories,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[retrieve-memories] Fatal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function balanceMemoryTypes(memories: Memory[], maxCount: number): Memory[] {
  if (memories.length <= maxCount) return memories;

  const typeCount: Record<string, number> = {};
  const maxPerType = 3;
  const result: Memory[] = [];

  for (const memory of memories) {
    const type = memory.memory_type || "other";
    if ((typeCount[type] || 0) >= maxPerType) continue;

    result.push(memory);
    typeCount[type] = (typeCount[type] || 0) + 1;
    if (result.length >= maxCount) break;
  }

  return result;
}
