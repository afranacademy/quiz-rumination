-- Migration: Make user_last_name nullable
-- This allows graceful fallback when last name is not provided
-- Removes any NOT NULL constraint that might exist

-- First, update any existing empty strings to NULL for consistency
UPDATE attempts 
SET user_last_name = NULL 
WHERE user_last_name = '';

-- Drop any default that might force empty string
ALTER TABLE attempts 
  ALTER COLUMN user_last_name DROP DEFAULT;

-- Ensure the column is nullable (this should already be the case, but making it explicit)
ALTER TABLE attempts 
  ALTER COLUMN user_last_name DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN attempts.user_last_name IS 'User last name (nullable). If not provided, use null for graceful fallback in UI.';

