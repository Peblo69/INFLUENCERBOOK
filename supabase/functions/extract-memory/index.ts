// ============================================
// MEMORY EXTRACTION EDGE FUNCTION
// Uses Grok to extract memories from conversations
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROK_API_KEY = Deno.env.get('GROK_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
// Supabase automatically provides these - use built-in env vars
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://fonzxpqtsdfhvlyvqjru.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface MemoryExtractionRequest {
  userId: string;
  conversationId: string;
  messages?: Array<{ role: string; content: string }>;
}

interface ExtractedMemory {
  content: string;
  memory_type: string;
  category: string;
  importance: number;
}

interface MemoryUpdate {
  old_content: string;
  new_content: string;
  category: string;
  importance: number;
}

interface Pattern {
  trigger: string;
  behavior: string;
  frequency: number;
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
    const { userId, conversationId, messages }: MemoryExtractionRequest = await req.json();

    if (!userId || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'userId and conversationId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🧠 Extracting memories for user ${userId} from conversation ${conversationId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch conversation messages if not provided
    let conversationMessages = messages;
    if (!conversationMessages) {
      const { data, error } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      conversationMessages = data || [];
    }

    if (conversationMessages.length === 0) {
      console.log('No messages to extract from');
      return new Response(
        JSON.stringify({ success: true, memories_created: 0, memories_updated: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation text
    const conversationText = conversationMessages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    // Extract memories using Grok
    const extractionPrompt = `You are a memory extraction specialist. Analyze this conversation and extract important, lasting memories about the user.

CRITICAL RULES - EXTRACT THESE ALWAYS:
1. **USER'S NAME** - If they say "I'm [name]", "My name is [name]", "Call me [name]" → ALWAYS extract as fact with importance 0.95
2. **PREFERENCES** - Any stated likes/dislikes, communication style, visual aesthetics
3. **PROJECTS** - If they mention what they're working on or building
4. **HABITS** - Recurring patterns in behavior or requests
5. **PERSONAL INFO** - Job, location, possessions (only if explicitly mentioned)
6. **IDENTITY** - How they describe themselves

DO NOT EXTRACT:
- Generic greetings ("hey", "hello", "what's up")
- Single-word responses ("yes", "no", "ok")
- Questions about capabilities unless repeated

MEMORY UPDATES:
If user mentions CHANGING something (sold car, switched job, new preference):
  - Use "updates" array with old_content and new_content
  - Example: "I sold my CLA45 and got a Panamera" → updates array

Conversation:
${conversationText}

Return JSON with this EXACT structure (empty arrays are OK if nothing to extract):
{
  "facts": [
    {"content": "User's name is Jovani", "category": "personal_info", "importance": 0.95, "memory_type": "fact"}
  ],
  "updates": [],
  "patterns": []
}

IMPORTANT:
- Return ONLY valid JSON
- If user stated their name, YOU MUST extract it
- Even short conversations can have important facts (like names)
- NO markdown, NO explanations, JUST JSON`;

    console.log('Calling Grok for memory extraction...');

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast',
        messages: [{ role: 'user', content: extractionPrompt }],
        temperature: 0.3, // Low temperature for consistent extraction
        response_format: { type: 'json_object' },
      }),
    });

    if (!grokResponse.ok) {
      const error = await grokResponse.text();
      console.error('Grok API error:', error);
      throw new Error(`Grok API failed: ${error}`);
    }

    const grokData = await grokResponse.json();
    const extractedDataText = grokData.choices[0].message.content;

    console.log('📝 Grok raw extraction response:', extractedDataText);

    const extractedData = JSON.parse(extractedDataText);
    const { facts = [], updates = [], patterns = [] } = extractedData;

    console.log(`📊 Extraction results: ${facts.length} facts, ${updates.length} updates, ${patterns.length} patterns`);
    if (facts.length > 0) {
      console.log('   Facts:', facts.map(f => f.content).join(', '));
    }

    // 🔧 ENSURE USER PROFILE EXISTS (fix foreign key constraint)
    console.log('🔍 Checking if user profile exists...');
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // If profile doesn't exist (no data OR "no rows" error), create it
    if (!existingProfile || profileCheckError?.code === 'PGRST116') {
      console.log('⚠️ User profile not found, creating one...');
      const { error: profileCreateError } = await supabase.from('profiles').insert({
        id: userId,
        credits: 100,
        plan: 'free'
      });

      if (profileCreateError) {
        console.error('❌ Error creating profile:', profileCreateError);
        console.error('   Details:', JSON.stringify(profileCreateError, null, 2));
        // Continue anyway - the profile might exist but query failed
      } else {
        console.log('✅ User profile created successfully');
      }
    } else if (profileCheckError) {
      console.error('⚠️ Error checking profile (but continuing):', profileCheckError);
    } else {
      console.log('✅ User profile exists');
    }

    let memoriesCreated = 0;
    let memoriesUpdated = 0;

    // Helper function to generate embeddings
    async function generateEmbedding(text: string): Promise<number[]> {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-embedding`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate embedding');
      }

      const data = await response.json();
      return data.embedding;
    }

    // Process new facts
    for (const fact of facts) {
      try {
        console.log(`🔧 Processing fact: "${fact.content}"`);

        console.log('  → Generating embedding...');
        const embedding = await generateEmbedding(fact.content);
        console.log(`  ✓ Embedding generated (${embedding.length} dimensions)`);

        // Check for duplicates using semantic similarity
        console.log('  → Checking for duplicates...');
        const { data: similar, error: similarError } = await supabase.rpc('search_memories_semantic', {
          query_embedding: embedding,
          query_user_id: userId,
          match_threshold: 0.92, // Very high threshold for duplicates
          match_count: 1,
          cooldown_hours: 0, // Ignore cooldown for duplicate check
        });

        if (similarError) {
          console.error('  ❌ Duplicate check error:', similarError);
        }

        if (similar && similar.length > 0) {
          console.log(`  ⏭️ Skipping duplicate memory: "${fact.content}"`);
          continue;
        }

        console.log('  → No duplicates, inserting memory...');

        // Insert new memory
        // conversation_id must be a valid UUID or null
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);

        const { error: insertError } = await supabase.from('memories').insert({
          user_id: userId,
          conversation_id: isValidUuid ? conversationId : null, // Use null if not a valid UUID
          content: fact.content,
          memory_type: fact.memory_type || 'fact',
          category: fact.category,
          importance: fact.importance || 0.7,
          embedding: embedding,
          is_active: true,
        });

        if (insertError) {
          console.error('  ❌ Error inserting memory:', insertError);
          console.error('     Details:', JSON.stringify(insertError, null, 2));
        } else {
          memoriesCreated++;
          console.log(`  ✅ Created memory: "${fact.content}"`);
        }
      } catch (error) {
        console.error('❌ Error processing fact:', error);
        console.error('   Error details:', error instanceof Error ? error.message : String(error));
      }
    }

    // Process memory updates (CRITICAL!)
    for (const update of updates) {
      try {
        const oldEmbedding = await generateEmbedding(update.old_content);

        // Find similar old memory
        const { data: similar } = await supabase.rpc('search_memories_semantic', {
          query_embedding: oldEmbedding,
          query_user_id: userId,
          match_threshold: 0.85,
          match_count: 1,
          cooldown_hours: 0,
        });

        if (similar && similar.length > 0) {
          const oldMemoryId = similar[0].id;

          // Deactivate old memory (don't delete - keep history)
          await supabase
            .from('memories')
            .update({ is_active: false })
            .eq('id', oldMemoryId);

          console.log(`🔄 Deactivated old memory: "${update.old_content}"`);
        }

        // Insert new memory
        const newEmbedding = await generateEmbedding(update.new_content);
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);

        const { error } = await supabase.from('memories').insert({
          user_id: userId,
          conversation_id: isValidUuid ? conversationId : null,
          content: update.new_content,
          memory_type: 'fact',
          category: update.category,
          importance: update.importance || 0.8,
          embedding: newEmbedding,
          is_active: true,
          replaced_by: similar && similar.length > 0 ? similar[0].id : null,
        });

        if (error) {
          console.error('Error inserting updated memory:', error);
        } else {
          memoriesUpdated++;
          console.log(`✅ Updated memory: "${update.new_content}"`);
        }
      } catch (error) {
        console.error('Error processing update:', error);
      }
    }

    // Process patterns as habits
    for (const pattern of patterns) {
      try {
        const content = `${pattern.trigger}: ${pattern.behavior}`;
        const embedding = await generateEmbedding(content);

        // Check for duplicate patterns
        const { data: similar } = await supabase.rpc('search_memories_semantic', {
          query_embedding: embedding,
          query_user_id: userId,
          match_threshold: 0.90,
          match_count: 1,
          cooldown_hours: 0,
        });

        if (similar && similar.length > 0) {
          // Update frequency of existing pattern
          await supabase
            .from('memories')
            .update({
              metadata: { frequency: pattern.frequency },
              importance: Math.min(0.9, 0.6 + (pattern.frequency * 0.05)), // Higher importance for frequent patterns
            })
            .eq('id', similar[0].id);

          console.log(`🔄 Updated pattern frequency: "${content}"`);
        } else {
          // Insert new pattern
          const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);

          const { error } = await supabase.from('memories').insert({
            user_id: userId,
            conversation_id: isValidUuid ? conversationId : null,
            content: content,
            memory_type: 'habit',
            category: 'behavior_pattern',
            importance: Math.min(0.9, 0.6 + (pattern.frequency * 0.05)),
            embedding: embedding,
            metadata: { frequency: pattern.frequency, trigger: pattern.trigger },
            is_active: true,
          });

          if (!error) {
            memoriesCreated++;
            console.log(`✅ Created pattern: "${content}"`);
          }
        }
      } catch (error) {
        console.error('Error processing pattern:', error);
      }
    }

    console.log(`🎉 Memory extraction complete: ${memoriesCreated} created, ${memoriesUpdated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        memories_created: memoriesCreated,
        memories_updated: memoriesUpdated,
        total_facts: facts.length,
        total_updates: updates.length,
        total_patterns: patterns.length,
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
    console.error('Error extracting memories:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
