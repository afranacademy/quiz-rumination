-- Migration: Create get_or_create_pending_compare_token for compare_tokens table
-- Returns existing pending token if available, otherwise creates new one
-- Works with compare_tokens table (not compare_sessions)

-- Enable pgcrypto extension if not already enabled (for gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Look for existing pending token for this attempt (not expired, not superseded)
  SELECT ct.token, ct.expires_at, ct.status
  INTO existing_token, existing_expires_at, existing_status
  FROM compare_tokens ct
  WHERE ct.attempt_a_id = p_attempt_a_id
    AND ct.status = 'pending'
    AND (ct.expires_at IS NULL OR ct.expires_at > now())
  ORDER BY ct.updated_at DESC NULLS LAST, ct.expires_at DESC NULLS LAST
  LIMIT 1;

  -- If existing token found, return it
  IF existing_token IS NOT NULL THEN
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

  -- Create new token in compare_tokens
  INSERT INTO compare_tokens (token, attempt_a_id, status, expires_at, updated_at)
  VALUES (
    new_token,
    p_attempt_a_id,
    'pending',
    new_expires_at,
    now()
  );

  RETURN QUERY SELECT new_token, new_expires_at, new_token as compare_id, 'pending'::text;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_pending_compare_token(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_pending_compare_token(uuid, int) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

