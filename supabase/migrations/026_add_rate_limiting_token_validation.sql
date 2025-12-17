-- Migration: Add rate limiting to compare token validation
-- Prevents abuse by limiting validation attempts per token per minute
-- Rate limit: 30 validations per token per minute

-- Create rate limit tracking table for token validation
CREATE TABLE IF NOT EXISTS compare_token_validation_rate_limits (
  token_hash text PRIMARY KEY, -- MD5 hash of token (for privacy, not security)
  validation_count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_compare_token_validation_rate_limits_window_start 
  ON compare_token_validation_rate_limits(window_start);

-- Helper function to hash token for rate limiting (MD5 for speed, not security)
CREATE OR REPLACE FUNCTION hash_token_for_rate_limit(token_param text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN md5(trim(token_param));
END;
$$;

-- Add rate limiting to get_compare_payload_by_token
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
  b_user_last_name text
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

  -- Check rate limit
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
    b.user_last_name as b_user_last_name
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

-- Grant execute permissions (unchanged)
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO authenticated;

-- Cleanup function to remove old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_token_validation_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete records older than 2 hours (beyond any active rate limit window)
  DELETE FROM compare_token_validation_rate_limits
  WHERE window_start < now() - interval '2 hours';
END;
$$;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

