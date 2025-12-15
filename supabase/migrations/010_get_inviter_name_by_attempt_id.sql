-- Migration: Get inviter name by attempt ID (SECURITY DEFINER)
-- This function bypasses RLS to fetch user names for invite pages

CREATE OR REPLACE FUNCTION get_inviter_name_by_attempt_id(p_attempt_id uuid)
RETURNS TABLE (
  user_first_name text,
  user_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.user_first_name,
    a.user_last_name
  FROM attempts a
  WHERE a.id = p_attempt_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_inviter_name_by_attempt_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_inviter_name_by_attempt_id(uuid) TO authenticated;

