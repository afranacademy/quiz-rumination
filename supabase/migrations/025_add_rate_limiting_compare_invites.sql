-- Migration: Add rate limiting to compare invite creation
-- Prevents abuse by limiting invites per attempt_a_id per hour
-- Rate limit: 10 invites per attempt_a_id per hour

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS compare_invite_rate_limits (
  attempt_a_id uuid PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
  invite_count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_compare_invite_rate_limits_window_start 
  ON compare_invite_rate_limits(window_start);

-- Add rate limiting to create_compare_invite
-- This wraps the existing get_or_create_pending_compare_token call
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
  rate_limit_record compare_invite_rate_limits%ROWTYPE;
  RATE_LIMIT_COUNT int := 10;
  RATE_LIMIT_WINDOW interval := '1 hour';
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  -- Check rate limit
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
        -- Generic error message (no rate limit details)
        RAISE EXCEPTION 'Unable to process request';
      END IF;
      
      -- Increment count
      UPDATE compare_invite_rate_limits
      SET invite_count = invite_count + 1, updated_at = now()
      WHERE attempt_a_id = p_attempt_a_id;
    END IF;
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

-- Grant execute permissions (unchanged)
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO authenticated;

-- Cleanup function to remove old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete records older than 24 hours (beyond any active rate limit window)
  DELETE FROM compare_invite_rate_limits
  WHERE window_start < now() - interval '24 hours';
END;
$$;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

