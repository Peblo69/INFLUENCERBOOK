/**
 * RAG Pipeline End-to-End Test
 *
 * Tests: Cohere embeddings → Supabase vector search → Context formatting → Grok integration
 *
 * Run with: npx tsx scripts/test-rag-pipeline.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIG
// ============================================
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const COHERE_API_KEY = process.env.COHERE_API_KEY || '';
const XAI_API_KEY = process.env.XAI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPERS
// ============================================
const pass = (label: string) => console.log(`  ✅ ${label}`);
const fail = (label: string, err?: string) => {
  console.log(`  ❌ ${label}${err ? ` — ${err}` : ''}`);
  failures++;
};

let failures = 0;

// ============================================
// TEST 1: Database tables exist and have data
// ============================================
async function testDatabase() {
  console.log('\n🔍 TEST 1: Database Health\n');

  const { data: docs, error: docsErr } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true });
  if (docsErr) return fail('knowledge_documents table', docsErr.message);
  pass(`knowledge_documents table exists`);

  const { count: docCount } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed');
  if (!docCount || docCount === 0) return fail('No completed documents');
  pass(`${docCount} completed documents`);

  const { count: chunkCount } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true });
  if (!chunkCount || chunkCount === 0) return fail('No chunks');
  pass(`${chunkCount} chunks with embeddings`);

  // Verify embeddings exist (check one chunk)
  const { data: sampleChunk } = await supabase
    .from('knowledge_chunks')
    .select('id, embedding')
    .limit(1)
    .single();
  if (!sampleChunk?.embedding) return fail('Chunks missing embeddings');
  pass('Embeddings are populated');
}

// ============================================
// TEST 2: Cohere embedding generation
// ============================================
async function testCohereEmbedding() {
  console.log('\n🔍 TEST 2: Cohere Embedding Generation\n');

  if (!COHERE_API_KEY) return fail('COHERE_API_KEY not set');

  const testQuery = 'How do I price my OnlyFans PPV content?';

  try {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [testQuery],
        model: 'embed-english-v3.0',
        input_type: 'search_query',
        truncate: 'END',
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return fail('Cohere API call', err.message || response.statusText);
    }

    const data = await response.json();
    const embedding = data.embeddings?.[0];

    if (!embedding) return fail('No embedding returned');
    if (embedding.length !== 1024) return fail(`Wrong dimensions: ${embedding.length} (expected 1024)`);

    pass(`Cohere returned ${embedding.length}-dim embedding`);
    pass(`Tokens used: ${data.meta?.billed_units?.input_tokens || 'unknown'}`);

    return embedding;
  } catch (error: any) {
    fail('Cohere API error', error.message);
    return null;
  }
}

// ============================================
// TEST 3: Vector search (match_knowledge_chunks)
// ============================================
async function testVectorSearch(embedding: number[]) {
  console.log('\n🔍 TEST 3: Vector Search (Supabase RPC)\n');

  try {
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 5,
      filter_categories: null,
      filter_tags: null,
    });

    if (error) return fail('match_knowledge_chunks RPC', error.message);
    if (!data || data.length === 0) return fail('No results returned');

    pass(`${data.length} results returned`);

    for (const result of data.slice(0, 3)) {
      const score = (result.similarity * 100).toFixed(1);
      const preview = result.content?.substring(0, 80)?.replace(/\n/g, ' ') || 'empty';
      console.log(`     📄 [${score}%] ${result.file_name || 'unknown'}: "${preview}..."`);
    }

    pass('Vector search working');
    return data;
  } catch (error: any) {
    fail('Vector search error', error.message);
    return null;
  }
}

// ============================================
// TEST 4: Context formatting
// ============================================
function testContextFormatting(searchResults: any[]) {
  console.log('\n🔍 TEST 4: Context Formatting\n');

  let context = '## Relevant Knowledge\n\n';
  let estimatedTokens = 50;
  const maxTokens = 3000;

  for (const result of searchResults) {
    const title = result.metadata?.title || result.file_name || 'Document';
    const chunkText = `### ${title} (relevance: ${(result.similarity * 100).toFixed(0)}%)\n${result.content}\n\n`;
    const chunkTokens = Math.ceil(chunkText.length / 4);

    if (estimatedTokens + chunkTokens > maxTokens) break;

    context += chunkText;
    estimatedTokens += chunkTokens;
  }

  if (context.length < 60) return fail('Context too short');
  console.log(`     Preview: "${context.substring(0, 200).replace(/\n/g, ' ')}..."\n`);

  pass(`Context generated: ${context.length} chars (~${estimatedTokens} tokens)`);
  pass(`Contains ${(context.match(/###/g) || []).length} knowledge sections`);

  return context;
}

// ============================================
// TEST 5: Grok API with knowledge context
// ============================================
async function testGrokWithKnowledge(knowledgeContext: string) {
  console.log('\n🔍 TEST 5: Grok API with Knowledge Injection\n');

  if (!XAI_API_KEY) return fail('XAI_API_KEY not set');

  const systemPrompt = `You are Kiara, a premium AI assistant. Use the following knowledge naturally in your response.\n\n${knowledgeContext}`;
  const userMessage = 'Give me a quick tip about pricing PPV content on OnlyFans.';

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return fail('Grok API call', err.substring(0, 200));
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) return fail('No response content');

    pass(`Grok responded (${reply.length} chars)`);
    console.log('\n     💬 Kiara says:\n');
    // Print response indented
    reply.split('\n').forEach((line: string) => console.log(`     ${line}`));
    console.log('');

    pass('End-to-end RAG pipeline working');
  } catch (error: any) {
    fail('Grok API error', error.message);
  }
}

// ============================================
// TEST 6: Hybrid search function
// ============================================
async function testHybridSearch(embedding: number[]) {
  console.log('\n🔍 TEST 6: Hybrid Search (Semantic + Keyword)\n');

  try {
    const { data, error } = await supabase.rpc('hybrid_knowledge_search', {
      query_embedding: embedding,
      query_text: 'OnlyFans PPV pricing strategy tips',
      match_count: 5,
      semantic_weight: 0.7,
    });

    if (error) return fail('hybrid_knowledge_search RPC', error.message);
    if (!data || data.length === 0) return fail('No hybrid results');

    pass(`${data.length} hybrid results returned`);
    pass('Hybrid search working');
  } catch (error: any) {
    fail('Hybrid search error', error.message);
  }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  RAG PIPELINE END-TO-END TEST');
  console.log('  Testing: DB → Embeddings → Search → Grok');
  console.log('═══════════════════════════════════════════');

  // Check env
  console.log('\n📋 Environment Check\n');
  SUPABASE_URL ? pass('SUPABASE_URL') : fail('SUPABASE_URL missing');
  SUPABASE_SERVICE_KEY ? pass('SUPABASE_SERVICE_KEY') : fail('SUPABASE_SERVICE_KEY missing');
  COHERE_API_KEY ? pass('COHERE_API_KEY') : fail('COHERE_API_KEY missing');
  XAI_API_KEY ? pass('XAI_API_KEY') : fail('XAI_API_KEY missing');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('\n⛔ Cannot continue without Supabase credentials.\n');
    process.exit(1);
  }

  // Run tests sequentially (each depends on the previous)
  await testDatabase();

  const embedding = await testCohereEmbedding();
  if (!embedding) {
    console.log('\n⛔ Cannot continue without embeddings.\n');
    process.exit(1);
  }

  const searchResults = await testVectorSearch(embedding);
  if (!searchResults || searchResults.length === 0) {
    console.log('\n⛔ Cannot continue without search results.\n');
    process.exit(1);
  }

  const context = testContextFormatting(searchResults);

  await testHybridSearch(embedding);

  if (context && XAI_API_KEY) {
    await testGrokWithKnowledge(context);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════');
  if (failures === 0) {
    console.log('  ✅ ALL TESTS PASSED — RAG pipeline is working!');
  } else {
    console.log(`  ⚠️  ${failures} test(s) failed — see above for details`);
  }
  console.log('═══════════════════════════════════════════\n');

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
