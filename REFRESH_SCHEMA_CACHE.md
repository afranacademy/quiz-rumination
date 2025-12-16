# How to Refresh PostgREST Schema Cache

After running migration `012_reusable_compare_tokens.sql`, you need to refresh the PostgREST schema cache so it recognizes the new function.

## Option 1: Wait (Automatic - Recommended)
Supabase automatically refreshes the schema cache periodically. **Wait 1-2 minutes** after running the migration, then try again.

## Option 2: Manual Refresh via SQL Editor
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this query:
```sql
SELECT pg_notify('pgrst', 'reload schema');
```
4. Wait a few seconds, then try your function call again

## Option 3: Verify Function Exists
Run this query to verify the function was created:
```sql
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_or_create_pending_compare_token';
```

You should see:
- function_name: `get_or_create_pending_compare_token`
- arguments: `p_attempt_a_id uuid, p_expires_in_minutes integer`
- return_type: `TABLE(token text, expires_at timestamp with time zone, compare_id uuid, status text)`

## Option 4: Test the Function Directly
Test the function with a dummy attempt ID:
```sql
-- First, get a real attempt ID from your attempts table
SELECT id FROM attempts LIMIT 1;

-- Then test the function (replace with actual attempt ID)
SELECT * FROM get_or_create_pending_compare_token(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- Replace with real attempt ID
  1440
);
```

## If Still Not Working
1. **Check migration was applied**: Go to Database > Migrations in Supabase dashboard
2. **Restart your Supabase project**: Project Settings > General > Restart project (last resort)
3. **Check function permissions**: Ensure GRANT statements ran successfully

