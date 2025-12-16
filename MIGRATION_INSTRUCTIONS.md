# Fix: Function Not Found in Schema Cache

## Problem
The error `PGRST202: Could not find the function public.get_or_create_pending_compare_token` means the migration hasn't been applied to your Supabase database.

## Solution

### Step 1: Run the Migration
1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the entire contents of `supabase/migrations/012_reusable_compare_tokens.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success" message

### Step 2: Refresh PostgREST Schema Cache
After running the migration, immediately run this in the SQL Editor:

```sql
SELECT pg_notify('pgrst', 'reload schema');
```

Wait 10-30 seconds, then try your app again.

### Step 3: Verify Function Exists (Optional)
To verify the function was created, run:

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

### Step 4: Test the Function
Test with a real attempt ID:

```sql
-- Get a real attempt ID
SELECT id FROM attempts WHERE status = 'completed' LIMIT 1;

-- Test the function (replace with actual ID)
SELECT * FROM get_or_create_pending_compare_token(
  'YOUR_ATTEMPT_ID_HERE'::uuid,
  1440
);
```

## If Still Not Working

1. **Check migration history**: Go to Database > Migrations in Supabase dashboard
2. **Restart PostgREST**: Project Settings > General > Restart project (last resort)
3. **Wait 1-2 minutes**: Supabase auto-refreshes schema cache periodically

