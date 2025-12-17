-- Migration: Update complete_compare_session to use compare_tokens table
-- Updates the RPC function to look up tokens in public.compare_tokens instead of compare_sessions
-- Uses trim(p_token) for lookup, checks status='pending' and expires_at > now()
-- Returns useful payload with compare_id (token), status, attempt_a_id, attempt_b_id, expires_at

-- ============================================
-- Function: complete_compare_session
-- Updated to use compare_tokens table with trim() for token matching
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
BEGIN
  -- Trim the input token (case-sensitive matching, tokens stored exactly as generated)
  trimmed_token := trim(p_token);

  -- Get token with current state from compare_tokens table
  -- Match against exact token (stored exactly as generated, case-sensitive)
  -- Check status='pending' and expires_at > now()
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

  -- Update token: set attempt_b_id, status='completed', and updated_at=now()
  UPDATE compare_tokens
  SET attempt_b_id = p_attempt_b_id,
      status = 'completed',
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
-- Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO authenticated;

-- ============================================
-- Reload PostgREST schema cache
-- ============================================

SELECT pg_notify('pgrst', 'reload schema');

