-- Migration: Add name_a and name_b columns to compare_tokens
-- Fixes bug where nameA is not displayed in Invite modal and Compare pages
-- 
-- Steps:
-- 1. Add name_a and name_b columns to compare_tokens
-- 2. Update get_or_create_pending_compare_token to set name_a from attemptA
-- 3. Update get_compare_payload_by_token to return name_a and name_b with fallback
-- 4. Update complete_compare_session to set name_b when completing

-- ============================================
-- 1. Add name_a and name_b columns to compare_tokens
-- ============================================

-- Add name_a column (nullable, will be set from attemptA when creating/updating token)
ALTER TABLE compare_tokens 
  ADD COLUMN IF NOT EXISTS name_a text;

-- Add name_b column (nullable, will be set from attemptB when completing)
ALTER TABLE compare_tokens 
  ADD COLUMN IF NOT EXISTS name_b text;

-- ============================================
-- 2. Update get_or_create_pending_compare_token to set name_a
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_pending_compare_token(
  p_attempt_a_id uuid,
  p_expires_in_minutes int
)
RETURNS TABLE (
  token text,
  expires_at timestamptz,
  compare_id text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_token text;
  existing_expires_at timestamptz;
  existing_status text;
  new_token text;
  new_expires_at timestamptz;
  attempt_a_name text;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Get name from attemptA (user_first_name + user_last_name)
  SELECT 
    COALESCE(
      TRIM(CONCAT(COALESCE(user_first_name, ''), ' ', COALESCE(user_last_name, ''))),
      user_first_name,
      ''
    )
  INTO attempt_a_name
  FROM attempts
  WHERE id = p_attempt_a_id;

  -- Look for existing pending token for this attempt (not expired, not superseded)
  SELECT ct.token, ct.expires_at, ct.status
  INTO existing_token, existing_expires_at, existing_status
  FROM compare_tokens ct
  WHERE ct.attempt_a_id = p_attempt_a_id
    AND ct.status = 'pending'
    AND (ct.expires_at IS NULL OR ct.expires_at > now())
  ORDER BY ct.updated_at DESC NULLS LAST, ct.expires_at DESC NULLS LAST
  LIMIT 1;

  -- If existing token found, update name_a if it's null or different (idempotent)
  IF existing_token IS NOT NULL THEN
    -- Update name_a if it's null or different (idempotent update)
    UPDATE compare_tokens
    SET name_a = COALESCE(name_a, attempt_a_name),
        updated_at = now()
    WHERE token = existing_token
      AND (name_a IS NULL OR name_a != attempt_a_name);
    
    RETURN QUERY SELECT existing_token, existing_expires_at, existing_token as compare_id, existing_status;
    RETURN;
  END IF;

  -- No existing token, create new one
  -- Generate unique token using pgcrypto gen_random_bytes (case-sensitive, 32 chars)
  LOOP
    -- Use gen_random_bytes for cryptographically secure random token
    new_token := encode(gen_random_bytes(16), 'hex');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_tokens WHERE token = new_token);
  END LOOP;

  -- Calculate expiration
  new_expires_at := CASE 
    WHEN p_expires_in_minutes IS NULL THEN NULL
    ELSE now() + (p_expires_in_minutes || ' minutes')::interval
  END;

  -- Create new token in compare_tokens with name_a
  INSERT INTO compare_tokens (token, attempt_a_id, status, expires_at, updated_at, name_a)
  VALUES (
    new_token,
    p_attempt_a_id,
    'pending',
    new_expires_at,
    now(),
    attempt_a_name
  );

  RETURN QUERY SELECT new_token, new_expires_at, new_token as compare_id, 'pending'::text;
END;
$$;

-- ============================================
-- 3. Update get_compare_payload_by_token to return name_a and name_b with fallback
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
  -- Hash token for rate limiting
  token_hash_val := hash_token_for_rate_limit(p_token);

  -- Check rate limit (if table exists)
  BEGIN
    SELECT * INTO rate_limit_record
    FROM compare_token_validation_rate_limits
    WHERE token_hash = token_hash_val;

    IF rate_limit_record IS NULL THEN
      -- First request for this token - initialize
      INSERT INTO compare_token_validation_rate_limits (token_hash, validation_count, window_start)
      VALUES (token_hash_val, 1, now())
      ON CONFLICT (token_hash) DO UPDATE
        SET validation_count = 1, window_start = now(), updated_at = now();
    ELSE
      -- Check if window has expired
      IF now() - rate_limit_record.window_start > RATE_LIMIT_WINDOW THEN
        -- Reset window
        UPDATE compare_token_validation_rate_limits
        SET validation_count = 1, window_start = now(), updated_at = now()
        WHERE token_hash = token_hash_val;
      ELSE
        -- Check if limit exceeded
        IF rate_limit_record.validation_count >= RATE_LIMIT_COUNT THEN
          -- Generic error message (no rate limit details)
          RAISE EXCEPTION 'Unable to process request';
        END IF;
        
        -- Increment count
        UPDATE compare_token_validation_rate_limits
        SET validation_count = validation_count + 1, updated_at = now()
        WHERE token_hash = token_hash_val;
      END IF;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Rate limit table doesn't exist yet, skip rate limiting
      NULL;
  END;

  -- Proceed with normal token validation
  RETURN QUERY
  SELECT 
    ct.token as session_id,
    COALESCE(a.quiz_id::text, NULL::text) as quiz_id,
    ct.status,
    ct.expires_at,
    ct.attempt_a_id,
    ct.attempt_b_id,
    to_jsonb(a.*) as attempt_a,
    CASE WHEN b.id IS NOT NULL THEN to_jsonb(b.*) ELSE NULL::jsonb END as attempt_b,
    ct.token as invite_token,
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
    -- Return name_a with fallback to attemptA participant name
    COALESCE(
      ct.name_a,
      TRIM(CONCAT(COALESCE(a.user_first_name, ''), ' ', COALESCE(a.user_last_name, ''))),
      a.user_first_name,
      ''
    ) as name_a,
    -- Return name_b with fallback to attemptB participant name
    COALESCE(
      ct.name_b,
      CASE WHEN b.id IS NOT NULL THEN
        TRIM(CONCAT(COALESCE(b.user_first_name, ''), ' ', COALESCE(b.user_last_name, '')))
      ELSE NULL END,
      CASE WHEN b.id IS NOT NULL THEN b.user_first_name ELSE NULL END,
      NULL
    ) as name_b
  FROM compare_tokens ct
  JOIN attempts a ON a.id = ct.attempt_a_id
  LEFT JOIN attempts b ON b.id = ct.attempt_b_id
  WHERE trim(ct.token) = trim(p_token)
    AND (
      (ct.expires_at IS NULL OR ct.expires_at > now())
      OR ct.status = 'completed'
    );
END;
$$;

-- ============================================
-- 4. Update complete_compare_session to set name_b
-- ============================================

CREATE OR REPLACE FUNCTION complete_compare_session(p_token text, p_attempt_b_id uuid)
RETURNS TABLE (
  compare_id text,
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
  found_token text;
  found_attempt_a_id uuid;
  found_attempt_b_id uuid;
  found_status text;
  found_expires_at timestamptz;
  rows_updated integer;
  attempt_b_name text;
BEGIN
  -- Trim the input token (case-sensitive matching, tokens stored exactly as generated)
  trimmed_token := trim(p_token);

  -- Get name from attemptB (user_first_name + user_last_name)
  SELECT 
    COALESCE(
      TRIM(CONCAT(COALESCE(user_first_name, ''), ' ', COALESCE(user_last_name, ''))),
      user_first_name,
      ''
    )
  INTO attempt_b_name
  FROM attempts
  WHERE id = p_attempt_b_id;

  -- Get token with current state from compare_tokens table
  SELECT token, attempt_a_id, attempt_b_id, status, expires_at
  INTO found_token, found_attempt_a_id, found_attempt_b_id, found_status, found_expires_at
  FROM compare_tokens
  WHERE token = trimmed_token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  -- If token not found or expired, raise exception
  IF found_token IS NULL THEN
    -- Check if token exists but is expired
    IF EXISTS (
      SELECT 1 FROM compare_tokens 
      WHERE token = trimmed_token 
        AND (expires_at IS NOT NULL AND expires_at <= now())
    ) THEN
      RAISE EXCEPTION 'invite token expired';
    END IF;
    -- Token doesn't exist
    RAISE EXCEPTION 'invite token not found';
  END IF;

  -- Idempotent: If already completed with same attempt_b_id, return current state
  IF found_status = 'completed' AND found_attempt_b_id = p_attempt_b_id THEN
    RETURN QUERY SELECT 
      found_token as compare_id,
      found_token as token,
      found_status as status,
      found_attempt_a_id as attempt_a_id,
      found_attempt_b_id as attempt_b_id,
      found_expires_at as expires_at;
    RETURN;
  END IF;

  -- If already completed with different attempt_b_id, raise error
  IF found_status = 'completed' AND found_attempt_b_id != p_attempt_b_id THEN
    RAISE EXCEPTION 'Session already completed with different attempt_b_id. Current: %, Provided: %', 
      found_attempt_b_id, p_attempt_b_id;
  END IF;

  -- Validate attempt_b exists and is completed
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_b_id AND status = 'completed') THEN
    RAISE EXCEPTION 'Attempt B not found or not completed: %', p_attempt_b_id;
  END IF;

  -- Update token: set attempt_b_id, status='completed', name_b, and updated_at=now()
  UPDATE compare_tokens
  SET attempt_b_id = p_attempt_b_id,
      status = 'completed',
      name_b = attempt_b_name,
      updated_at = now()
  WHERE token = trimmed_token;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  -- Verify update succeeded
  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'Failed to update compare token. No rows updated for token: %', trimmed_token;
  END IF;

  -- Return the updated row
  RETURN QUERY
  SELECT 
    ct.token as compare_id,
    ct.token as token,
    ct.status as status,
    ct.attempt_a_id as attempt_a_id,
    ct.attempt_b_id as attempt_b_id,
    ct.expires_at as expires_at
  FROM compare_tokens ct
  WHERE ct.token = trimmed_token;
END;
$$;

-- ============================================
-- 5. Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_or_create_pending_compare_token(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_pending_compare_token(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO authenticated;

-- ============================================
-- 6. Update get_compare_token_by_token to return name_a
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_token_by_token(p_token text)
RETURNS TABLE (
  token text,
  status text,
  expires_at timestamptz,
  attempt_a_id uuid,
  attempt_b_id uuid,
  compare_id text,
  name_a text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ct.token,
    ct.status,
    ct.expires_at,
    ct.attempt_a_id,
    ct.attempt_b_id,
    ct.token as compare_id,
    -- Return name_a with fallback to attemptA participant name
    COALESCE(
      ct.name_a,
      TRIM(CONCAT(COALESCE(a.user_first_name, ''), ' ', COALESCE(a.user_last_name, ''))),
      a.user_first_name,
      ''
    ) as name_a
  FROM public.compare_tokens ct
  LEFT JOIN attempts a ON a.id = ct.attempt_a_id
  WHERE trim(ct.token) = trim(p_token)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_compare_token_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_compare_token_by_token(text) TO authenticated;

-- ============================================
-- 7. Reload PostgREST schema cache
-- ============================================

SELECT pg_notify('pgrst', 'reload schema');

