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

async function main() {
  // Test problematic queries at different thresholds
  const queries = [
    'Give me some caption ideas for posts',
    'caption templates for OnlyFans',
    'hashtags for Instagram adult content',
    'chatting scripts for subscribers',
    'How do I grow my Instagram following?',
  ];

  const thresholds = [0.50, 0.55, 0.60, 0.65];

  for (const query of queries) {
    const embedding = await embedQuery(query);
    console.log(`\nQ: "${query}"`);

    for (const threshold of thresholds) {
      const { data } = await supabase.rpc('match_knowledge_chunks', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: 3,
        filter_categories: null,
        filter_tags: null,
      });
      const scores = (data || []).map((r: any) => (r.similarity * 100).toFixed(1) + '%');
      console.log(`   threshold=${threshold}: ${data?.length || 0} results ${scores.join(', ')}`);
    }

    // Show top result at 0.50
    const { data: topResults } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: embedding,
      match_threshold: 0.50,
      match_count: 3,
      filter_categories: null,
      filter_tags: null,
    });
    if (topResults && topResults.length > 0) {
      console.log(`   Best match: ${(topResults[0] as any).file_name} [${((topResults[0] as any).similarity * 100).toFixed(1)}%]`);
    }

    await new Promise(r => setTimeout(r, 600));
  }
}

main().catch(console.error);
