-- Migration: Make complete_compare_session idempotent and robust
-- Allows re-completion if already completed with same attempt_b_id

CREATE OR REPLACE FUNCTION complete_compare_session(token_param text, attempt_b_id_param uuid)
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
  WHERE invite_token = token_param;

  IF session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found for token: %', token_param;
  END IF;

  -- Idempotent: If already completed with same attempt_b_id, return success
  IF current_status = 'completed' AND current_attempt_b_id = attempt_b_id_param THEN
    IF import.meta.env.DEV THEN
      RAISE NOTICE 'Session already completed with same attempt_b_id: %', attempt_b_id_param;
    END IF;
    RETURN session_id;
  END IF;

  -- If already completed with different attempt_b_id, raise error
  IF current_status = 'completed' AND current_attempt_b_id != attempt_b_id_param THEN
    RAISE EXCEPTION 'Session already completed with different attempt_b_id. Current: %, Provided: %', 
      current_attempt_b_id, attempt_b_id_param;
  END IF;

  -- If not pending, raise error (should not happen if idempotent check passed)
  IF current_status != 'pending' THEN
    RAISE EXCEPTION 'Session is not pending (current status: %)', current_status;
  END IF;

  -- Validate attempt_b exists and is completed
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = attempt_b_id_param AND status = 'completed') THEN
    RAISE EXCEPTION 'Attempt B not found or not completed: %', attempt_b_id_param;
  END IF;

  -- Update session
  UPDATE compare_sessions
  SET attempt_b_id = attempt_b_id_param,
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

