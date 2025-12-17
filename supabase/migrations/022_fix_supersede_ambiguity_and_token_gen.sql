-- Migration: Fix supersede_pending_compare_token ambiguity error and improve token generation
-- Fixes "column reference status is ambiguous" by using table aliases
-- Uses pgcrypto gen_random_bytes for better token generation

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  -- Use fully qualified column names with table alias to avoid ambiguity
  UPDATE compare_tokens ct
  SET expires_at = now(),
      updated_at = now()
  WHERE ct.attempt_a_id = p_attempt_a_id
    AND ct.status = 'pending'
    AND (ct.expires_at IS NULL OR ct.expires_at > now());

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

  RETURN QUERY SELECT new_token, new_expires_at, new_token as compare_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION supersede_pending_compare_token(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION supersede_pending_compare_token(uuid, int) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

