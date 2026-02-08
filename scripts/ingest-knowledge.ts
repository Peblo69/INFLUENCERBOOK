/**
 * Knowledge Base Ingestion Script
 *
 * Run with: npx tsx scripts/ingest-knowledge.ts
 *
 * Processes all files in knowledge-base/inbox/ and adds them to the vector database.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { extractText } from 'unpdf';

// Configuration
const INBOX_DIR = path.join(process.cwd(), 'knowledge-base', 'inbox');
const PROCESSED_DIR = path.join(process.cwd(), 'knowledge-base', 'processed');
const FAILED_DIR = path.join(process.cwd(), 'knowledge-base', 'failed');

const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.json', '.html', '.pdf'];

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const COHERE_API_KEY = process.env.COHERE_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !COHERE_API_KEY) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('- VITE_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.error('- COHERE_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// PDF EXTRACTION
// ============================================

async function extractPdfText(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(dataBuffer);
  const { text } = await extractText(uint8Array, { mergePages: true });
  return text || '';
}

// ============================================
// CHUNKING
// ============================================

function parseFrontmatter(content: string): { metadata: Record<string, any>; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, content };

  const [, fm, main] = match;
  const metadata: Record<string, any> = {};

  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      const [, key, value] = m;
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key] = value.slice(1, -1).split(',').map(s => s.trim());
      } else {
        metadata[key] = value.trim();
      }
    }
  }

  return { metadata, content: main };
}

function chunkDocument(content: string, maxSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];

  // Step 1: Split by markdown headers
  let sections = content.split(/\n(?=#{1,3}\s)/);

  // Step 2: For each section, split further if too large
  const smallBlocks: string[] = [];
  for (const section of sections) {
    if (section.length <= maxSize) {
      smallBlocks.push(section.trim());
    } else {
      // Split by double newlines (paragraphs)
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

  // Step 3: For any remaining oversized blocks, split by single newlines
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

  // Step 4: Hard split anything still too large (pure text walls)
  const finalBlocks: string[] = [];
  for (const block of mediumBlocks) {
    if (block.length <= maxSize) {
      finalBlocks.push(block);
    } else {
      // Split at sentence boundaries where possible
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

  // Step 5: Add overlap between chunks for context continuity
  for (let i = 0; i < finalBlocks.length; i++) {
    let chunk = finalBlocks[i];
    // Prepend overlap from previous chunk
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
// UTILITIES
// ============================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Strip problematic Unicode characters that break Supabase/PostgreSQL JSON
function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control chars except \t \n \r
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '') // Broken unicode escapes
    .replace(/\uFFFD/g, '') // Replacement character
    .replace(/[\uD800-\uDFFF]/g, ''); // Lone surrogates
}

// ============================================
// EMBEDDINGS
// ============================================

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Using Cohere embed-english-v3.0 (1024 dimensions)
  const batchSize = 96; // Cohere max batch size
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: batch,
        model: 'embed-english-v3.0',
        input_type: 'search_document',
        truncate: 'END',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cohere error: ${error.message || 'Unknown error'}`);
    }

    const data = await response.json();
    allEmbeddings.push(...data.embeddings);
  }

  return allEmbeddings;
}

// ============================================
// INGESTION
// ============================================

async function ingestFile(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath).toLowerCase();
  console.log(`\n📄 Processing: ${fileName}`);

  // Read file - handle PDFs differently
  let mainContent: string;
  let frontmatter: Record<string, any> = {};

  if (fileExt === '.pdf') {
    console.log(`   📑 Extracting text from PDF...`);
    mainContent = sanitizeText(await extractPdfText(filePath));
    if (!mainContent || mainContent.trim().length < 50) {
      throw new Error('PDF appears to be empty or unreadable (possibly scanned images)');
    }
  } else {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(content);
    frontmatter = parsed.metadata;
    mainContent = sanitizeText(parsed.content);
  }

  // Create document record
  const docId = crypto.randomUUID();
  const now = new Date().toISOString();

  const metadata = {
    title: frontmatter.title || fileName.replace(/\.[^/.]+$/, ''),
    category: frontmatter.category || 'general',
    tags: frontmatter.tags || [],
    source: frontmatter.source || 'local',
    date: frontmatter.date || now.split('T')[0],
    filePath: fileName,
    fileType: path.extname(fileName).slice(1),
    processedAt: now,
  };

  // Chunk document
  const chunks = chunkDocument(mainContent);
  console.log(`   📦 Split into ${chunks.length} chunks`);

  // Generate embeddings
  console.log(`   🧠 Generating embeddings...`);
  const embeddings = await generateEmbeddings(chunks);

  // Insert document
  const { error: docError } = await supabase
    .from('knowledge_documents')
    .insert({
      id: docId,
      file_name: fileName,
      title: metadata.title,
      category: metadata.category,
      tags: metadata.tags,
      source: metadata.source,
      content: mainContent,
      chunk_count: chunks.length,
      status: 'completed',
      created_at: now,
      updated_at: now,
    });

  if (docError) {
    throw new Error(`Document insert failed: ${docError.message}`);
  }

  // Insert chunks
  const chunkInserts = chunks.map((chunk, i) => ({
    id: `${docId}_chunk_${i}`,
    document_id: docId,
    content: chunk,
    embedding: embeddings[i],
    chunk_index: i,
    metadata,
    created_at: now,
  }));

  const { error: chunkError } = await supabase
    .from('knowledge_chunks')
    .insert(chunkInserts);

  if (chunkError) {
    throw new Error(`Chunks insert failed: ${chunkError.message}`);
  }

  console.log(`   ✅ Ingested successfully!`);
}

async function moveFile(from: string, toDir: string) {
  const fileName = path.basename(from);
  const to = path.join(toDir, fileName);

  // Handle duplicates
  let finalPath = to;
  let counter = 1;
  while (fs.existsSync(finalPath)) {
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    finalPath = path.join(toDir, `${name}_${counter}${ext}`);
    counter++;
  }

  fs.renameSync(from, finalPath);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🚀 Knowledge Base Ingestion');
  console.log('===========================\n');

  // Ensure directories exist
  [INBOX_DIR, PROCESSED_DIR, FAILED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Get files to process
  const files = fs.readdirSync(INBOX_DIR)
    .filter(f => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .map(f => path.join(INBOX_DIR, f));

  if (files.length === 0) {
    console.log('📭 No files to process in inbox/');
    return;
  }

  console.log(`📬 Found ${files.length} file(s) to process`);

  let success = 0;
  let failed = 0;

  for (const filePath of files) {
    try {
      await ingestFile(filePath);
      await moveFile(filePath, PROCESSED_DIR);
      success++;
      // Rate limit: Cohere trial key = 100 calls/min, so wait 700ms between files
      await sleep(700);
    } catch (error) {
      console.error(`   ❌ Failed:`, error);
      await moveFile(filePath, FAILED_DIR);
      failed++;
    }
  }

  console.log('\n===========================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
}

main().catch(console.error);
