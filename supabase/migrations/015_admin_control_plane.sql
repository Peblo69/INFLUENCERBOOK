-- ============================================================================
-- ADMIN CONTROL PLANE + REAL-TIME ACTIVITY TRACKING
-- ============================================================================

-- 1) Extend profiles with admin/moderation metadata
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE public.profiles
SET last_seen_at = COALESCE(last_seen_at, updated_at, created_at)
WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles(is_suspended);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC);

-- 2) Helper function used by admin policies
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = COALESCE(p_user_id, auth.uid())
      AND p.is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO service_role;

-- 3) User activity events (real-time telemetry)
CREATE TABLE IF NOT EXISTS public.user_activity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_events_user_created
  ON public.user_activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_events_type_created
  ON public.user_activity_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_events_created
  ON public.user_activity_events(created_at DESC);

ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_activity_events_select_own" ON public.user_activity_events;
DROP POLICY IF EXISTS "user_activity_events_insert_own" ON public.user_activity_events;
DROP POLICY IF EXISTS "user_activity_events_admin_select_all" ON public.user_activity_events;
DROP POLICY IF EXISTS "user_activity_events_service_all" ON public.user_activity_events;

CREATE POLICY "user_activity_events_select_own"
  ON public.user_activity_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_activity_events_insert_own"
  ON public.user_activity_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_activity_events_admin_select_all"
  ON public.user_activity_events FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "user_activity_events_service_all"
  ON public.user_activity_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4) Admin audit log for sensitive actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_created
  ON public.admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_created
  ON public.admin_audit_logs(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_created
  ON public.admin_audit_logs(action, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_admin_select" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "admin_audit_logs_service_all" ON public.admin_audit_logs;

CREATE POLICY "admin_audit_logs_admin_select"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "admin_audit_logs_service_all"
  ON public.admin_audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5) Single RPC for frontend telemetry (also updates last_seen_at)
CREATE OR REPLACE FUNCTION public.track_user_activity(
  p_event_type TEXT,
  p_path TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_activity_events (user_id, event_type, path, metadata)
  VALUES (
    v_user_id,
    LEFT(COALESCE(p_event_type, 'unknown'), 64),
    NULLIF(LEFT(COALESCE(p_path, ''), 500), ''),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  UPDATE public.profiles
  SET last_seen_at = NOW(),
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_user_activity(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_user_activity(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_user_activity(TEXT, TEXT, JSONB) TO service_role;

-- 6) Add activity events to realtime publication for live admin updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'user_activity_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_events;
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END;
$$;
