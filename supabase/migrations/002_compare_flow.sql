-- Migration: Compare Flow Setup
-- This migration sets up the compare sessions table and RPC functions for secure token-based access

-- ============================================
-- 1. Update attempts table schema (if needed)
-- ============================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add user_first_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attempts' AND column_name = 'user_first_name') THEN
    ALTER TABLE attempts ADD COLUMN user_first_name text;
    -- Migrate existing first_name data
    UPDATE attempts SET user_first_name = first_name WHERE first_name IS NOT NULL;
  END IF;

  -- Add user_last_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attempts' AND column_name = 'user_last_name') THEN
    ALTER TABLE attempts ADD COLUMN user_last_name text;
  END IF;

  -- Add user_phone if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attempts' AND column_name = 'user_phone') THEN
    ALTER TABLE attempts ADD COLUMN user_phone text;
  END IF;

  -- Add dimension_scores if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attempts' AND column_name = 'dimension_scores') THEN
    ALTER TABLE attempts ADD COLUMN dimension_scores jsonb;
  END IF;

  -- Add answers column if missing (for new format)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attempts' AND column_name = 'answers') THEN
    ALTER TABLE attempts ADD COLUMN answers jsonb;
    -- Migrate existing answers_raw data
    UPDATE attempts SET answers = answers_raw WHERE answers_raw IS NOT NULL;
  END IF;
END $$;

-- Make required columns NOT NULL (only for new rows)
ALTER TABLE attempts 
  ALTER COLUMN user_first_name SET DEFAULT '',
  ALTER COLUMN user_last_name SET DEFAULT '',
  ALTER COLUMN user_phone SET DEFAULT '';

-- ============================================
-- 2. Create compare_sessions table
-- ============================================

CREATE TABLE IF NOT EXISTS compare_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  invite_token text UNIQUE NOT NULL,
  attempt_a_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  attempt_b_id uuid REFERENCES attempts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  expires_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compare_sessions_token ON compare_sessions(invite_token);
CREATE INDEX IF NOT EXISTS idx_compare_sessions_attempt_a ON compare_sessions(attempt_a_id);
CREATE INDEX IF NOT EXISTS idx_compare_sessions_attempt_b ON compare_sessions(attempt_b_id);
CREATE INDEX IF NOT EXISTS idx_compare_sessions_status ON compare_sessions(status);

-- ============================================
-- 3. Enable RLS on compare_sessions
-- ============================================

ALTER TABLE compare_sessions ENABLE ROW LEVEL SECURITY;

-- Deny direct SELECT to anon (access only via RPC)
CREATE POLICY "No direct select on compare_sessions" ON compare_sessions
  FOR SELECT
  USING (false);

-- Deny direct INSERT/UPDATE to anon (access only via RPC)
CREATE POLICY "No direct modify on compare_sessions" ON compare_sessions
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================
-- 4. RPC Functions (SECURITY DEFINER)
-- ============================================

-- Function: create_compare_invite
CREATE OR REPLACE FUNCTION create_compare_invite(attempt_a_id_param uuid)
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
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = attempt_a_id_param) THEN
    RAISE EXCEPTION 'Attempt not found: %', attempt_a_id_param;
  END IF;

  -- Generate unique token
  LOOP
    new_token := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_sessions WHERE invite_token = new_token);
  END LOOP;

  -- Create session
  INSERT INTO compare_sessions (invite_token, attempt_a_id, status, expires_at)
  VALUES (new_token, attempt_a_id_param, 'pending', now() + interval '7 days')
  RETURNING id INTO session_id;

  RETURN new_token;
END;
$$;

-- Function: get_compare_session_by_token
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
  WHERE cs.invite_token = token_param;
END;
$$;

-- Function: complete_compare_session
CREATE OR REPLACE FUNCTION complete_compare_session(token_param text, attempt_b_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id uuid;
  current_status text;
BEGIN
  -- Get session
  SELECT id, status INTO session_id, current_status
  FROM compare_sessions
  WHERE invite_token = token_param;

  IF session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found for token: %', token_param;
  END IF;

  IF current_status != 'pending' THEN
    RAISE EXCEPTION 'Session is not pending (current status: %)', current_status;
  END IF;

  -- Validate attempt_b exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = attempt_b_id_param) THEN
    RAISE EXCEPTION 'Attempt B not found: %', attempt_b_id_param;
  END IF;

  -- Update session
  UPDATE compare_sessions
  SET attempt_b_id = attempt_b_id_param,
      status = 'completed'
  WHERE id = session_id;

  RETURN session_id;
END;
$$;

-- ============================================
-- 5. Grant execute permissions to anon
-- ============================================

GRANT EXECUTE ON FUNCTION create_compare_invite(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_compare_session_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION complete_compare_session(text, uuid) TO anon;

