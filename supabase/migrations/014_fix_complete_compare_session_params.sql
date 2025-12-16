-- Migration: Fix complete_compare_session parameter names
-- Updates parameter names to match PostgREST convention (p_ prefix)
-- This fixes the 400 error when calling the RPC from the frontend

CREATE OR REPLACE FUNCTION complete_compare_session(p_token text, p_attempt_b_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id uuid;
  current_status text;
  current_attempt_b_id uuid;
  rows_updated integer;
BEGIN
  -- Get session with current state
  SELECT id, status, attempt_b_id INTO session_id, current_status, current_attempt_b_id
  FROM compare_sessions
  WHERE invite_token = p_token;

  IF session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found for token: %', p_token;
  END IF;

  -- Idempotent: If already completed with same attempt_b_id, return success
  IF current_status = 'completed' AND current_attempt_b_id = p_attempt_b_id THEN
    RETURN session_id;
  END IF;

  -- If already completed with different attempt_b_id, raise error
  IF current_status = 'completed' AND current_attempt_b_id != p_attempt_b_id THEN
    RAISE EXCEPTION 'Session already completed with different attempt_b_id. Current: %, Provided: %', 
      current_attempt_b_id, p_attempt_b_id;
  END IF;

  -- If not pending, raise error (should not happen if idempotent check passed)
  IF current_status != 'pending' THEN
    RAISE EXCEPTION 'Session is not pending (current status: %)', current_status;
  END IF;

  -- Validate attempt_b exists and is completed
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_b_id AND status = 'completed') THEN
    RAISE EXCEPTION 'Attempt B not found or not completed: %', p_attempt_b_id;
  END IF;

  -- Update session
  UPDATE compare_sessions
  SET attempt_b_id = p_attempt_b_id,
      status = 'completed'
  WHERE id = session_id;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  -- Verify update succeeded
  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'Failed to update compare session. No rows updated for session_id: %', session_id;
  END IF;

  RETURN session_id;
END;
$$;

-- Grant execute permissions (in case they don't exist)
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

