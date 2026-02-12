/**
 * Knowledge Service
 * High-level API for the knowledge base
 * Use this in your AI assistant to access knowledge
 */

import {
  searchKnowledge,
  getKnowledgeContext,
  hybridSearch,
  ingestDocument,
  listDocuments,
  deleteDocument,
} from '@/lib/knowledgeBase';
import type {
  SearchResult,
  KnowledgeSearchOptions,
  KnowledgeContextOptions,
  KnowledgeIntent,
} from '@/lib/knowledgeBase';

export type { KnowledgeIntent };

// Get embedding API key from environment (OpenRouter → text-embedding-3-small)
const getEmbeddingKey = () => {
  const orKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (orKey) return orKey;

  throw new Error('No embedding API key configured (VITE_OPENROUTER_API_KEY)');
};

/**
 * Search knowledge base and return relevant results
 */
export async function queryKnowledge(
  query: string,
  options: Partial<KnowledgeSearchOptions> = {}
): Promise<SearchResult[]> {
  return searchKnowledge(
    { query, topK: 10, threshold: 0.55, ...options },
    getEmbeddingKey()
  );
}

/**
 * Get formatted context string for LLM injection
 * This is the main function to use before AI responses
 */
export async function getContextForAI(
  userQuery: string,
  maxTokens: number = 4000,
  options: KnowledgeContextOptions = {}
): Promise<string> {
  try {
    const context = await getKnowledgeContext(userQuery, getEmbeddingKey(), maxTokens, options);
    return context;
  } catch (error) {
    console.error('Failed to get knowledge context:', error);
    return '';
  }
}

/**
 * Enhanced search combining semantic + keyword
 */
export async function searchWithHybrid(
  query: string,
  options: { topK?: number; categories?: string[]; tags?: string[] } = {}
): Promise<SearchResult[]> {
  return hybridSearch(query, getEmbeddingKey(), options);
}

/**
 * Add a new document to the knowledge base
 */
export async function addToKnowledge(
  fileName: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ingestDocument(fileName, content, getEmbeddingKey());
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all documents in knowledge base
 */
export async function getKnowledgeDocuments() {
  return listDocuments();
}

/**
 * Remove a document from knowledge base
 */
export async function removeFromKnowledge(docId: string) {
  return deleteDocument(docId);
}

/**
 * Build system prompt with knowledge context
 * Use this to enhance your AI's system prompt
 */
export async function buildEnhancedSystemPrompt(
  basePrompt: string,
  userQuery: string
): Promise<string> {
  const knowledgeContext = await getContextForAI(userQuery, 4000);

  if (!knowledgeContext) {
    return basePrompt;
  }

  return `${basePrompt}

---

${knowledgeContext}

---

Use the above knowledge to inform your responses. Cite specific information when relevant. If the knowledge doesn't cover the user's question, say so and provide your best general guidance.`;
}
