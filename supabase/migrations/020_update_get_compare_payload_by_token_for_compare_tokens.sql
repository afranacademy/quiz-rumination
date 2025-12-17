-- Migration: Update get_compare_payload_by_token to use compare_tokens table
-- Changes from compare_sessions to compare_tokens as single source of truth

CREATE OR REPLACE FUNCTION get_compare_payload_by_token(p_token text)
RETURNS TABLE (
  session_id text,
  status text,
  invite_token text,
  attempt_a_id uuid,
  attempt_b_id uuid,
  expires_at timestamptz,
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
    ct.token as session_id,  -- Use token as session_id (compare_tokens doesn't have id column)
    ct.status,
    ct.token as invite_token,
    ct.attempt_a_id,
    ct.attempt_b_id,
    ct.expires_at,
    -- Attempt A fields
    a.total_score::numeric as a_total_score,
    a.dimension_scores as a_dimension_scores,
    a.score_band_id as a_score_band_id,
    NULL::text as a_score_band_title, -- score_bands table may not have title column
    a.user_first_name as a_user_first_name,
    a.user_last_name as a_user_last_name,
    -- Attempt B fields (may be NULL if not completed)
    b.total_score::numeric as b_total_score,
    b.dimension_scores as b_dimension_scores,
    b.score_band_id as b_score_band_id,
    NULL::text as b_score_band_title, -- score_bands table may not have title column
    b.user_first_name as b_user_first_name,
    b.user_last_name as b_user_last_name
  FROM compare_tokens ct
  LEFT JOIN attempts a ON a.id = ct.attempt_a_id
  LEFT JOIN attempts b ON b.id = ct.attempt_b_id
  WHERE trim(ct.token) = trim(p_token);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

