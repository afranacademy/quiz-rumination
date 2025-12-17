-- Migration: Fix get_compare_payload_by_token to use compare_tokens with correct fields
-- Returns session_id (token), quiz_id, status, expires_at, attempt_a_id, attempt_b_id, attempt_a jsonb, attempt_b jsonb
-- Allows completed tokens even if expires_at check would fail

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
BEGIN
  RETURN QUERY
  SELECT 
    ct.token as session_id,  -- Use token as session_id
    COALESCE(a.quiz_id::text, NULL::text) as quiz_id,  -- Get quiz_id from attempt A if available
    ct.status,
    ct.expires_at,
    ct.attempt_a_id,
    ct.attempt_b_id,
    -- Return full attempt A as jsonb
    to_jsonb(a.*) as attempt_a,
    -- Return full attempt B as jsonb (may be NULL)
    CASE WHEN b.id IS NOT NULL THEN to_jsonb(b.*) ELSE NULL::jsonb END as attempt_b,
    ct.token as invite_token,
    -- Attempt A fields (flattened for backward compatibility)
    a.total_score::numeric as a_total_score,
    a.dimension_scores as a_dimension_scores,
    a.score_band_id as a_score_band_id,
    NULL::text as a_score_band_title,
    a.user_first_name as a_user_first_name,
    a.user_last_name as a_user_last_name,
    -- Attempt B fields (may be NULL if not completed)
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
      -- Allow if not expired OR if status is completed (completed tokens are always valid)
      (ct.expires_at IS NULL OR ct.expires_at > now())
      OR ct.status = 'completed'
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

