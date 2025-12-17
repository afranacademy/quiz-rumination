-- Migration: Fix compare RPC contract to ensure consistent data flow
-- Ensures get_compare_payload_by_token returns all necessary data with attempt_a.id and attempt_b.id
-- Fixes create_compare_invite, mark_compare_invite_opened, complete_compare_session

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. Ensure compare_sessions has opened_at column
-- ============================================
ALTER TABLE compare_sessions 
  ADD COLUMN IF NOT EXISTS opened_at timestamptz;

-- ============================================
-- 2. Fix create_compare_invite
-- ============================================
DROP FUNCTION IF EXISTS create_compare_invite(uuid, int);
CREATE OR REPLACE FUNCTION create_compare_invite(
  p_attempt_a_id uuid,
  p_expires_in_minutes int DEFAULT 1440  -- Default 24 hours
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
  v_expires_minutes int;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Generate unique 64-character token using pgcrypto
  LOOP
    new_token := encode(gen_random_bytes(32), 'hex');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_sessions WHERE invite_token = new_token);
  END LOOP;

  -- Enforce minimum 24h = 1440 minutes (DB-level protection)
  -- Even if frontend passes 60, DB enforces minimum 24 hours
  v_expires_minutes := GREATEST(COALESCE(p_expires_in_minutes, 1440), 1440);
  
  -- Calculate expiration
  new_expires_at := now() + make_interval(mins => v_expires_minutes);

  -- Create session
  INSERT INTO compare_sessions (
    invite_token, 
    attempt_a_id, 
    status, 
    expires_at
  )
  VALUES (
    new_token, 
    p_attempt_a_id, 
    'pending', 
    new_expires_at
  )
  RETURNING id INTO new_session_id;

  -- Return in format expected by frontend
  RETURN QUERY SELECT 
    new_session_id as session_id,
    new_token as invite_token,
    new_expires_at as expires_at;
END;
$$;

-- ============================================
-- 3. Fix mark_compare_invite_opened
-- ============================================
DROP FUNCTION IF EXISTS mark_compare_invite_opened(text);
CREATE OR REPLACE FUNCTION mark_compare_invite_opened(p_invite_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update opened_at only if it's null (idempotent)
  UPDATE compare_sessions
  SET opened_at = COALESCE(opened_at, now())
  WHERE trim(invite_token) = trim(p_invite_token)
    AND opened_at IS NULL;
END;
$$;

-- ============================================
-- 4. Fix complete_compare_session
-- ============================================
DROP FUNCTION IF EXISTS complete_compare_session(text, uuid);
CREATE OR REPLACE FUNCTION complete_compare_session(
  p_invite_token text, 
  p_attempt_b_id uuid
)
RETURNS TABLE (
  compare_id uuid,
  token text,
  status text,
  attempt_a_id uuid,
  attempt_b_id uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trimmed_token text;
  session_id uuid;
  current_status text;
  current_expires_at timestamptz;
BEGIN
  -- Trim the input token
  trimmed_token := trim(p_invite_token);

  -- Get session
  SELECT id, status, expires_at 
  INTO session_id, current_status, current_expires_at
  FROM compare_sessions
  WHERE trim(invite_token) = trimmed_token;

  IF session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found for token: %', trimmed_token;
  END IF;

  -- Only allow completion if pending and not expired
  IF current_status != 'pending' THEN
    RAISE EXCEPTION 'Session is not pending (current status: %)', current_status;
  END IF;

  -- Check expiry (only for pending sessions)
  IF current_expires_at IS NOT NULL AND current_expires_at <= now() THEN
    RAISE EXCEPTION 'Session has expired';
  END IF;

  -- Validate attempt_b exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_b_id) THEN
    RAISE EXCEPTION 'Attempt B not found: %', p_attempt_b_id;
  END IF;

  -- Update session with attempt_b_id and status
  UPDATE compare_sessions
  SET attempt_b_id = p_attempt_b_id,
      status = 'completed'
  WHERE id = session_id;

  -- Return the updated row
  RETURN QUERY
  SELECT 
    cs.id as compare_id,
    cs.invite_token as token,
    cs.status,
    cs.attempt_a_id,
    cs.attempt_b_id,
    cs.expires_at
  FROM compare_sessions cs
  WHERE cs.id = session_id;
END;
$$;

-- ============================================
-- 5. Fix get_compare_payload_by_token - CRITICAL
-- Must return attempt_a.id and attempt_b.id in jsonb objects
-- ============================================
DROP FUNCTION IF EXISTS get_compare_payload_by_token(text);
CREATE OR REPLACE FUNCTION get_compare_payload_by_token(p_invite_token text)
RETURNS TABLE (
  session_id text,
  quiz_id text,
  status text,
  invite_token text,
  expires_at timestamptz,
  attempt_a_id uuid,
  attempt_b_id uuid,
  attempt_a jsonb,
  attempt_b jsonb,
  a_total_score numeric,
  a_dimension_scores jsonb,
  a_score_band_id integer,
  a_score_band_title text,
  a_user_first_name text,
  a_user_last_name text,
  b_total_score numeric,
  b_dimension_scores jsonb,
  b_score_band_id integer,
  b_score_band_title text,
  b_user_first_name text,
  b_user_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id::text as session_id,
    COALESCE(a.quiz_id::text, NULL::text) as quiz_id,
    cs.status,
    cs.invite_token,
    cs.expires_at,
    cs.attempt_a_id,
    cs.attempt_b_id,
    -- attempt_a as jsonb - MUST include id field
    to_jsonb(a.*) as attempt_a,
    -- attempt_b as jsonb - MUST include id field if exists
    CASE 
      WHEN b.id IS NOT NULL THEN to_jsonb(b.*) 
      ELSE NULL::jsonb 
    END as attempt_b,
    -- Individual fields for attempt A
    a.total_score::numeric as a_total_score,
    a.dimension_scores as a_dimension_scores,
    a.score_band_id as a_score_band_id,
    NULL::text as a_score_band_title,
    a.user_first_name as a_user_first_name,
    a.user_last_name as a_user_last_name,
    -- Individual fields for attempt B (may be NULL)
    b.total_score::numeric as b_total_score,
    b.dimension_scores as b_dimension_scores,
    b.score_band_id as b_score_band_id,
    NULL::text as b_score_band_title,
    b.user_first_name as b_user_first_name,
    b.user_last_name as b_user_last_name
  FROM compare_sessions cs
  JOIN attempts a ON a.id = cs.attempt_a_id
  LEFT JOIN attempts b ON b.id = cs.attempt_b_id
  WHERE trim(cs.invite_token) = trim(p_invite_token)
    AND (
      -- Allow access if not expired OR if completed (completed sessions never expire)
      (cs.expires_at IS NULL OR cs.expires_at > now())
      OR cs.status = 'completed'
    );
END;
$$;

-- ============================================
-- 6. Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_compare_invite_opened(text) TO anon;
GRANT EXECUTE ON FUNCTION mark_compare_invite_opened(text) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO authenticated;

-- ============================================
-- 7. Reload PostgREST schema cache
-- ============================================
SELECT pg_notify('pgrst', 'reload schema');

