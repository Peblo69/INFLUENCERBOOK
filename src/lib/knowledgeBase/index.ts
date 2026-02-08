/**
 * Knowledge Base Module
 *
 * Drop files in knowledge-base/inbox/ and they get:
 * 1. Parsed and chunked
 * 2. Embedded with OpenAI
 * 3. Stored in Supabase pgvector
 * 4. Available for semantic search
 */

export * from './types';
export * from './embeddings';
export * from './chunker';
export * from './ingestion';
export * from './retrieval';

// Re-export main functions for convenience
export { ingestDocument, ingestDocuments, deleteDocument, listDocuments } from './ingestion';
export { searchKnowledge, getKnowledgeContext, hybridSearch } from './retrieval';
