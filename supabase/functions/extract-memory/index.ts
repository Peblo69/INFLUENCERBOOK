// ============================================
// MEMORY EXTRACTION EDGE FUNCTION
// Extracts user memories from conversation turns
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GROK_API_KEY = Deno.env.get("GROK_API_KEY") ?? Deno.env.get("XAI_API_KEY") ?? "";
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

interface MemoryExtractionRequest {
  conversationId: string;
  messages?: Array<{ role: string; content: string }>;
}

interface FactMemory {
  content: string;
  memory_type?: string;
  category?: string;
  importance?: number;
}

interface MemoryUpdate {
  old_content: string;
  new_content: string;
  category?: string;
  importance?: number;
}

interface BehaviorPattern {
  trigger: string;
  behavior: string;
  frequency?: number;
}

interface SemanticMemoryMatch {
  id: string;
  content: string;
  similarity?: number;
}

interface ProfileMemorySections {
  likes: string[];
  dislikes: string[];
  goals: string[];
  capabilities: string[];
  tone: string[];
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const toObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const normalizeStringList = (value: unknown, limit = 12): string[] => {
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

const emptySections = (): ProfileMemorySections => ({
  likes: [],
  dislikes: [],
  goals: [],
  capabilities: [],
  tone: [],
});

const parseExtractionJson = (raw: string): Record<string, unknown> => {
  try {
    return toObject(JSON.parse(raw));
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return toObject(JSON.parse(raw.slice(start, end + 1)));
      } catch {
        return {};
      }
    }
    return {};
  }
};

const mergeUnique = (base: string[], incoming: string[], limit = 20): string[] => {
  const seen = new Set(base.map((v) => v.toLowerCase()));
  const output = [...base];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    output.push(item);
    seen.add(key);
    if (output.length >= limit) break;
  }
  return output;
};

const inferSectionFromCategory = (category: string): keyof ProfileMemorySections | null => {
  const c = category.toLowerCase();
  if (c.includes("like") || c.includes("preference")) return "likes";
  if (c.includes("dislike") || c.includes("avoid") || c.includes("hate")) return "dislikes";
  if (c.includes("goal") || c.includes("project") || c.includes("plan") || c.includes("objective")) return "goals";
  if (c.includes("skill") || c.includes("ability") || c.includes("capability") || c.includes("tool")) return "capabilities";
  if (c.includes("tone") || c.includes("style") || c.includes("communication")) return "tone";
  return null;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeMessageContent = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || typeof value === "undefined") return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

    const { conversationId, messages }: MemoryExtractionRequest = await req.json();
    if (!conversationId || !isUuid(conversationId)) {
      return new Response(
        JSON.stringify({ error: "Valid conversationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      throw new Error(`Failed to validate conversation: ${conversationError.message}`);
    }

    if (!conversation || conversation.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Conversation not found for user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();

    const currentPreferences = toObject(profile?.preferences);

    if (currentPreferences.memory_enabled === false) {
      return new Response(
        JSON.stringify({
          success: true,
          memories_created: 0,
          memories_updated: 0,
          skipped: "memory_disabled",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let conversationMessages = messages;
    if (!conversationMessages || conversationMessages.length === 0) {
      const { data, error } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      conversationMessages = (data || []).map((m) => ({
        role: m.role,
        content: normalizeMessageContent(m.content),
      }));
    }

    if (!conversationMessages.length) {
      return new Response(
        JSON.stringify({ success: true, memories_created: 0, memories_updated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const filteredConversation = conversationMessages
      .filter((m) => m.role === "user" && normalizeMessageContent(m.content).trim().length > 0)
      .map((m) => ({ role: m.role, content: normalizeMessageContent(m.content) }))
      .slice(-24);

    const conversationText = filteredConversation
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const extractionPrompt = `You are a memory extraction specialist.

Analyze this conversation and extract persistent user memory.

Extract:
1) hard facts (name, job, location, possessions)
2) preferences (likes/dislikes, communication style)
3) active projects and goals
4) recurring behavioral patterns
5) updates to old facts (new info replacing old info)

Rules:
- Ignore greetings and temporary small talk.
- Keep memory items short and precise.
- If user states their name, always extract it.
- Return only strict JSON.

Return this shape:
{
  "facts": [{"content":"...", "memory_type":"fact", "category":"...", "importance":0.8}],
  "updates": [{"old_content":"...", "new_content":"...", "category":"...", "importance":0.85}],
  "patterns": [{"trigger":"...", "behavior":"...", "frequency":2}],
  "preferences": {
    "likes": ["..."],
    "dislikes": ["..."],
    "goals": ["..."],
    "capabilities": ["..."],
    "tone": ["..."]
  }
}

Conversation:
${conversationText}`;

    if (!GROK_API_KEY) {
      throw new Error("GROK_API_KEY (or XAI_API_KEY) is not configured");
    }

    const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-fast",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!grokResponse.ok) {
      const errorBody = await grokResponse.text();
      throw new Error(`Extraction model error: ${errorBody}`);
    }

    const grokData = await grokResponse.json();
    const extractedRaw = String(grokData?.choices?.[0]?.message?.content || "{}");
    const extracted = parseExtractionJson(extractedRaw);

    const facts = Array.isArray(extracted.facts) ? (extracted.facts as FactMemory[]) : [];
    const updates = Array.isArray(extracted.updates) ? (extracted.updates as MemoryUpdate[]) : [];
    const patterns = Array.isArray(extracted.patterns) ? (extracted.patterns as BehaviorPattern[]) : [];
    const extractedPreferences = toObject(extracted.preferences);

    const generateEmbedding = async (text: string): Promise<number[]> => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-embedding`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          ...(Deno.env.get("SUPABASE_ANON_KEY")
            ? { apikey: Deno.env.get("SUPABASE_ANON_KEY") as string }
            : {}),
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate embedding");
      }
      const data = await response.json();
      return data.embedding || [];
    };

    let memoriesCreated = 0;
    let memoriesUpdated = 0;

    // New facts/preferences/context
    for (const fact of facts) {
      const content = (fact.content || "").trim();
      if (!content) continue;

      try {
        const embedding = await generateEmbedding(content);
        const confidence = clamp01(Number(fact.importance ?? 0.7));

        const { data: similar } = await supabase.rpc("search_memories_semantic", {
          query_embedding: embedding,
          query_user_id: user.id,
          match_threshold: 0.86,
          match_count: 1,
          cooldown_hours: 0,
        });

        const topSimilar = Array.isArray(similar) && similar.length > 0
          ? (similar[0] as SemanticMemoryMatch)
          : null;
        const normalizedContent = content.toLowerCase();

        if (topSimilar) {
          const similarity = typeof topSimilar.similarity === "number" ? topSimilar.similarity : 0;
          const previousContent = (topSimilar.content || "").trim();
          const normalizedPrevious = previousContent.toLowerCase();

          // Near-identical memory -> skip duplicate insert.
          if (normalizedPrevious === normalizedContent || similarity >= 0.965) {
            continue;
          }

          // High semantic overlap with different content -> treat as contradiction/update.
          if (similarity >= 0.86) {
            const { data: inserted, error: insertError } = await supabase
              .from("memories")
              .insert({
                user_id: user.id,
                conversation_id: conversationId,
                content,
                memory_type: fact.memory_type || "fact",
                category: fact.category || "general",
                importance: confidence,
                embedding,
                is_active: true,
                metadata: {
                  confidence,
                  extraction_source: "fact_contradiction_resolution",
                  contradicts_memory_id: topSimilar.id,
                },
              })
              .select("id")
              .single();

            if (!insertError && inserted?.id) {
              await supabase
                .from("memories")
                .update({ is_active: false, replaced_by: inserted.id })
                .eq("id", topSimilar.id);

              await supabase
                .from("memory_associations")
                .insert({
                  from_memory_id: topSimilar.id,
                  to_memory_id: inserted.id,
                  association_type: "contradicts",
                  strength: clamp01(Math.max(similarity, 0.86)),
                });

              memoriesUpdated += 1;
            }
            continue;
          }
        }

        const { error: insertError } = await supabase.from("memories").insert({
          user_id: user.id,
          conversation_id: conversationId,
          content,
          memory_type: fact.memory_type || "fact",
          category: fact.category || "general",
          importance: confidence,
          embedding,
          is_active: true,
          metadata: {
            confidence,
            extraction_source: "fact_extraction",
          },
        });

        if (!insertError) memoriesCreated += 1;
      } catch (error) {
        console.error("[extract-memory] Fact processing failed:", error);
      }
    }

    // Explicit updates (supersede old memory)
    for (const update of updates) {
      const oldContent = (update.old_content || "").trim();
      const newContent = (update.new_content || "").trim();
      if (!newContent) continue;

      try {
        let oldMemoryId: string | null = null;
        const confidence = clamp01(Number(update.importance ?? 0.8));

        if (oldContent) {
          const oldEmbedding = await generateEmbedding(oldContent);
          const { data: oldMatches } = await supabase.rpc("search_memories_semantic", {
            query_embedding: oldEmbedding,
            query_user_id: user.id,
            match_threshold: 0.85,
            match_count: 1,
            cooldown_hours: 0,
          });

          if (Array.isArray(oldMatches) && oldMatches.length > 0) {
            oldMemoryId = oldMatches[0].id;
          }
        }

        const newEmbedding = await generateEmbedding(newContent);
        const { data: inserted, error: insertError } = await supabase
          .from("memories")
          .insert({
            user_id: user.id,
            conversation_id: conversationId,
            content: newContent,
            memory_type: "fact",
            category: update.category || "general",
            importance: confidence,
            embedding: newEmbedding,
            is_active: true,
            metadata: {
              confidence,
              extraction_source: "explicit_update",
              previous_content: oldContent || null,
            },
          })
          .select("id")
          .single();

        if (!insertError && inserted?.id) {
          if (oldMemoryId) {
            await supabase
              .from("memories")
              .update({ is_active: false, replaced_by: inserted.id })
              .eq("id", oldMemoryId);

            await supabase
              .from("memory_associations")
              .insert({
                from_memory_id: oldMemoryId,
                to_memory_id: inserted.id,
                association_type: "contradicts",
                strength: 0.98,
              });
          }

          memoriesUpdated += 1;
        }
      } catch (error) {
        console.error("[extract-memory] Update processing failed:", error);
      }
    }

    // Behavior patterns as habits
    for (const pattern of patterns) {
      const trigger = (pattern.trigger || "").trim();
      const behavior = (pattern.behavior || "").trim();
      if (!trigger || !behavior) continue;

      const content = `${trigger}: ${behavior}`;
      try {
        const embedding = await generateEmbedding(content);

        const { data: similar } = await supabase.rpc("search_memories_semantic", {
          query_embedding: embedding,
          query_user_id: user.id,
          match_threshold: 0.9,
          match_count: 1,
          cooldown_hours: 0,
        });

        if (Array.isArray(similar) && similar.length > 0) {
          continue;
        }

        const frequency = Math.max(1, pattern.frequency ?? 1);
        const confidence = clamp01(Math.min(0.9, 0.6 + frequency * 0.05));
        const { error: insertError } = await supabase.from("memories").insert({
          user_id: user.id,
          conversation_id: conversationId,
          content,
          memory_type: "habit",
          category: "behavior_pattern",
          importance: confidence,
          embedding,
          metadata: {
            frequency,
            trigger,
            confidence,
            extraction_source: "behavior_pattern",
          },
          is_active: true,
        });

        if (!insertError) memoriesCreated += 1;
      } catch (error) {
        console.error("[extract-memory] Pattern processing failed:", error);
      }
    }

    const existingProfileMemory = toObject(currentPreferences.memory_profile);
    const currentSections = emptySections();
    currentSections.likes = normalizeStringList(existingProfileMemory.likes, 20);
    currentSections.dislikes = normalizeStringList(existingProfileMemory.dislikes, 20);
    currentSections.goals = normalizeStringList(existingProfileMemory.goals, 20);
    currentSections.capabilities = normalizeStringList(existingProfileMemory.capabilities, 20);
    currentSections.tone = normalizeStringList(existingProfileMemory.tone, 20);

    const inferred = emptySections();
    for (const fact of facts) {
      const content = (fact.content || "").trim();
      const section = inferSectionFromCategory((fact.category || "").trim());
      if (section && content) {
        inferred[section].push(content);
      }
    }
    for (const update of updates) {
      const content = (update.new_content || "").trim();
      const section = inferSectionFromCategory((update.category || "").trim());
      if (section && content) {
        inferred[section].push(content);
      }
    }
    for (const pattern of patterns) {
      const behavior = (pattern.behavior || "").trim();
      if (!behavior) continue;
      if (/(concise|brief|direct|formal|casual|friendly|technical|step[- ]by[- ]step|structured)/i.test(behavior)) {
        inferred.tone.push(behavior);
      }
    }

    const modelSections = emptySections();
    modelSections.likes = normalizeStringList(extractedPreferences.likes, 12);
    modelSections.dislikes = normalizeStringList(extractedPreferences.dislikes, 12);
    modelSections.goals = normalizeStringList(extractedPreferences.goals, 12);
    modelSections.capabilities = normalizeStringList(extractedPreferences.capabilities, 12);
    modelSections.tone = normalizeStringList(extractedPreferences.tone, 12);

    const nextSections = emptySections();
    nextSections.likes = mergeUnique(mergeUnique(currentSections.likes, modelSections.likes, 20), inferred.likes, 20);
    nextSections.dislikes = mergeUnique(
      mergeUnique(currentSections.dislikes, modelSections.dislikes, 20),
      inferred.dislikes,
      20,
    );
    nextSections.goals = mergeUnique(mergeUnique(currentSections.goals, modelSections.goals, 20), inferred.goals, 20);
    nextSections.capabilities = mergeUnique(
      mergeUnique(currentSections.capabilities, modelSections.capabilities, 20),
      inferred.capabilities,
      20,
    );
    nextSections.tone = mergeUnique(mergeUnique(currentSections.tone, modelSections.tone, 20), inferred.tone, 20);

    const profileSectionsUpdated = JSON.stringify(currentSections) !== JSON.stringify(nextSections);
    if (profileSectionsUpdated) {
      const mergedPreferences = {
        ...currentPreferences,
        memory_profile: {
          ...existingProfileMemory,
          ...nextSections,
          last_updated_at: new Date().toISOString(),
        },
      };

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ preferences: mergedPreferences })
        .eq("id", user.id);

      if (profileUpdateError) {
        console.error("[extract-memory] Profile memory update failed:", profileUpdateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        memories_created: memoriesCreated,
        memories_updated: memoriesUpdated,
        profile_sections_updated: profileSectionsUpdated,
        total_facts: facts.length,
        total_updates: updates.length,
        total_patterns: patterns.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[extract-memory] Fatal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
