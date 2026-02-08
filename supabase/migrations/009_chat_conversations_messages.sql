-- ============================================
-- CHAT CONVERSATIONS + MESSAGES ENHANCEMENTS
-- Adds soft delete + last message tracking
-- ============================================

-- Conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Backfill stats + last_message_at
UPDATE conversations c
SET
  total_messages = COALESCE(s.message_count, 0),
  total_tokens = COALESCE(s.token_count, 0),
  last_message_at = COALESCE(s.last_message_at, c.last_message_at)
FROM (
  SELECT
    conversation_id,
    COUNT(*) AS message_count,
    COALESCE(SUM(tokens), 0) AS token_count,
    MAX(created_at) AS last_message_at
  FROM messages
  GROUP BY conversation_id
) s
WHERE c.id = s.conversation_id;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_deleted ON conversations(is_deleted);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at);

-- Trigger: keep conversation stats in sync with messages
CREATE OR REPLACE FUNCTION public.update_conversation_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET
      total_messages = COALESCE(total_messages, 0) + 1,
      total_tokens = COALESCE(total_tokens, 0) + COALESCE(NEW.tokens, 0),
      last_message_at = COALESCE(NEW.created_at, NOW()),
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE conversations
    SET
      total_messages = GREATEST(COALESCE(total_messages, 0) - 1, 0),
      total_tokens = GREATEST(COALESCE(total_tokens, 0) - COALESCE(OLD.tokens, 0), 0),
      last_message_at = (
        SELECT MAX(created_at)
        FROM messages
        WHERE conversation_id = OLD.conversation_id
      ),
      updated_at = NOW()
    WHERE id = OLD.conversation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_update_conversation_stats ON messages;
CREATE TRIGGER messages_update_conversation_stats
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_stats_on_message();

-- ============================================
-- DONE
-- ============================================
