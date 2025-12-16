-- Verification and Refresh Script for Migration 012
-- Run this in Supabase SQL Editor after running migration 012_reusable_compare_tokens.sql

-- ============================================
-- 1. Verify function exists
-- ============================================
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  CASE 
    WHEN p.prokind = 'f' THEN 'function'
    WHEN p.prokind = 'p' THEN 'procedure'
    ELSE 'unknown'
  END as kind
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_or_create_pending_compare_token';

-- Expected output:
-- function_name: get_or_create_pending_compare_token
-- arguments: p_attempt_a_id uuid, p_expires_in_minutes integer
-- return_type: TABLE(token text, expires_at timestamp with time zone, compare_id uuid, status text)

-- ============================================
-- 2. Check function permissions
-- ============================================
SELECT 
  p.proname as function_name,
  r.rolname as role_name,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
CROSS JOIN pg_roles r
WHERE n.nspname = 'public'
  AND p.proname = 'get_or_create_pending_compare_token'
  AND r.rolname IN ('anon', 'authenticated')
ORDER BY r.rolname;

-- Expected: Both 'anon' and 'authenticated' should have can_execute = true

-- ============================================
-- 3. Attempt to refresh PostgREST schema cache
-- ============================================
SELECT pg_notify('pgrst', 'reload schema') as schema_reload_notification;

-- ============================================
-- 4. Test function (optional - requires valid attempt_id)
-- ============================================
-- Uncomment and replace with a real attempt_id to test:
-- SELECT * FROM get_or_create_pending_compare_token(
--   (SELECT id FROM attempts LIMIT 1),
--   1440
-- );

