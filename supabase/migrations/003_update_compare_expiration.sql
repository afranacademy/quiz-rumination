-- Migration: Update Compare Invite Expiration
-- Updates create_compare_invite to default to 7 days (10080 minutes)
-- Ensures get_compare_session_by_token filters by expires_at properly

-- ============================================
-- 1. Update create_compare_invite to accept expires_in_minutes parameter
-- ============================================

CREATE OR REPLACE FUNCTION create_compare_invite(
  p_attempt_a_id uuid,
  p_expires_in_minutes int DEFAULT 10080  -- 7 days = 10080 minutes
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text;
  session_id uuid;
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = p_attempt_a_id) THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_a_id;
  END IF;

  -- Generate unique token (hex format)
  LOOP
    new_token := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_sessions WHERE invite_token = new_token);
  END LOOP;

  -- Create session with expiration
  INSERT INTO compare_sessions (invite_token, attempt_a_id, status, expires_at)
  VALUES (
    new_token, 
    p_attempt_a_id, 
    'pending', 
    CASE 
      WHEN p_expires_in_minutes IS NULL THEN NULL
      ELSE now() + (p_expires_in_minutes || ' minutes')::interval
    END
  )
  RETURNING id INTO session_id;

  RETURN new_token;
END;
$$;

-- ============================================
-- 2. Update get_compare_session_by_token to filter by expires_at
-- ============================================

CREATE OR REPLACE FUNCTION get_compare_session_by_token(token_param text)
RETURNS TABLE (
  id uuid,
  attempt_a_id uuid,
  attempt_b_id uuid,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.attempt_a_id,
    cs.attempt_b_id,
    cs.status,
    cs.created_at,
    cs.expires_at
  FROM compare_sessions cs
  WHERE cs.invite_token = token_param
    AND (cs.expires_at IS NULL OR cs.expires_at > now());
END;
$$;

-- ============================================
-- 3. Grant execute permissions (if not already granted)
-- ============================================

GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION create_compare_invite(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compare_session_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_session_by_token(text) TO authenticated;

