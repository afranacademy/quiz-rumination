-- Migration: Fix user_last_name NOT NULL constraint and ensure user_phone exists
-- This prevents crashes when last_name is not provided

-- Make user_last_name nullable (remove NOT NULL if exists)
ALTER TABLE attempts 
  ALTER COLUMN user_last_name DROP NOT NULL;

-- Update existing empty strings to NULL for consistency
UPDATE attempts 
SET user_last_name = NULL 
WHERE user_last_name = '';

-- Ensure user_phone column exists (nullable)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attempts' AND column_name = 'user_phone') THEN
    ALTER TABLE attempts ADD COLUMN user_phone text;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN attempts.user_last_name IS 'User last name (nullable). Optional field.';
COMMENT ON COLUMN attempts.user_phone IS 'User phone number (nullable). Required for invited users in compare flow.';

