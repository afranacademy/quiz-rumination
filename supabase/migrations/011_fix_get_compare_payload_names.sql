-- Migration: Fix get_compare_payload_by_token to ensure names are returned
-- This ensures user_first_name and user_last_name are correctly retrieved from attempts table

CREATE OR REPLACE FUNCTION get_compare_payload_by_token(p_token text)
RETURNS TABLE (
  session_id uuid,
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
    cs.id as session_id,
    cs.status,
    cs.invite_token,
    cs.attempt_a_id,
    cs.attempt_b_id,
    cs.expires_at,
    -- Attempt A fields
    a.total_score::numeric as a_total_score,
    a.dimension_scores as a_dimension_scores,
    a.score_band_id as a_score_band_id,
    NULL::text as a_score_band_title, -- score_bands table may not have title column
    -- CRITICAL: Ensure names are retrieved from attempts table
    -- Use explicit column reference to ensure JOIN works correctly
    a.user_first_name as a_user_first_name,
    a.user_last_name as a_user_last_name,
    -- Attempt B fields (may be NULL if not completed)
    b.total_score::numeric as b_total_score,
    b.dimension_scores as b_dimension_scores,
    b.score_band_id as b_score_band_id,
    NULL::text as b_score_band_title, -- score_bands table may not have title column
    -- CRITICAL: Ensure names are retrieved from attempts table
    -- Use explicit column reference to ensure JOIN works correctly
    b.user_first_name as b_user_first_name,
    b.user_last_name as b_user_last_name
  FROM compare_sessions cs
  LEFT JOIN attempts a ON a.id = cs.attempt_a_id
  LEFT JOIN attempts b ON b.id = cs.attempt_b_id
  WHERE cs.invite_token = p_token;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_payload_by_token(text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_compare_payload_by_token(text) IS 
  'Returns compare session data with attempt details including user names. 
   Names are retrieved from attempts.user_first_name and attempts.user_last_name.
   Returns flat structure with a_user_first_name, a_user_last_name, b_user_first_name, b_user_last_name.';

