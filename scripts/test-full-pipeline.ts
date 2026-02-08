/**
 * Full Pipeline Test — simulates exactly what happens when a user sends a message
 * Tests: Cohere embedding → pgvector search (probes=10) → hybrid merge → context formatting
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const COHERE_KEY = process.env.VITE_COHERE_API_KEY || process.env.COHERE_API_KEY || '';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
);

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${COHERE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [text], model: 'embed-english-v3.0', input_type: 'search_query', truncate: 'END' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.embeddings[0];
}

function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am',
    'it', 'its', 'i', 'me', 'my', 'give', 'good', 'best',
  ]);
  return query.toLowerCase().split(/\W+/).filter(word => word.length > 2 && !stopWords.has(word));
}

const testQueries = [
  'How do I grow my Instagram following?',
  'What are the best Reddit strategies for OnlyFans promotion?',
  'Give me some caption ideas for posts',
  'How should I price my content on OnlyFans?',
  'What is a good TikTok strategy?',
  'chatting scripts for subscribers',
  'hashtags for Instagram adult content',
  'How to make money with OnlyFans?',
  'sexting guide tips',
  'How to recruit OnlyFans models for my agency?',
];

async function main() {
  console.log('=== FULL PIPELINE TEST (simulating app behavior) ===\n');

  let totalTime = 0;
  let queriesWithResults = 0;
  let totalResults = 0;

  for (const query of testQueries) {
    const start = Date.now();

    // Step 1: Embed query + keyword extract (parallel, just like hybridSearch)
    const keywords = extractKeywords(query);
    const embedding = await embedQuery(query);

    // Step 2: Vector search + keyword search in parallel
    const [vectorRes, keywordRes] = await Promise.all([
      supabase.rpc('match_knowledge_chunks', {
        query_embedding: embedding,
        match_threshold: 0.55,
        match_count: 20,
        filter_categories: null,
        filter_tags: null,
      }),
      keywords.length > 0
        ? supabase
            .from('knowledge_chunks')
            .select('id, content, metadata, chunk_index, document_id, knowledge_documents!inner(file_name)')
            .textSearch('content', keywords.join(' | '))
            .limit(10)
        : Promise.resolve({ data: [] }),
    ]);

    // Step 3: Merge and deduplicate
    const seen = new Set<string>();
    const merged: any[] = [];

    for (const r of vectorRes.data || []) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push({ ...r, source: 'vector' });
      }
    }
    for (const r of (keywordRes.data || []) as any[]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push({ ...r, similarity: 0.5, source: 'keyword', file_name: r.knowledge_documents?.file_name });
      }
    }

    // Step 4: Build context (top 10, max 3000 tokens)
    let context = '';
    let tokens = 0;
    const included = merged.slice(0, 10);
    for (const r of included) {
      const chunk = `### ${r.metadata?.title || r.file_name || 'Doc'} (${(r.similarity * 100).toFixed(0)}%)\n${r.content}\n\n`;
      const ct = Math.ceil(chunk.length / 4);
      if (tokens + ct > 3000) break;
      context += chunk;
      tokens += ct;
    }

    const elapsed = Date.now() - start;
    totalTime += elapsed;

    const hasResults = merged.length > 0;
    if (hasResults) queriesWithResults++;
    totalResults += merged.length;

    const vectorCount = (vectorRes.data || []).length;
    const keywordCount = (keywordRes.data || []).length;
    const topScore = merged.length > 0 ? (merged[0].similarity * 100).toFixed(1) : 'N/A';

    console.log(`Q: "${query}"`);
    console.log(`   ${elapsed}ms | vector:${vectorCount} keyword:${keywordCount} merged:${merged.length} | top:${topScore}% | context:${tokens} tokens`);

    if (merged.length > 0) {
      const sources = [...new Set(merged.slice(0, 3).map((r: any) => r.file_name))];
      console.log(`   Sources: ${sources.join(', ')}`);
    } else {
      console.log(`   NO RESULTS`);
    }
    console.log('');

    await new Promise(r => setTimeout(r, 600));
  }

  console.log('=== SUMMARY ===');
  console.log(`Queries tested: ${testQueries.length}`);
  console.log(`Queries with results: ${queriesWithResults}/${testQueries.length} (${(queriesWithResults / testQueries.length * 100).toFixed(0)}%)`);
  console.log(`Avg results per query: ${(totalResults / testQueries.length).toFixed(1)}`);
  console.log(`Avg response time: ${(totalTime / testQueries.length).toFixed(0)}ms`);
  console.log(`Total pipeline time: ${totalTime}ms`);

  if (queriesWithResults === testQueries.length) {
    console.log('\nALL QUERIES FOUND RESULTS — PIPELINE IS FULLY WIRED');
  } else {
    console.log(`\n${testQueries.length - queriesWithResults} queries had no results — may need more documents or lower threshold`);
  }
}

main().catch(console.error);
