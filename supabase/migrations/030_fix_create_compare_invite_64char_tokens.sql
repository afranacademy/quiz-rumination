-- Migration: Fix create_compare_invite to generate 64-character tokens
-- Updates token generation from MD5 substring (20 chars) to encode(gen_random_bytes(32), 'hex') (64 chars)
-- Ensures all invite tokens are exactly 64 hex characters

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Update create_compare_invite to generate 64-char tokens
-- ============================================

CREATE OR REPLACE FUNCTION create_compare_invite(
  p_attempt_a_id uuid,
  p_expires_in_minutes int DEFAULT 10080  -- 7 days = 10080 minutes
)
RETURNS TABLE (
  session_id uuid,
  invite_token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text;
  new_session_id uuid;
  new_expires_at timestamptz;
  inviter_first_name_val text;
  inviter_last_name_val text;
  rate_limit_record compare_invite_rate_limits%ROWTYPE;
  RATE_LIMIT_COUNT int := 10;
  RATE_LIMIT_WINDOW interval := '1 hour';
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Rate limiting (if table exists)
  BEGIN
    SELECT * INTO rate_limit_record
    FROM compare_invite_rate_limits
    WHERE attempt_a_id = p_attempt_a_id;

    IF rate_limit_record IS NULL THEN
      -- First request for this attempt - initialize
      INSERT INTO compare_invite_rate_limits (attempt_a_id, invite_count, window_start)
      VALUES (p_attempt_a_id, 1, now())
      ON CONFLICT (attempt_a_id) DO UPDATE
        SET invite_count = 1, window_start = now(), updated_at = now();
    ELSE
      -- Check if window has expired
      IF now() - rate_limit_record.window_start > RATE_LIMIT_WINDOW THEN
        -- Reset window
        UPDATE compare_invite_rate_limits
        SET invite_count = 1, window_start = now(), updated_at = now()
        WHERE attempt_a_id = p_attempt_a_id;
      ELSE
        -- Check if limit exceeded
        IF rate_limit_record.invite_count >= RATE_LIMIT_COUNT THEN
          RAISE EXCEPTION 'Unable to process request';
        END IF;
        
        -- Increment count
        UPDATE compare_invite_rate_limits
        SET invite_count = invite_count + 1, updated_at = now()
        WHERE attempt_a_id = p_attempt_a_id;
      END IF;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      NULL; -- Rate limit table doesn't exist, skip rate limiting
  END;

  -- Get inviter name from attempt A
  SELECT 
    COALESCE(user_first_name, ''),
    COALESCE(user_last_name, '')
  INTO inviter_first_name_val, inviter_last_name_val
  FROM attempts
  WHERE id = p_attempt_a_id;

  -- Generate unique 64-character token using pgcrypto
  LOOP
    -- Use gen_random_bytes(32) for 64 hex characters (32 bytes = 64 hex chars)
    new_token := encode(gen_random_bytes(32), 'hex');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_sessions WHERE invite_token = new_token);
  END LOOP;

  -- Calculate expiration
  new_expires_at := CASE 
    WHEN p_expires_in_minutes IS NULL THEN NULL
    ELSE now() + (p_expires_in_minutes || ' minutes')::interval
  END;

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
    p_attempt_a_id, 
    'pending', 
    new_expires_at,
    inviter_first_name_val,
    inviter_last_name_val
  )
  RETURNING id INTO new_session_id;

  -- Return in format expected by frontend
  RETURN QUERY SELECT 
    new_session_id as session_id,
    new_token as invite_token,
    new_expires_at as expires_at;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

