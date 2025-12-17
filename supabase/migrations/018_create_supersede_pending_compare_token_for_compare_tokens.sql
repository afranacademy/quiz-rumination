-- Migration: Create supersede_pending_compare_token for compare_tokens table
-- Marks existing pending tokens as expired and creates a new one
-- Works with compare_tokens table (not compare_sessions)

CREATE OR REPLACE FUNCTION supersede_pending_compare_token(
  p_attempt_a_id uuid,
  p_expires_in_minutes int DEFAULT 1440  -- 24 hours = 1440 minutes
)
RETURNS TABLE (
  token text,
  expires_at timestamptz,
  compare_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text;
  new_expires_at timestamptz;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Mark all existing pending tokens for this attempt as expired (set expires_at = now())
  UPDATE compare_tokens
  SET expires_at = now(),
      updated_at = now()
  WHERE attempt_a_id = p_attempt_a_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  -- Generate unique token (case-sensitive, no uppercase)
  LOOP
    new_token := substring(md5(random()::text || clock_timestamp()::text || p_attempt_a_id::text) from 1 for 32);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_tokens WHERE token = new_token);
  END LOOP;

  -- Calculate expiration
  new_expires_at := CASE 
    WHEN p_expires_in_minutes IS NULL THEN NULL
    ELSE now() + (p_expires_in_minutes || ' minutes')::interval
  END;

  -- Create new token in compare_tokens
  INSERT INTO compare_tokens (token, attempt_a_id, status, expires_at, updated_at)
  VALUES (
    new_token,
    p_attempt_a_id,
    'pending',
    new_expires_at,
    now()
  );

  RETURN QUERY SELECT new_token, new_expires_at, new_token as compare_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION supersede_pending_compare_token(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION supersede_pending_compare_token(uuid, int) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

