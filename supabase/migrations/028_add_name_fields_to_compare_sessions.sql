-- Migration: Add name fields to compare_sessions and update RPCs
-- Fixes production issue where inviter names are missing on invite/compare pages
-- 
-- Goal: Single source of truth for names in compare_sessions table
-- All pages must get names from backend payload by token, not from FE state

-- ============================================
-- 1. Add name columns to compare_sessions
-- ============================================

-- Add inviter name columns (Person A)
ALTER TABLE compare_sessions 
  ADD COLUMN IF NOT EXISTS inviter_first_name text;

ALTER TABLE compare_sessions 
  ADD COLUMN IF NOT EXISTS inviter_last_name text;

-- Add invitee name columns (Person B) - nullable until B completes
ALTER TABLE compare_sessions 
  ADD COLUMN IF NOT EXISTS invitee_first_name text;

ALTER TABLE compare_sessions 
  ADD COLUMN IF NOT EXISTS invitee_last_name text;

-- Add opened_at timestamp for tracking when invite link was first opened
ALTER TABLE compare_sessions 
  ADD COLUMN IF NOT EXISTS opened_at timestamptz;

-- ============================================
-- 2. Update create_compare_invite to persist inviter name
-- ============================================

CREATE OR REPLACE FUNCTION create_compare_invite(attempt_a_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text;
  session_id uuid;
  inviter_first_name_val text;
  inviter_last_name_val text;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = attempt_a_id_param) THEN
    RAISE EXCEPTION 'Attempt not found: %', attempt_a_id_param;
  END IF;

  -- Get inviter name from attempt A
  SELECT 
    COALESCE(user_first_name, ''),
    COALESCE(user_last_name, '')
  INTO inviter_first_name_val, inviter_last_name_val
  FROM attempts
  WHERE id = attempt_a_id_param;

  -- Generate unique token
  LOOP
    new_token := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_sessions WHERE invite_token = new_token);
  END LOOP;

  -- Create session with inviter name
  INSERT INTO compare_sessions (
    invite_token, 
    attempt_a_id, 
    status, 
    expires_at,
    inviter_first_name,
    inviter_last_name
  )
  VALUES (
    new_token, 
    attempt_a_id_param, 
    'pending', 
    now() + interval '7 days',
    inviter_first_name_val,
    inviter_last_name_val
  )
  RETURNING id INTO session_id;

  RETURN new_token;
END;
$$;

-- ============================================
-- 3. Update get_or_create_pending_compare_token to persist inviter name
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
  inviter_first_name_val text;
  inviter_last_name_val text;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Get inviter name from attempt A
  SELECT 
    COALESCE(user_first_name, ''),
    COALESCE(user_last_name, '')
  INTO inviter_first_name_val, inviter_last_name_val
  FROM attempts
  WHERE id = p_attempt_a_id;

  -- Look for existing pending token for this attempt (not expired, not superseded)
  SELECT cs.id, cs.invite_token, cs.expires_at, cs.status
  INTO existing_session_id, existing_token, existing_expires_at, existing_status
  FROM compare_sessions cs
  WHERE cs.attempt_a_id = p_attempt_a_id
    AND cs.status = 'pending'
    AND (cs.expires_at IS NULL OR cs.expires_at > now())
  ORDER BY cs.created_at DESC
  LIMIT 1;

  -- If existing token found, update inviter name if missing (idempotent)
  IF existing_session_id IS NOT NULL THEN
    -- Update inviter name if it's null (idempotent)
    UPDATE compare_sessions
    SET inviter_first_name = COALESCE(inviter_first_name, inviter_first_name_val),
        inviter_last_name = COALESCE(inviter_last_name, inviter_last_name_val)
    WHERE id = existing_session_id
      AND (inviter_first_name IS NULL OR inviter_last_name IS NULL);
    
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

  -- Create new session with inviter name
  INSERT INTO compare_sessions (
    invite_token, 
    attempt_a_id, 
    status, 
    expires_at,
    inviter_first_name,
    inviter_last_name
  )
  VALUES (
    new_token,
    p_attempt_a_id,
    'pending',
    new_expires_at,
    inviter_first_name_val,
    inviter_last_name_val
  )
  RETURNING id, expires_at INTO new_session_id, new_expires_at;

  RETURN QUERY SELECT new_token, new_expires_at, new_session_id, 'pending'::text;
END;
$$;

-- ============================================
-- 4. Update get_compare_token_by_token to return inviter name
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_token_by_token(p_token text)
RETURNS TABLE (
  token text,
  status text,
  expires_at timestamptz,
  attempt_a_id uuid,
  attempt_b_id uuid,
  compare_id uuid,
  inviter_first_name text,
  inviter_last_name text,
  opened_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.invite_token as token,
    cs.status,
    cs.expires_at,
    cs.attempt_a_id,
    cs.attempt_b_id,
    cs.id as compare_id,
    -- Return inviter name from compare_sessions (persisted) with fallback to attempts
    COALESCE(
      cs.inviter_first_name,
      a.user_first_name,
      ''
    ) as inviter_first_name,
    COALESCE(
      cs.inviter_last_name,
      a.user_last_name,
      ''
    ) as inviter_last_name,
    cs.opened_at
  FROM public.compare_sessions cs
  LEFT JOIN attempts a ON a.id = cs.attempt_a_id
  WHERE trim(cs.invite_token) = trim(p_token)
  LIMIT 1;
$$;

-- ============================================
-- 5. Update get_compare_payload_by_token to return both names
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_payload_by_token(p_token text)
RETURNS TABLE (
  session_id text,
  quiz_id text,
  status text,
  expires_at timestamptz,
  attempt_a_id uuid,
  attempt_b_id uuid,
  attempt_a jsonb,
  attempt_b jsonb,
  invite_token text,
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
  b_user_last_name text,
  inviter_first_name text,
  inviter_last_name text,
  invitee_first_name text,
  invitee_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_hash_val text;
  rate_limit_record compare_token_validation_rate_limits%ROWTYPE;
  RATE_LIMIT_COUNT int := 30;
  RATE_LIMIT_WINDOW interval := '1 minute';
BEGIN
  -- Hash token for rate limiting (if table exists)
  BEGIN
    token_hash_val := hash_token_for_rate_limit(p_token);

    -- Check rate limit
    SELECT * INTO rate_limit_record
    FROM compare_token_validation_rate_limits
    WHERE token_hash = token_hash_val;

    IF rate_limit_record IS NULL THEN
      INSERT INTO compare_token_validation_rate_limits (token_hash, validation_count, window_start)
      VALUES (token_hash_val, 1, now())
      ON CONFLICT (token_hash) DO UPDATE
        SET validation_count = 1, window_start = now(), updated_at = now();
    ELSE
      IF now() - rate_limit_record.window_start > RATE_LIMIT_WINDOW THEN
        UPDATE compare_token_validation_rate_limits
        SET validation_count = 1, window_start = now(), updated_at = now()
        WHERE token_hash = token_hash_val;
      ELSE
        IF rate_limit_record.validation_count >= RATE_LIMIT_COUNT THEN
          RAISE EXCEPTION 'Unable to process request';
        END IF;
        
        UPDATE compare_token_validation_rate_limits
        SET validation_count = validation_count + 1, updated_at = now()
        WHERE token_hash = token_hash_val;
      END IF;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Rate limit table doesn't exist, skip
      NULL;
  END;

  -- Proceed with token validation
  RETURN QUERY
  SELECT 
    cs.invite_token as session_id,
    COALESCE(a.quiz_id::text, NULL::text) as quiz_id,
    cs.status,
    cs.expires_at,
    cs.attempt_a_id,
    cs.attempt_b_id,
    to_jsonb(a.*) as attempt_a,
    CASE WHEN b.id IS NOT NULL THEN to_jsonb(b.*) ELSE NULL::jsonb END as attempt_b,
    cs.invite_token as invite_token,
    a.total_score::numeric as a_total_score,
    a.dimension_scores as a_dimension_scores,
    a.score_band_id as a_score_band_id,
    NULL::text as a_score_band_title,
    a.user_first_name as a_user_first_name,
    a.user_last_name as a_user_last_name,
    b.total_score::numeric as b_total_score,
    b.dimension_scores as b_dimension_scores,
    b.score_band_id as b_score_band_id,
    NULL::text as b_score_band_title,
    b.user_first_name as b_user_first_name,
    b.user_last_name as b_user_last_name,
    -- Return inviter name from compare_sessions (persisted) with fallback
    COALESCE(
      cs.inviter_first_name,
      a.user_first_name,
      ''
    ) as inviter_first_name,
    COALESCE(
      cs.inviter_last_name,
      a.user_last_name,
      ''
    ) as inviter_last_name,
    -- Return invitee name from compare_sessions (persisted) with fallback
    COALESCE(
      cs.invitee_first_name,
      b.user_first_name,
      NULL
    ) as invitee_first_name,
    COALESCE(
      cs.invitee_last_name,
      b.user_last_name,
      NULL
    ) as invitee_last_name
  FROM compare_sessions cs
  JOIN attempts a ON a.id = cs.attempt_a_id
  LEFT JOIN attempts b ON b.id = cs.attempt_b_id
  WHERE trim(cs.invite_token) = trim(p_token)
    AND (
      (cs.expires_at IS NULL OR cs.expires_at > now())
      OR cs.status = 'completed'
    );
END;
$$;

-- ============================================
-- 6. Update complete_compare_session to persist invitee name
-- ============================================

CREATE OR REPLACE FUNCTION complete_compare_session(p_token text, p_attempt_b_id uuid)
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
  invitee_first_name_val text;
  invitee_last_name_val text;
BEGIN
  -- Trim the input token
  trimmed_token := trim(p_token);

  -- Get session
  SELECT id, status INTO session_id, current_status
  FROM compare_sessions
  WHERE invite_token = trimmed_token;

  IF session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found for token: %', trimmed_token;
  END IF;

  IF current_status != 'pending' THEN
    RAISE EXCEPTION 'Session is not pending (current status: %)', current_status;
  END IF;

  -- Validate attempt_b exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_b_id) THEN
    RAISE EXCEPTION 'Attempt B not found: %', p_attempt_b_id;
  END IF;

  -- Get invitee name from attempt B
  SELECT 
    COALESCE(user_first_name, ''),
    COALESCE(user_last_name, '')
  INTO invitee_first_name_val, invitee_last_name_val
  FROM attempts
  WHERE id = p_attempt_b_id;

  -- Update session with attempt_b_id, status, and invitee name
  UPDATE compare_sessions
  SET attempt_b_id = p_attempt_b_id,
      status = 'completed',
      invitee_first_name = invitee_first_name_val,
      invitee_last_name = invitee_last_name_val
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
-- 7. Update get_compare_session_by_token to return names
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_session_by_token(token_param text)
RETURNS TABLE (
  id uuid,
  attempt_a_id uuid,
  attempt_b_id uuid,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  inviter_first_name text,
  inviter_last_name text,
  invitee_first_name text,
  invitee_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.attempt_a_id,
    cs.attempt_b_id,
    cs.status,
    cs.created_at,
    cs.expires_at,
    -- Return inviter name from compare_sessions (persisted) with fallback
    COALESCE(
      cs.inviter_first_name,
      a.user_first_name,
      ''
    ) as inviter_first_name,
    COALESCE(
      cs.inviter_last_name,
      a.user_last_name,
      ''
    ) as inviter_last_name,
    -- Return invitee name from compare_sessions (persisted) with fallback
    COALESCE(
      cs.invitee_first_name,
      b.user_first_name,
      NULL
    ) as invitee_first_name,
    COALESCE(
      cs.invitee_last_name,
      b.user_last_name,
      NULL
    ) as invitee_last_name
  FROM compare_sessions cs
  LEFT JOIN attempts a ON a.id = cs.attempt_a_id
  LEFT JOIN attempts b ON b.id = cs.attempt_b_id
  WHERE cs.invite_token = token_param;
END;
$$;

-- ============================================
-- 8. Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION create_compare_invite(uuid) TO anon;
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_pending_compare_token(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_pending_compare_token(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_token_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_token_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_session_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_session_by_token(text) TO authenticated;

-- ============================================
-- 9. Reload PostgREST schema cache
-- ============================================

SELECT pg_notify('pgrst', 'reload schema');

