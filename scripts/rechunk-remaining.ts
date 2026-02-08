/**
 * Retry chunking for documents that failed due to rate limiting.
 * Uses longer delays between Cohere API calls.
 *
 * Run: npx tsx scripts/rechunk-remaining.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const COHERE_API_KEY = process.env.COHERE_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function chunkDocument(content: string, maxSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let sections = content.split(/\n(?=#{1,3}\s)/);
  const smallBlocks: string[] = [];
  for (const section of sections) {
    if (section.length <= maxSize) { smallBlocks.push(section.trim()); } else {
      const paragraphs = section.split(/\n\n+/);
      let current = '';
      for (const para of paragraphs) {
        if ((current + para).length > maxSize && current) { smallBlocks.push(current.trim()); current = para; }
        else { current += (current ? '\n\n' : '') + para; }
      }
      if (current) smallBlocks.push(current.trim());
    }
  }
  const mediumBlocks: string[] = [];
  for (const block of smallBlocks) {
    if (block.length <= maxSize) { mediumBlocks.push(block); } else {
      const lines = block.split(/\n/);
      let current = '';
      for (const line of lines) {
        if ((current + line).length > maxSize && current) { mediumBlocks.push(current.trim()); current = line; }
        else { current += (current ? '\n' : '') + line; }
      }
      if (current) mediumBlocks.push(current.trim());
    }
  }
  const finalBlocks: string[] = [];
  for (const block of mediumBlocks) {
    if (block.length <= maxSize) { finalBlocks.push(block); } else {
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
      chunk = prev.substring(Math.max(0, prev.length - overlap)) + '\n' + chunk;
    }
    if (chunk.trim().length > 50) chunks.push(chunk.trim());
  }
  return chunks;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const batchSize = 96;
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${COHERE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: batch, model: 'embed-english-v3.0', input_type: 'search_document', truncate: 'END' }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(`Cohere: ${e.message}`); }
    const data = await res.json();
    all.push(...data.embeddings);
    if (i + batchSize < texts.length) await sleep(2000);
  }
  return all;
}

async function main() {
  console.log('🔄 Processing remaining unchunked documents...\n');

  // Find documents that need (re)chunking — have fewer chunks than expected
  const { data: allDocs } = await supabase
    .from('knowledge_documents')
    .select('id, file_name, title, category, tags, source, content, chunk_count')
    .eq('status', 'completed');

  const { data: chunkCounts } = await supabase
    .from('knowledge_chunks')
    .select('document_id');

  const countMap = new Map<string, number>();
  (chunkCounts || []).forEach(c => countMap.set(c.document_id, (countMap.get(c.document_id) || 0) + 1));

  // Include docs with 0 chunks or where actual chunks < 3 (likely failed mid-process)
  const unchunked = (allDocs || []).filter(d => {
    const actual = countMap.get(d.id) || 0;
    return actual < 3 && d.content && d.content.length > 200;
  });

  console.log(`Found ${unchunked.length} documents to process\n`);

  let success = 0, failed = 0, totalChunks = 0;

  for (const doc of unchunked) {
    if (!doc.content || doc.content.trim().length < 50) continue;

    try {
      // Delete any existing partial chunks for this doc
      await supabase.from('knowledge_chunks').delete().eq('document_id', doc.id);

      const chunks = chunkDocument(doc.content);
      console.log(`📄 ${doc.file_name}: ${chunks.length} chunks`);

      const embeddings = await generateEmbeddings(chunks);
      const metadata = { title: doc.title || doc.file_name, category: doc.category || 'general', tags: doc.tags || [], source: doc.source || 'local', filePath: doc.file_name };

      const inserts = chunks.map((chunk, i) => ({
        id: `${doc.id}_chunk_${i}`, document_id: doc.id, content: chunk,
        embedding: embeddings[i], chunk_index: i, metadata, created_at: new Date().toISOString(),
      }));

      for (let i = 0; i < inserts.length; i += 50) {
        const { error } = await supabase.from('knowledge_chunks').insert(inserts.slice(i, i + 50));
        if (error) throw new Error(error.message);
      }

      await supabase.from('knowledge_documents').update({ chunk_count: chunks.length }).eq('id', doc.id);
      totalChunks += chunks.length;
      success++;
      await sleep(3000); // Longer delay for rate limiting
    } catch (err: any) {
      console.error(`   ❌ ${doc.file_name}: ${err.message}`);
      failed++;
      await sleep(5000);
    }
  }

  console.log(`\n✅ Done: ${success} processed, ${totalChunks} chunks, ${failed} failed`);
}

main().catch(console.error);
