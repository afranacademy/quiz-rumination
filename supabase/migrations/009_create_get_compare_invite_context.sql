-- Migration: Create get_compare_invite_context RPC function
-- Returns minimal data needed for invite landing page (inviter name + session validity)

CREATE OR REPLACE FUNCTION get_compare_invite_context(p_token text)
RETURNS TABLE (
  invite_token text,
  status text,
  expires_at timestamptz,
  attempt_a_id uuid,
  inviter_first_name text,
  inviter_last_name text,
  inviter_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.invite_token,
    cs.status,
    cs.expires_at,
    cs.attempt_a_id,
    a.user_first_name as inviter_first_name,
    a.user_last_name as inviter_last_name,
    a.user_phone as inviter_phone
  FROM compare_sessions cs
  LEFT JOIN attempts a ON a.id = cs.attempt_a_id
  WHERE cs.invite_token = p_token;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_compare_invite_context(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_invite_context(text) TO authenticated;

