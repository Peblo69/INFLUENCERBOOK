-- ============================================================================
-- Assistant Latency Metrics
-- Per-request telemetry for assistant chat latency and reliability.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_assistant_request_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  request_mode TEXT NOT NULL CHECK (request_mode IN ('stream', 'non_stream')),
  api_mode TEXT NOT NULL CHECK (api_mode IN ('chat_completions', 'responses')),
  model TEXT NOT NULL,
  web_search_enabled BOOLEAN NOT NULL DEFAULT false,
  memory_enabled BOOLEAN NOT NULL DEFAULT true,
  memory_strategy TEXT,
  memory_retrieved_count INTEGER NOT NULL DEFAULT 0,
  used_responses_api BOOLEAN NOT NULL DEFAULT false,
  request_chars INTEGER NOT NULL DEFAULT 0,
  response_chars INTEGER,
  tool_count INTEGER NOT NULL DEFAULT 0,
  auth_ms INTEGER NOT NULL DEFAULT 0,
  profile_ms INTEGER NOT NULL DEFAULT 0,
  memory_ms INTEGER NOT NULL DEFAULT 0,
  upstream_ms INTEGER NOT NULL DEFAULT 0,
  total_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'upstream_error', 'error')),
  http_status INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_assistant_metrics_user_created
  ON public.ai_assistant_request_metrics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_metrics_created
  ON public.ai_assistant_request_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_metrics_status_created
  ON public.ai_assistant_request_metrics(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_metrics_conversation_created
  ON public.ai_assistant_request_metrics(conversation_id, created_at DESC);

ALTER TABLE public.ai_assistant_request_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_assistant_metrics_select_own" ON public.ai_assistant_request_metrics;
DROP POLICY IF EXISTS "ai_assistant_metrics_service_all" ON public.ai_assistant_request_metrics;

CREATE POLICY "ai_assistant_metrics_select_own"
  ON public.ai_assistant_request_metrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ai_assistant_metrics_service_all"
  ON public.ai_assistant_request_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

