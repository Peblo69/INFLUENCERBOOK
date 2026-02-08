/**
 * Knowledge Base Types
 */

export interface DocumentMetadata {
  title?: string;
  category?: string;
  tags?: string[];
  source?: string;
  date?: string;
  filePath: string;
  fileType: string;
  processedAt: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: DocumentMetadata;
  chunkIndex: number;
  totalChunks: number;
}

export interface KnowledgeDocument {
  id: string;
  fileName: string;
  content: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  document: {
    id: string;
    fileName: string;
    metadata: DocumentMetadata;
  };
}

export interface KnowledgeSearchOptions {
  query: string;
  topK?: number;
  threshold?: number;
  categories?: string[];
  tags?: string[];
}
