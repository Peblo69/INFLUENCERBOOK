/**
 * Re-chunk Knowledge Base (OpenRouter → text-embedding-3-small)
 *
 * Uses text-embedding-3-small at 768 dimensions via OpenRouter.
 * Run with: npx tsx scripts/rechunk-knowledge.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars. Need: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!OPENROUTER_KEY) {
  console.error('Missing OPENROUTER_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const MODEL = 'openai/text-embedding-3-small';
const DIMENSIONS = 768;

// ============================================
// CHUNKER
// ============================================
function chunkDocument(content: string, maxSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];

  let sections = content.split(/\n(?=#{1,3}\s)/);

  const smallBlocks: string[] = [];
  for (const section of sections) {
    if (section.length <= maxSize) {
      smallBlocks.push(section.trim());
    } else {
      const paragraphs = section.split(/\n\n+/);
      let current = '';
      for (const para of paragraphs) {
        if ((current + para).length > maxSize && current) {
          smallBlocks.push(current.trim());
          current = para;
        } else {
          current += (current ? '\n\n' : '') + para;
        }
      }
      if (current) smallBlocks.push(current.trim());
    }
  }

  const mediumBlocks: string[] = [];
  for (const block of smallBlocks) {
    if (block.length <= maxSize) {
      mediumBlocks.push(block);
    } else {
      const lines = block.split(/\n/);
      let current = '';
      for (const line of lines) {
        if ((current + line).length > maxSize && current) {
          mediumBlocks.push(current.trim());
          current = line;
        } else {
          current += (current ? '\n' : '') + line;
        }
      }
      if (current) mediumBlocks.push(current.trim());
    }
  }

  const finalBlocks: string[] = [];
  for (const block of mediumBlocks) {
    if (block.length <= maxSize) {
      finalBlocks.push(block);
    } else {
      let remaining = block;
      while (remaining.length > maxSize) {
        let splitAt = remaining.lastIndexOf('. ', maxSize);
        if (splitAt < maxSize * 0.3) splitAt = remaining.lastIndexOf(' ', maxSize);
        if (splitAt < maxSize * 0.3) splitAt = maxSize;
        finalBlocks.push(remaining.substring(0, splitAt + 1).trim());
        remaining = remaining.substring(splitAt + 1).trim();
      }
      if (remaining) finalBlocks.push(remaining);
    }
  }

  for (let i = 0; i < finalBlocks.length; i++) {
    let chunk = finalBlocks[i];
    if (i > 0 && overlap > 0) {
      const prev = finalBlocks[i - 1];
      const overlapText = prev.substring(Math.max(0, prev.length - overlap));
      chunk = overlapText + '\n' + chunk;
    }
    if (chunk.trim().length > 50) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}

// ============================================
// OPENROUTER EMBEDDINGS (batch up to 500 at once)
// ============================================
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const batchSize = 200;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: batch,
        dimensions: DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Embed error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
    for (const item of sorted) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('🔄 RE-CHUNKING KNOWLEDGE BASE (OpenRouter → text-embedding-3-small, 768-dim)');
  console.log('=========================================================================\n');

  // 1. Fetch all completed documents
  const { data: docs, error: docsErr } = await supabase
    .from('knowledge_documents')
    .select('id, file_name, title, category, tags, source, content')
    .eq('status', 'completed')
    .order('created_at');

  if (docsErr || !docs) {
    console.error('Failed to fetch documents:', docsErr);
    process.exit(1);
  }

  console.log(`📚 Found ${docs.length} documents\n`);

  // 2. Wipe ALL old chunks (switching providers = incompatible vectors)
  console.log('🗑️  Deleting old chunks...');
  const { error: delErr } = await supabase
    .from('knowledge_chunks')
    .delete()
    .neq('id', '___never_match___');

  if (delErr) {
    console.error('Failed to delete chunks:', delErr);
    process.exit(1);
  }
  console.log('   Done.\n');

  // 3. Process each document
  let totalChunks = 0;
  let processed = 0;
  let failed = 0;

  for (const doc of docs) {
    try {
      const content = doc.content;
      if (!content || content.trim().length < 50) {
        console.log(`   ⏩ Skipping ${doc.file_name} (no content)`);
        continue;
      }

      const chunks = chunkDocument(content);
      console.log(`📄 ${doc.file_name}: ${content.length} chars → ${chunks.length} chunks`);

      if (chunks.length === 0) {
        console.log(`   ⏩ No valid chunks`);
        continue;
      }

      // Generate embeddings via OpenAI
      const embeddings = await generateEmbeddings(chunks);

      const metadata = {
        title: doc.title || doc.file_name,
        category: doc.category || 'general',
        tags: doc.tags || [],
        source: doc.source || 'local',
        filePath: doc.file_name,
      };

      const chunkInserts = chunks.map((chunk, i) => ({
        id: `${doc.id}_chunk_${i}`,
        document_id: doc.id,
        content: chunk,
        embedding: embeddings[i],
        chunk_index: i,
        metadata,
        created_at: new Date().toISOString(),
      }));

      for (let i = 0; i < chunkInserts.length; i += 50) {
        const batch = chunkInserts.slice(i, i + 50);
        const { error: insertErr } = await supabase
          .from('knowledge_chunks')
          .insert(batch);

        if (insertErr) {
          throw new Error(`Chunk insert failed: ${insertErr.message}`);
        }
      }

      await supabase
        .from('knowledge_documents')
        .update({ chunk_count: chunks.length, updated_at: new Date().toISOString() })
        .eq('id', doc.id);

      totalChunks += chunks.length;
      processed++;

    } catch (err: any) {
      console.error(`   ❌ Failed ${doc.file_name}:`, err.message);
      failed++;
      await sleep(1000);
    }
  }

  // 4. Rebuild the IVFFlat index
  console.log('\n🔧 Rebuilding vector index...');
  const lists = Math.max(10, Math.floor(Math.sqrt(totalChunks)));
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_3165b6cc60f2c652464901942e6a00f8b0db6340';
  const projectRef = 'fxukbijtgezuehmlaeps';

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `DROP INDEX IF EXISTS idx_knowledge_chunks_embedding; CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = ${lists});`,
      }),
    });
    if (res.ok) {
      console.log(`   Rebuilt with lists=${lists} for ${totalChunks} chunks`);
    } else {
      console.warn('   Index rebuild failed, search may be slower');
    }
  } catch {
    console.warn('   Could not rebuild index via API');
  }

  console.log('\n======================================================================');
  console.log(`✅ Processed: ${processed} documents`);
  console.log(`📦 Total chunks: ${totalChunks}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Avg chunks/doc: ${(totalChunks / Math.max(processed, 1)).toFixed(1)}`);
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
