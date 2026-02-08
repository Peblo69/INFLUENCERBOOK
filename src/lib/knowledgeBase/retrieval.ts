/**
 * Knowledge Base Retrieval Service
 * Semantic search over the knowledge base
 */

import { supabase } from '@/lib/supabase';
import { generateQueryEmbedding } from './embeddings';
import type { SearchResult, KnowledgeSearchOptions } from './types';

/**
 * Search the knowledge base using semantic similarity
 */
export async function searchKnowledge(
  options: KnowledgeSearchOptions,
  openaiApiKey: string
): Promise<SearchResult[]> {
  const {
    query,
    topK = 10,
    threshold = 0.55,
    categories,
    tags,
  } = options;

  // 1. Generate embedding for the query (uses search_query input_type for Cohere)
  const { embedding } = await generateQueryEmbedding(query, openaiApiKey);

  // 2. Search using pgvector similarity
  // Using the match_knowledge_chunks function we'll create
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
    filter_categories: categories || null,
    filter_tags: tags || null,
  });

  if (error) {
    console.error('Knowledge search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }

  // 3. Transform results
  const results: SearchResult[] = (data || []).map((row: any) => ({
    chunk: {
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      chunkIndex: row.chunk_index,
      totalChunks: row.total_chunks,
    },
    score: row.similarity,
    document: {
      id: row.document_id,
      fileName: row.file_name,
      metadata: row.metadata,
    },
  }));

  return results;
}

/**
 * Strip markdown formatting from text so the LLM treats it as plain reference
 * data rather than formatted content to reproduce.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')        // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/__(.+?)__/g, '$1')        // bold alt
    .replace(/_(.+?)_/g, '$1')          // italic alt
    .replace(/~~(.+?)~~/g, '$1')        // strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, '')) // code
    .replace(/^\s*[-*+]\s+/gm, '- ')   // normalize bullets
    .replace(/^\s*\d+\.\s+/gm, (m) => m) // keep numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images → remove
    .replace(/\n{3,}/g, '\n\n')         // collapse blank lines
    .trim();
}

/**
 * Get context for LLM based on query
 * Returns formatted string ready to inject into system prompt
 */
export async function getKnowledgeContext(
  query: string,
  openaiApiKey: string,
  maxTokens: number = 4000
): Promise<string> {
  // Use hybrid search (vector + keyword) for best coverage
  // Fetch only top 5 — quality over quantity
  const results = await hybridSearch(query, openaiApiKey, { topK: 5 });

  if (results.length === 0) {
    return '';
  }

  // Build context as plain reference notes (stripped of markdown)
  // This prevents the LLM from reproducing chunk formatting verbatim
  let context = '';
  let estimatedTokens = 0;

  for (const result of results) {
    const cleaned = stripMarkdown(result.chunk.content);
    const source = result.document.metadata?.title || result.document.fileName || 'ref';
    const entry = `[${source}]: ${cleaned}\n\n`;
    const entryTokens = estimateTokens(entry);

    if (estimatedTokens + entryTokens > maxTokens) {
      break;
    }

    context += entry;
    estimatedTokens += entryTokens;
  }

  return context;
}

/**
 * Simple token estimation (rough: 1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Search with hybrid approach (semantic + keyword)
 */
export async function hybridSearch(
  query: string,
  openaiApiKey: string,
  options: { topK?: number; categories?: string[] } = {}
): Promise<SearchResult[]> {
  const { topK = 10, categories } = options;

  // Run semantic + keyword searches in parallel for speed
  const keywords = extractKeywords(query);

  const [semanticResults, { data: keywordData }] = await Promise.all([
    searchKnowledge(
      { query, topK: topK * 2, threshold: 0.55, categories },
      openaiApiKey
    ),
    keywords.length > 0
      ? supabase
          .from('knowledge_chunks')
          .select('*, knowledge_documents!inner(*)')
          .textSearch('content', keywords.join(' | '))
          .limit(topK)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Merge and deduplicate, preferring semantic scores
  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  for (const result of semanticResults) {
    if (!seen.has(result.chunk.id)) {
      seen.add(result.chunk.id);
      merged.push(result);
    }
  }

  // Add keyword results with lower score
  for (const row of keywordData || []) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push({
        chunk: {
          id: row.id,
          content: row.content,
          metadata: row.metadata,
          chunkIndex: row.chunk_index,
          totalChunks: 0,
        },
        score: 0.5, // Keyword match base score
        document: {
          id: row.document_id,
          fileName: row.knowledge_documents.file_name,
          metadata: row.metadata,
        },
      });
    }
  }

  return merged.slice(0, topK);
}

/**
 * Extract keywords from query
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because',
    'until', 'while', 'what', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'am', 'it', 'its', 'i', 'me', 'my',
  ]);

  return query
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}
