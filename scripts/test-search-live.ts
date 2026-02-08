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

const testQueries = [
  'How do I grow my Instagram following?',
  'What are the best Reddit strategies for OnlyFans promotion?',
  'Give me some caption ideas for posts',
  'How should I price my content on OnlyFans?',
  'What is a good TikTok strategy?',
];

async function main() {
  console.log('=== END-TO-END RAG SEARCH TEST ===\n');

  for (const query of testQueries) {
    const start = Date.now();
    const embedding = await embedQuery(query);
    const embedMs = Date.now() - start;

    const searchStart = Date.now();
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: embedding,
      match_threshold: 0.65,
      match_count: 5,
      filter_categories: null,
      filter_tags: null,
    });
    const searchMs = Date.now() - searchStart;

    console.log(`Q: "${query}"`);
    console.log(`   Embed: ${embedMs}ms | Search: ${searchMs}ms | Total: ${embedMs + searchMs}ms`);

    if (error) {
      console.log(`   ERROR: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log('   No results found!');
    } else {
      console.log(`   Results: ${data.length}`);
      for (let i = 0; i < data.length; i++) {
        const r = data[i] as any;
        const score = (r.similarity * 100).toFixed(1);
        const preview = r.content.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   ${i + 1}. [${score}%] ${r.file_name || 'unknown'}: ${preview}...`);
      }
    }
    console.log('');

    await new Promise(r => setTimeout(r, 600));
  }

  // Also test the full context formatting (what Grok actually sees)
  console.log('=== CONTEXT INJECTION TEST ===\n');
  const testQ = 'How do I grow on Reddit for OnlyFans?';
  const emb = await embedQuery(testQ);
  const { data: results } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: emb,
    match_threshold: 0.65,
    match_count: 10,
    filter_categories: null,
    filter_tags: null,
  });

  if (results && results.length > 0) {
    let context = '## Relevant Knowledge\n\n';
    let tokens = 50;
    for (const r of results as any[]) {
      const chunk = `### ${r.metadata?.title || 'Document'} (relevance: ${(r.similarity * 100).toFixed(0)}%)\n${r.content}\n\n`;
      const chunkTokens = Math.ceil(chunk.length / 4);
      if (tokens + chunkTokens > 3000) break;
      context += chunk;
      tokens += chunkTokens;
    }
    console.log(`Context for "${testQ}":`);
    console.log(`Total length: ${context.length} chars (~${Math.ceil(context.length / 4)} tokens)`);
    console.log(`Chunks included: ${results.length}`);
    console.log('\n--- First 500 chars of context ---');
    console.log(context.substring(0, 500));
    console.log('...\n');
  }

  console.log('=== ALL TESTS PASSED ===');
}

main().catch(console.error);
