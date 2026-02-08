/**
 * Knowledge Base Ingestion Service
 * Processes documents and stores them in the vector database
 */

import { supabase } from '@/lib/supabase';
import { generateEmbeddings } from './embeddings';
import { chunkDocument, parseFrontmatter } from './chunker';
import type { DocumentMetadata, DocumentChunk, KnowledgeDocument } from './types';

/**
 * Process a single document and store in knowledge base
 */
export async function ingestDocument(
  fileName: string,
  content: string,
  openaiApiKey: string
): Promise<KnowledgeDocument> {
  const docId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    // 1. Parse frontmatter if present
    const { metadata: frontmatter, content: mainContent } = parseFrontmatter(content);

    // 2. Build metadata
    const metadata: DocumentMetadata = {
      title: frontmatter.title || fileName.replace(/\.[^/.]+$/, ''),
      category: frontmatter.category || 'general',
      tags: frontmatter.tags || [],
      source: frontmatter.source || 'local',
      date: frontmatter.date || now.split('T')[0],
      filePath: fileName,
      fileType: fileName.split('.').pop() || 'unknown',
      processedAt: now,
    };

    // 3. Chunk the document
    const chunkTexts = chunkDocument(mainContent, {
      maxChunkSize: 1000,
      chunkOverlap: 200,
    });

    // 4. Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunkTexts, openaiApiKey);

    // 5. Create chunk objects
    const chunks: DocumentChunk[] = chunkTexts.map((text, index) => ({
      id: `${docId}_chunk_${index}`,
      content: text,
      embedding: embeddings[index].embedding,
      metadata,
      chunkIndex: index,
      totalChunks: chunkTexts.length,
    }));

    // 6. Store document in Supabase
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
      throw new Error(`Failed to store document: ${docError.message}`);
    }

    // 7. Store chunks with embeddings
    const chunkInserts = chunks.map(chunk => ({
      id: chunk.id,
      document_id: docId,
      content: chunk.content,
      embedding: chunk.embedding,
      chunk_index: chunk.chunkIndex,
      metadata: chunk.metadata,
      created_at: now,
    }));

    const { error: chunkError } = await supabase
      .from('knowledge_chunks')
      .insert(chunkInserts);

    if (chunkError) {
      throw new Error(`Failed to store chunks: ${chunkError.message}`);
    }

    console.log(`✓ Ingested "${fileName}": ${chunks.length} chunks`);

    return {
      id: docId,
      fileName,
      content: mainContent,
      chunks,
      metadata,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error(`✗ Failed to ingest "${fileName}":`, error);

    // Store failed document for retry
    await supabase.from('knowledge_documents').insert({
      id: docId,
      file_name: fileName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      created_at: now,
      updated_at: now,
    });

    throw error;
  }
}

/**
 * Process multiple documents
 */
export async function ingestDocuments(
  documents: { fileName: string; content: string }[],
  openaiApiKey: string
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const doc of documents) {
    try {
      await ingestDocument(doc.fileName, doc.content, openaiApiKey);
      success.push(doc.fileName);
    } catch {
      failed.push(doc.fileName);
    }
  }

  return { success, failed };
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(docId: string): Promise<void> {
  await supabase.from('knowledge_chunks').delete().eq('document_id', docId);
  await supabase.from('knowledge_documents').delete().eq('id', docId);
}

/**
 * Get all documents
 */
export async function listDocuments(): Promise<any[]> {
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
