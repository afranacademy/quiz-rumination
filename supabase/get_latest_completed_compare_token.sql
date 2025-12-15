-- RPC function to get the latest completed compare session token
-- This is a DEV-only helper function for local development
-- Returns the invite_token of the most recent completed compare session

CREATE OR REPLACE FUNCTION public.get_latest_completed_compare_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT invite_token INTO v_token
  FROM public.compare_sessions
  WHERE status = 'completed'
    AND attempt_a_id IS NOT NULL
    AND attempt_b_id IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_token;
END;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_latest_completed_compare_token() TO anon;
GRANT EXECUTE ON FUNCTION public.get_latest_completed_compare_token() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_latest_completed_compare_token() IS 
'DEV helper: Returns the invite_token of the most recent completed compare session. Returns NULL if no completed session exists.';

