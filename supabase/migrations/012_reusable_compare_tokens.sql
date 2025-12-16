-- Migration: Reusable Compare Tokens
-- Makes invite tokens reusable by fetching existing pending tokens instead of always creating new ones

-- ============================================
-- 1. Update status constraint to include 'superseded' and 'expired'
-- ============================================

ALTER TABLE compare_sessions 
  DROP CONSTRAINT IF EXISTS compare_sessions_status_check;

ALTER TABLE compare_sessions
  ADD CONSTRAINT compare_sessions_status_check 
  CHECK (status IN ('pending', 'completed', 'superseded', 'expired'));

-- ============================================
-- 2. Add unique partial index to enforce one active pending token per attempt
-- ============================================

-- Create unique index for active pending tokens (not expired, not superseded)
CREATE UNIQUE INDEX IF NOT EXISTS idx_compare_sessions_one_pending_per_attempt
ON compare_sessions (attempt_a_id)
WHERE status = 'pending' 
  AND (expires_at IS NULL OR expires_at > now());

-- ============================================
-- 3. Function: get_or_create_pending_compare_token
-- Returns existing pending token if available, otherwise creates new one
-- Returns: token, expires_at, compare_id, status
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_pending_compare_token(
  p_attempt_a_id uuid,
  p_expires_in_minutes int
)
RETURNS TABLE (
  token text,
  expires_at timestamptz,
  compare_id uuid,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_session_id uuid;
  existing_token text;
  existing_expires_at timestamptz;
  existing_status text;
  new_token text;
  new_session_id uuid;
  new_expires_at timestamptz;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Look for existing pending token for this attempt (not expired, not superseded)
  SELECT cs.id, cs.invite_token, cs.expires_at, cs.status
  INTO existing_session_id, existing_token, existing_expires_at, existing_status
  FROM compare_sessions cs
  WHERE cs.attempt_a_id = p_attempt_a_id
    AND cs.status = 'pending'
    AND (cs.expires_at IS NULL OR cs.expires_at > now())
  ORDER BY cs.created_at DESC
  LIMIT 1;

  -- If existing token found, return it
  IF existing_session_id IS NOT NULL THEN
    RETURN QUERY SELECT existing_token, existing_expires_at, existing_session_id, existing_status;
    RETURN;
  END IF;

  -- No existing token, create new one
  -- Generate unique token
  LOOP
    new_token := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_sessions WHERE invite_token = new_token);
  END LOOP;

  -- Calculate expiration
  new_expires_at := CASE 
    WHEN p_expires_in_minutes IS NULL THEN NULL
    ELSE now() + (p_expires_in_minutes || ' minutes')::interval
  END;

  -- Create new session
  INSERT INTO compare_sessions (invite_token, attempt_a_id, status, expires_at)
  VALUES (
    new_token,
    p_attempt_a_id,
    'pending',
    new_expires_at
  )
  RETURNING id, expires_at INTO new_session_id, new_expires_at;

  RETURN QUERY SELECT new_token, new_expires_at, new_session_id, 'pending'::text;
END;
$$;

-- ============================================
-- 4. Function: supersede_pending_compare_token
-- Marks existing pending token as superseded and creates a new one
-- ============================================

CREATE OR REPLACE FUNCTION supersede_pending_compare_token(
  p_attempt_a_id uuid,
  p_expires_in_minutes int DEFAULT 1440  -- 24 hours = 1440 minutes
)
RETURNS TABLE (
  session_id uuid,
  invite_token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text;
  new_session_id uuid;
  new_expires_at timestamptz;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Mark all existing pending tokens for this attempt as superseded
  UPDATE compare_sessions
  SET status = 'superseded'
  WHERE attempt_a_id = p_attempt_a_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  -- Generate unique token
  LOOP
    new_token := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_sessions WHERE invite_token = new_token);
  END LOOP;

  -- Create new session
  INSERT INTO compare_sessions (invite_token, attempt_a_id, status, expires_at)
  VALUES (
    new_token,
    p_attempt_a_id,
    'pending',
    CASE 
      WHEN p_expires_in_minutes IS NULL THEN NULL
      ELSE now() + (p_expires_in_minutes || ' minutes')::interval
    END
  )
  RETURNING id, invite_token, expires_at INTO new_session_id, new_token, new_expires_at;

  RETURN QUERY SELECT new_session_id, new_token, new_expires_at;
END;
$$;

-- ============================================
-- 5. Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_or_create_pending_compare_token(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_pending_compare_token(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION supersede_pending_compare_token(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION supersede_pending_compare_token(uuid, int) TO authenticated;

-- ============================================
-- 6. Refresh PostgREST schema cache
-- ============================================
-- Attempt to notify PostgREST to reload schema (may not work in all Supabase setups)
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN OTHERS THEN
    -- If notification fails, that's okay - manual refresh may be needed
    NULL;
END $$;

-- Verify function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_or_create_pending_compare_token'
      AND pg_get_function_arguments(p.oid) = 'p_attempt_a_id uuid, p_expires_in_minutes integer'
  ) THEN
    RAISE EXCEPTION 'Function get_or_create_pending_compare_token was not created successfully';
  END IF;
END $$;

