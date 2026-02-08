-- Knowledge Base Schema
-- Enables pgvector for semantic search over documents

-- Enable pgvector extension (run once)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- KNOWLEDGE DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  title TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  content TEXT,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_category ON knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_status ON knowledge_documents(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_tags ON knowledge_documents USING GIN(tags);

-- ============================================
-- KNOWLEDGE CHUNKS TABLE (with embeddings)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1024), -- Cohere embed-english-v3.0 dimensions
  chunk_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index (IVFFlat for faster search)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
ON knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for document lookup
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document ON knowledge_chunks(document_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_fts
ON knowledge_chunks
USING GIN (to_tsvector('english', content));

-- ============================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_categories TEXT[] DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  metadata JSONB,
  file_name TEXT,
  title TEXT,
  category TEXT,
  total_chunks INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    kc.chunk_index,
    kc.metadata,
    kd.file_name,
    kd.title,
    kd.category,
    kd.chunk_count as total_chunks,
    1 - (kc.embedding <=> query_embedding) as similarity
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kc.document_id = kd.id
  WHERE
    kd.status = 'completed'
    AND (filter_categories IS NULL OR kd.category = ANY(filter_categories))
    AND (filter_tags IS NULL OR kd.tags && filter_tags)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- HYBRID SEARCH FUNCTION (semantic + keyword)
-- ============================================
CREATE OR REPLACE FUNCTION hybrid_knowledge_search(
  query_embedding vector(1024),
  query_text TEXT,
  match_count INT DEFAULT 10,
  semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id TEXT,
  document_id UUID,
  content TEXT,
  file_name TEXT,
  title TEXT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    SELECT
      kc.id,
      kc.document_id,
      kc.content,
      kd.file_name,
      kd.title,
      1 - (kc.embedding <=> query_embedding) as score
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kc.document_id = kd.id
    WHERE kd.status = 'completed'
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT
      kc.id,
      kc.document_id,
      kc.content,
      kd.file_name,
      kd.title,
      ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', query_text)) as score
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kc.document_id = kd.id
    WHERE
      kd.status = 'completed'
      AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', query_text)
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(s.id, k.id) as id,
      COALESCE(s.document_id, k.document_id) as document_id,
      COALESCE(s.content, k.content) as content,
      COALESCE(s.file_name, k.file_name) as file_name,
      COALESCE(s.title, k.title) as title,
      (COALESCE(s.score, 0) * semantic_weight) +
      (COALESCE(k.score, 0) * (1 - semantic_weight)) as combined_score
    FROM semantic_results s
    FULL OUTER JOIN keyword_results k ON s.id = k.id
  )
  SELECT * FROM combined
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read knowledge base
CREATE POLICY "Anyone can read knowledge documents"
ON knowledge_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can read knowledge chunks"
ON knowledge_chunks FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage knowledge documents"
ON knowledge_documents FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage knowledge chunks"
ON knowledge_chunks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get document stats
CREATE OR REPLACE FUNCTION get_knowledge_stats()
RETURNS TABLE (
  total_documents BIGINT,
  total_chunks BIGINT,
  categories JSONB,
  recent_documents JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM knowledge_documents WHERE status = 'completed'),
    (SELECT COUNT(*) FROM knowledge_chunks),
    (SELECT jsonb_agg(DISTINCT category) FROM knowledge_documents WHERE status = 'completed'),
    (SELECT jsonb_agg(jsonb_build_object('title', title, 'file_name', file_name, 'created_at', created_at))
     FROM (SELECT title, file_name, created_at FROM knowledge_documents ORDER BY created_at DESC LIMIT 5) recent);
END;
$$;
