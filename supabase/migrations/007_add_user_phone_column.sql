-- Migration: Add user_phone column to attempts table
-- This stores the phone number for invited users in compare flow

-- Add user_phone column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attempts' AND column_name = 'user_phone') THEN
    ALTER TABLE attempts ADD COLUMN user_phone text;
  END IF;
END $$;

-- Ensure user_phone is nullable (no NOT NULL constraint)
-- This allows graceful fallback when phone is not provided (e.g., normal quiz flow)

-- Add comment
COMMENT ON COLUMN attempts.user_phone IS 'User phone number (nullable). Required for invited users in compare flow. Stored as normalized digits (e.g., 09123456789).';

