-- Migration: Update create_compare_invite to use compare_tokens table
-- Changes from compare_sessions to compare_tokens as single source of truth
-- This RPC should call get_or_create_pending_compare_token internally

CREATE OR REPLACE FUNCTION create_compare_invite(
  p_attempt_a_id uuid,
  p_expires_in_minutes int DEFAULT 10080  -- 7 days = 10080 minutes
)
RETURNS TABLE (
  session_id text,
  invite_token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_result text;
  expires_result timestamptz;
  compare_id_result text;
  status_result text;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Use get_or_create_pending_compare_token to get/create token
  SELECT token, expires_at, compare_id, status
  INTO token_result, expires_result, compare_id_result, status_result
  FROM get_or_create_pending_compare_token(p_attempt_a_id, p_expires_in_minutes);

  -- Return in format expected by frontend
  RETURN QUERY SELECT 
    compare_id_result as session_id,
    token_result as invite_token,
    expires_result as expires_at;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

