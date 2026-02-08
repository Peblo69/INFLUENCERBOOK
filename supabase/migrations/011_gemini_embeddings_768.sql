-- ============================================
-- Migration: Cohere (1024-dim) → Google Gemini (768-dim)
-- ============================================
-- Google Gemini text-embedding-004 produces 768-dimensional vectors
-- (vs Cohere embed-english-v3.0 which was 1024-dimensional)
--
-- This migration:
-- 1. Drops the old IVFFlat index
-- 2. Deletes all existing chunks (they have 1024-dim embeddings, incompatible)
-- 3. Alters the column from vector(1024) → vector(768)
-- 4. Updates both RPC functions to accept vector(768)
-- 5. Recreates the IVFFlat index
--
-- After running this, re-embed everything with:
--   npx tsx scripts/rechunk-knowledge.ts

-- Step 1: Drop old vector index
DROP INDEX IF EXISTS idx_knowledge_chunks_embedding;

-- Step 2: Delete all existing chunks (old 1024-dim embeddings are useless now)
DELETE FROM knowledge_chunks;

-- Step 3: Reset chunk counts on documents
UPDATE knowledge_documents SET chunk_count = 0;

-- Step 4: Alter embedding column from vector(1024) to vector(768)
ALTER TABLE knowledge_chunks
  ALTER COLUMN embedding TYPE vector(768);

-- Step 5: Recreate IVFFlat index (will be rebuilt properly after rechunking)
-- Using a small lists value since table is empty; rechunk script rebuilds with optimal value
CREATE INDEX idx_knowledge_chunks_embedding
ON knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- Step 6: Update match_knowledge_chunks function for 768-dim
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(768),
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
  -- Set probes for better recall on IVFFlat
  SET LOCAL ivfflat.probes = 10;

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

-- Step 7: Update hybrid_knowledge_search function for 768-dim
CREATE OR REPLACE FUNCTION hybrid_knowledge_search(
  query_embedding vector(768),
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
  -- Set probes for better recall on IVFFlat
  SET LOCAL ivfflat.probes = 10;

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
