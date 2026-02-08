// ============================================
// SMART MEMORY RETRIEVAL EDGE FUNCTION
// Combines keyword + semantic search with cooldown
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase automatically provides these - use built-in env vars
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://fonzxpqtsdfhvlyvqjru.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface MemoryRetrievalRequest {
  userId: string;
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const {
      userId,
      userMessage,
      maxMemories = 8,
      cooldownHours = 24,
      useSemanticSearch = true,
    }: MemoryRetrievalRequest = await req.json();

    if (!userId || !userMessage) {
      return new Response(
        JSON.stringify({ error: 'userId and userMessage are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🧠 Retrieving memories for user ${userId}`);
    console.log(`   Message: "${userMessage.substring(0, 100)}..."`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let retrievedMemories: Memory[] = [];
    let searchStrategy = 'none';

    // STRATEGY 1: Try keyword-based search first (fast!)
    try {
      console.log('📝 Trying keyword search...');
      const { data: keywordMemories, error: keywordError } = await supabase.rpc(
        'search_memories_keyword',
        {
          query_text: userMessage,
          query_user_id: userId,
          match_count: maxMemories,
          cooldown_hours: cooldownHours,
        }
      );

      if (!keywordError && keywordMemories && keywordMemories.length > 0) {
        retrievedMemories = keywordMemories;
        searchStrategy = 'keyword';
        console.log(`✅ Keyword search found ${keywordMemories.length} memories`);
      } else {
        console.log('⏭️ Keyword search found nothing, trying semantic search...');
      }
    } catch (error) {
      console.error('Keyword search failed:', error);
    }

    // STRATEGY 2: Fall back to semantic search if keyword found nothing
    if (retrievedMemories.length === 0 && useSemanticSearch) {
      try {
        console.log('🔍 Generating embedding for semantic search...');

        // Generate embedding for user message
        const embeddingResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-embedding`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: userMessage }),
        });

        if (!embeddingResponse.ok) {
          throw new Error('Failed to generate embedding');
        }

        const { embedding } = await embeddingResponse.json();

        console.log('🔍 Running semantic search...');
        const { data: semanticMemories, error: semanticError } = await supabase.rpc(
          'search_memories_semantic',
          {
            query_embedding: embedding,
            query_user_id: userId,
            match_threshold: 0.7,
            match_count: maxMemories,
            cooldown_hours: cooldownHours,
          }
        );

        if (!semanticError && semanticMemories && semanticMemories.length > 0) {
          retrievedMemories = semanticMemories;
          searchStrategy = 'semantic';
          console.log(`✅ Semantic search found ${semanticMemories.length} memories`);
        } else {
          console.log('⏭️ Semantic search found nothing');
        }
      } catch (error) {
        console.error('Semantic search failed:', error);
      }
    }

    // STRATEGY 3: If still nothing, get most important recent memories as fallback
    if (retrievedMemories.length === 0) {
      console.log('📊 Fallback: Getting most important recent memories...');
      try {
        const { data: fallbackMemories, error: fallbackError } = await supabase
          .from('memories')
          .select('id, content, memory_type, category, importance, last_accessed, access_count')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('importance', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(Math.min(3, maxMemories));

        if (!fallbackError && fallbackMemories) {
          retrievedMemories = fallbackMemories;
          searchStrategy = 'fallback';
          console.log(`✅ Fallback found ${fallbackMemories.length} memories`);
        }
      } catch (error) {
        console.error('Fallback search failed:', error);
      }
    }

    // Balance memory types (prevent all same type)
    const balancedMemories = balanceMemoryTypes(retrievedMemories, maxMemories);

    console.log(`🎯 Final selection: ${balancedMemories.length} memories (strategy: ${searchStrategy})`);

    // Mark memories as accessed (for cooldown tracking)
    const memoryIds = balancedMemories.map((m) => m.id);
    if (memoryIds.length > 0) {
      for (const memoryId of memoryIds) {
        await supabase.rpc('mark_memory_accessed', { memory_id: memoryId });
      }
      console.log(`✅ Marked ${memoryIds.length} memories as accessed`);
    }

    // Format memories for injection
    const formattedMemories = balancedMemories.map((m) => ({
      type: m.memory_type,
      category: m.category,
      content: m.content,
      importance: m.importance,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        memories: formattedMemories,
        count: formattedMemories.length,
        search_strategy: searchStrategy,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error retrieving memories:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function: Balance memory types to prevent all same type
function balanceMemoryTypes(memories: Memory[], maxCount: number): Memory[] {
  if (memories.length <= maxCount) {
    return memories;
  }

  const typeCount: Record<string, number> = {};
  const maxPerType = 3; // Max 3 memories of same type
  const result: Memory[] = [];

  for (const memory of memories) {
    const type = memory.memory_type || 'other';

    if ((typeCount[type] || 0) >= maxPerType) {
      continue; // Skip if this type is already maxed out
    }

    result.push(memory);
    typeCount[type] = (typeCount[type] || 0) + 1;

    if (result.length >= maxCount) {
      break;
    }
  }

  return result;
}

// Helper function: Extract keywords from text
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'this', 'that', 'these', 'those',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
}
