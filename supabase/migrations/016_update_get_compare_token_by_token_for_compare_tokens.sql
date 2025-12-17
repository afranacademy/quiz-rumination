-- Migration: Update get_compare_token_by_token to use compare_tokens table
-- Changes from compare_sessions to compare_tokens as single source of truth

CREATE OR REPLACE FUNCTION get_compare_token_by_token(p_token text)
RETURNS TABLE (
  token text,
  status text,
  expires_at timestamptz,
  attempt_a_id uuid,
  attempt_b_id uuid,
  compare_id text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ct.token,
    ct.status,
    ct.expires_at,
    ct.attempt_a_id,
    ct.attempt_b_id,
    ct.token as compare_id
  FROM public.compare_tokens ct
  WHERE trim(ct.token) = trim(p_token)
  LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_compare_token_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_compare_token_by_token(text) TO authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

