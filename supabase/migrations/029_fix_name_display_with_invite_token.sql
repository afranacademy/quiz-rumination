-- Migration: Fix name display using invite_token and Option A (join to attempts)
-- Single source of truth: names come from attempts table via join
-- All RPCs use invite_token (not token)

-- ============================================
-- 1. RPC: get_compare_inviter_display_name_by_token
-- Returns inviter name from attempts table via join
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_inviter_display_name_by_token(p_invite_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
BEGIN
  -- Get inviter name from attempts table via join
  SELECT 
    TRIM(
      CONCAT(
        COALESCE(a.user_first_name, ''),
        CASE WHEN a.user_last_name IS NOT NULL AND a.user_last_name != '' 
          THEN ' ' || a.user_last_name 
          ELSE '' 
        END
      )
    )
  INTO display_name
  FROM compare_sessions cs
  JOIN attempts a ON a.id = cs.attempt_a_id
  WHERE trim(cs.invite_token) = trim(p_invite_token)
    AND (cs.expires_at IS NULL OR cs.expires_at > now())
    AND cs.status = 'pending'
  LIMIT 1;

  -- Return empty string if not found (UI will use fallback)
  RETURN COALESCE(display_name, '');
END;
$$;

-- ============================================
-- 2. RPC: get_compare_session_by_invite_token
-- Returns session metadata with attempt ids
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_session_by_invite_token(p_invite_token text)
RETURNS TABLE (
  id uuid,
  invite_token text,
  attempt_a_id uuid,
  attempt_b_id uuid,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  opened_at timestamptz,
  inviter_first_name text,
  inviter_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.invite_token,
    cs.attempt_a_id,
    cs.attempt_b_id,
    cs.status,
    cs.created_at,
    cs.expires_at,
    cs.opened_at,
    -- Get inviter name from attempts table
    a.user_first_name as inviter_first_name,
    a.user_last_name as inviter_last_name
  FROM compare_sessions cs
  JOIN attempts a ON a.id = cs.attempt_a_id
  WHERE trim(cs.invite_token) = trim(p_invite_token);
END;
$$;

-- ============================================
-- 3. Update get_compare_payload_by_token to use invite_token and return names
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_payload_by_token(p_invite_token text)
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
  name_a text,
  name_b text
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
  -- Rate limiting (if table exists)
  BEGIN
    token_hash_val := hash_token_for_rate_limit(p_invite_token);

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
      NULL;
  END;

  -- Return payload with names from attempts table
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
    cs.invite_token,
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
    -- name_a: full name from attempts table
    TRIM(
      CONCAT(
        COALESCE(a.user_first_name, ''),
        CASE WHEN a.user_last_name IS NOT NULL AND a.user_last_name != '' 
          THEN ' ' || a.user_last_name 
          ELSE '' 
        END
      )
    ) as name_a,
    -- name_b: full name from attempts table (if attempt_b exists)
    CASE WHEN b.id IS NOT NULL THEN
      TRIM(
        CONCAT(
          COALESCE(b.user_first_name, ''),
          CASE WHEN b.user_last_name IS NOT NULL AND b.user_last_name != '' 
            THEN ' ' || b.user_last_name 
            ELSE '' 
          END
        )
      )
    ELSE NULL END as name_b
  FROM compare_sessions cs
  JOIN attempts a ON a.id = cs.attempt_a_id
  LEFT JOIN attempts b ON b.id = cs.attempt_b_id
  WHERE trim(cs.invite_token) = trim(p_invite_token)
    AND (
      (cs.expires_at IS NULL OR cs.expires_at > now())
      OR cs.status = 'completed'
    );
END;
$$;

-- ============================================
-- 4. Update get_compare_token_by_token to use invite_token
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_token_by_token(p_invite_token text)
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
    -- Get inviter name from attempts table
    a.user_first_name as inviter_first_name,
    a.user_last_name as inviter_last_name,
    cs.opened_at
  FROM public.compare_sessions cs
  JOIN attempts a ON a.id = cs.attempt_a_id
  WHERE trim(cs.invite_token) = trim(p_invite_token)
  LIMIT 1;
$$;

-- ============================================
-- 5. RPC: mark_compare_invite_opened (idempotent)
-- ============================================

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
-- 6. Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_compare_inviter_display_name_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_inviter_display_name_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_session_by_invite_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_session_by_invite_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_token_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_token_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_compare_invite_opened(text) TO anon;
GRANT EXECUTE ON FUNCTION mark_compare_invite_opened(text) TO authenticated;

-- ============================================
-- 6. Update complete_compare_session to use invite_token
-- ============================================

CREATE OR REPLACE FUNCTION complete_compare_session(p_invite_token text, p_attempt_b_id uuid)
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
BEGIN
  -- Trim the input token
  trimmed_token := trim(p_invite_token);

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

GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO authenticated;

-- ============================================
-- 7. Update get_compare_session_by_token to use invite_token
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
    -- Get inviter name from attempts table
    a.user_first_name as inviter_first_name,
    a.user_last_name as inviter_last_name,
    -- Get invitee name from attempts table (if attempt_b exists)
    b.user_first_name as invitee_first_name,
    b.user_last_name as invitee_last_name
  FROM compare_sessions cs
  LEFT JOIN attempts a ON a.id = cs.attempt_a_id
  LEFT JOIN attempts b ON b.id = cs.attempt_b_id
  WHERE trim(cs.invite_token) = trim(token_param);
END;
$$;

GRANT EXECUTE ON FUNCTION get_compare_session_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_session_by_token(text) TO authenticated;

-- ============================================
-- 8. Reload PostgREST schema cache
-- ============================================

SELECT pg_notify('pgrst', 'reload schema');

