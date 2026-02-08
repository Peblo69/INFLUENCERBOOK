-- ============================================
-- KIARA VISION MEMORY SYSTEM
-- Advanced persistent memory with vector embeddings
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  model TEXT DEFAULT 'grok-4-fast',
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  total_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  tool_calls JSONB,
  tool_results JSONB,
  images JSONB, -- Array of image URLs/data
  tokens INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMORIES TABLE (THE CORE!)
-- ============================================
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Memory content
  memory_type TEXT CHECK (memory_type IN (
    'fact',          -- Hard facts: "User's name is John"
    'preference',    -- Likes/dislikes: "Prefers 4K quality"
    'instruction',   -- How to behave: "Don't use emojis"
    'context',       -- Background info: "Working on GOONERPROJECT"
    'relationship',  -- Social context: "Has a Porsche"
    'identity',      -- Self-description: "Software engineer"
    'commitment',    -- Promises/plans: "Building Kiara Vision"
    'habit'          -- Recurring patterns: "Always asks for Git Bash commands"
  )),
  content TEXT NOT NULL,
  category TEXT, -- Tags: 'communication_style', 'projects', 'vehicles', etc.

  -- Intelligence features
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  embedding vector(1536), -- OpenAI embeddings for semantic search

  -- Anti-repetition system
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  cooldown_hours INTEGER DEFAULT 24, -- Don't re-use for X hours

  -- Lifecycle management
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- Optional expiration
  replaced_by UUID REFERENCES memories(id) ON DELETE SET NULL, -- For updates

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMORY ASSOCIATIONS (Complex relationships)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  to_memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  association_type TEXT CHECK (association_type IN (
    'related',      -- General relationship
    'contradicts',  -- Conflicting information
    'supports',     -- Reinforces each other
    'caused_by',    -- Causal relationship
    'part_of'       -- Hierarchy
  )),
  strength FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_memory_id, to_memory_id, association_type)
);

-- ============================================
-- USER GENERATIONS (Track image/video generation)
-- ============================================
CREATE TABLE IF NOT EXISTS user_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Generation details
  generation_type TEXT CHECK (generation_type IN ('image', 'video')),
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  reference_images TEXT[], -- URLs to reference images

  -- Results
  output_urls TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Settings used
  settings JSONB DEFAULT '{}', -- Size, quality, etc.

  -- Cost tracking
  credits_used INTEGER DEFAULT 1,
  generation_time_seconds INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON conversations USING gin(tags);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Memories (CRITICAL FOR PERFORMANCE!)
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_active ON memories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memories_last_accessed ON memories(last_accessed);

-- Full-text search on memory content
CREATE INDEX IF NOT EXISTS idx_memories_content_search ON memories USING gin(to_tsvector('english', content));

-- HNSW index for vector similarity search (ULTRA FAST!)
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Memory associations
CREATE INDEX IF NOT EXISTS idx_memory_associations_from ON memory_associations(from_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_associations_to ON memory_associations(to_memory_id);

-- Generations
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON user_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON user_generations(created_at DESC);

-- ============================================
-- SMART FUNCTIONS
-- ============================================

-- Function: Semantic memory search with cosine similarity
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
      -- Memory has never been accessed OR it's past cooldown period
      m.last_accessed IS NULL
      OR NOW() - m.last_accessed > (m.cooldown_hours || ' hours')::INTERVAL
    )
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY
    (1 - (m.embedding <=> query_embedding)) * 0.7 +  -- 70% semantic similarity
    m.importance * 0.3                                -- 30% importance score
    DESC
  LIMIT match_count;
END;
$$;

-- Function: Keyword-based memory search (fast fallback)
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
      OR NOW() - m.last_accessed > (m.cooldown_hours || ' hours')::INTERVAL
    )
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
  ORDER BY
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text)) * 0.6 +
    m.importance * 0.4
    DESC
  LIMIT match_count;
END;
$$;

-- Function: Mark memory as accessed (for cooldown tracking)
CREATE OR REPLACE FUNCTION mark_memory_accessed(memory_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE memories
  SET
    last_accessed = NOW(),
    access_count = access_count + 1,
    updated_at = NOW()
  WHERE id = memory_id;
END;
$$;

-- Function: Get memory profile (analytics)
CREATE OR REPLACE FUNCTION get_memory_profile(query_user_id UUID)
RETURNS TABLE (
  total_memories BIGINT,
  active_memories BIGINT,
  by_type JSONB,
  by_category JSONB,
  avg_importance FLOAT,
  most_accessed JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE is_active = true) AS active_count,
      AVG(importance) AS avg_imp
    FROM memories
    WHERE user_id = query_user_id
  ),
  type_counts AS (
    SELECT
      jsonb_object_agg(memory_type, type_count) AS by_type
    FROM (
      SELECT memory_type, COUNT(*) AS type_count
      FROM memories
      WHERE user_id = query_user_id
      GROUP BY memory_type
    ) t
  ),
  category_counts AS (
    SELECT
      jsonb_object_agg(category, cat_count) AS by_category
    FROM (
      SELECT category, COUNT(*) AS cat_count
      FROM memories
      WHERE user_id = query_user_id AND category IS NOT NULL
      GROUP BY category
    ) c
  ),
  top_accessed AS (
    SELECT
      jsonb_agg(jsonb_build_object('content', content, 'access_count', access_count)) AS most_accessed
    FROM (
      SELECT content, access_count
      FROM memories
      WHERE user_id = query_user_id
      ORDER BY access_count DESC
      LIMIT 5
    ) top
  )
  SELECT
    s.total_count,
    s.active_count,
    COALESCE(t.by_type, '{}'::jsonb),
    COALESCE(c.by_category, '{}'::jsonb),
    s.avg_imp,
    COALESCE(ta.most_accessed, '[]'::jsonb)
  FROM stats s
  CROSS JOIN type_counts t
  CROSS JOIN category_counts c
  CROSS JOIN top_accessed ta;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_generations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Memories policies (CRITICAL!)
CREATE POLICY "Users can view own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);

-- Memory associations policies
CREATE POLICY "Users can view own memory associations" ON memory_associations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_associations.from_memory_id
      AND memories.user_id = auth.uid()
    )
  );

-- Generations policies
CREATE POLICY "Users can view own generations" ON user_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generations" ON user_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! Memory system is ready 🔥
-- ============================================
