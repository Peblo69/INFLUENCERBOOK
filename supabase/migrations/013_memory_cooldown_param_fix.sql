-- ============================================
-- Migration: Fix memory retrieval cooldown parameter usage
-- ============================================
-- search_memories_semantic/search_memories_keyword previously used m.cooldown_hours,
-- which ignored the RPC cooldown_hours argument passed by retrieve-memories.
-- This migration applies the function parameter first, with a fallback to the
-- row-level cooldown value.

CREATE OR REPLACE FUNCTION search_memories_semantic(
  query_embedding vector(1536),
  query_user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 8,
  cooldown_hours INT DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  category TEXT,
  memory_type TEXT,
  importance FLOAT,
  similarity FLOAT,
  last_accessed TIMESTAMPTZ,
  access_count INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.category,
    m.memory_type,
    m.importance,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.last_accessed,
    m.access_count,
    m.created_at
  FROM memories m
  WHERE m.user_id = query_user_id
    AND m.is_active = true
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
    AND (
      m.last_accessed IS NULL
      OR NOW() - m.last_accessed > make_interval(
        hours => GREATEST(COALESCE(cooldown_hours, m.cooldown_hours, 24), 0)
      )
    )
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY
    (1 - (m.embedding <=> query_embedding)) * 0.7 +
    m.importance * 0.3
    DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_memories_keyword(
  query_text TEXT,
  query_user_id UUID,
  match_count INT DEFAULT 8,
  cooldown_hours INT DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  category TEXT,
  memory_type TEXT,
  importance FLOAT,
  relevance FLOAT,
  last_accessed TIMESTAMPTZ,
  access_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.category,
    m.memory_type,
    m.importance,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text)) AS relevance,
    m.last_accessed,
    m.access_count
  FROM memories m
  WHERE m.user_id = query_user_id
    AND m.is_active = true
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
    AND (
      m.last_accessed IS NULL
      OR NOW() - m.last_accessed > make_interval(
        hours => GREATEST(COALESCE(cooldown_hours, m.cooldown_hours, 24), 0)
      )
    )
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
  ORDER BY
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text)) * 0.6 +
    m.importance * 0.4
    DESC
  LIMIT match_count;
END;
$$;
