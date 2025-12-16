-- Migration: Add get_compare_token_by_token RPC
-- Returns token info for invite page validation (replaces direct table access)
-- Note: Uses compare_sessions table (invite_token column) as that's the actual table name

-- ============================================
-- Function: get_compare_token_by_token
-- Returns token row if valid (does not filter by expiry - frontend handles that)
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_token_by_token(p_token text)
RETURNS TABLE (
  token text,
  status text,
  expires_at timestamptz,
  attempt_a_id uuid,
  attempt_b_id uuid,
  compare_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.invite_token as token,
    cs.status,
    cs.expires_at,
    cs.attempt_a_id,
    cs.attempt_b_id,
    cs.id as compare_id
  FROM public.compare_sessions cs
  WHERE cs.invite_token = p_token
  LIMIT 1;
$$;

-- ============================================
-- Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_compare_token_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_compare_token_by_token(text) TO authenticated;

-- ============================================
-- Reload PostgREST schema cache
-- ============================================
-- Run this query to refresh the schema cache:
-- SELECT pg_notify('pgrst', 'reload schema');

