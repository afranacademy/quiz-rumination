# Compare Flow Fix - Complete Solution

## Summary
Fixed the compare invite + compare result flow to work end-to-end with a consistent data contract:

1. **DB enforces minimum 24h expiry** - Even if frontend passes 60 minutes, DB enforces at least 1440 minutes (24 hours)
2. **RPC is single source of truth** - Frontend uses ONLY `get_compare_payload_by_token` RPC, no direct table queries
3. **Canonical attempt IDs** - Frontend uses `attempt_b?.id ?? attempt_b_id` to handle both cases
4. **Names from flat RPC fields** - Uses `a_user_first_name` etc. as primary source

## 1. DB SQL

Run the following SQL migration in Supabase SQL Editor:

**File:** `supabase/migrations/031_fix_compare_rpc_contract.sql`

This migration:
- **ENFORCES minimum 24h expiry** at DB level: `GREATEST(COALESCE(p_expires_in_minutes, 1440), 1440)`
- Fixes `create_compare_invite` to return proper format with 64-char tokens
- Creates/updates `mark_compare_invite_opened` for tracking
- Fixes `complete_compare_session` to validate expiry and status
- **CRITICALLY** fixes `get_compare_payload_by_token` to return all needed data

## 2. Code Changes

### Frontend Changes in `CompareResultPage.tsx`

**1. Canonical ID computation (lines 853-854):**
```typescript
const attemptAId = rpcAnyEntry.attempt_a?.id ?? rpcData.attempt_a_id ?? null;
const attemptBId = rpcAnyEntry.attempt_b?.id ?? rpcData.attempt_b_id ?? null;
```

**2. Names from RPC flat fields (primary) with jsonb fallback:**
```typescript
const attemptAFirstName: string | null = 
  rpcData.a_user_first_name ?? attemptA?.user_first_name ?? attemptA?.first_name ?? null;
const attemptALastName: string | null = 
  rpcData.a_user_last_name ?? attemptA?.user_last_name ?? attemptA?.last_name ?? null;
// Same for attemptB
```

**3. AttemptData built ONLY from RPC (no direct DB reads):**
```typescript
const attemptAData: AttemptData = {
  id: attemptAId,
  user_first_name: attemptAFirstName,  // From rpcData.a_user_first_name
  user_last_name: attemptALastName,    // From rpcData.a_user_last_name
  total_score: attemptATotalScore ?? 0, // From rpcData.a_total_score
  dimension_scores: aDimsResult.scores, // From rpcData.a_dimension_scores
  score_band_id: rpcData.a_score_band_id,
  completed_at: new Date().toISOString(),
};
```

**4. Debug logs clearly indicate RPC-only data source:**
```
[CompareResultPage] ✅ Built AttemptData from RPC (no direct DB reads):
  dataSource: "RPC only - no direct attempts table queries"
```

**Key guarantee:** No `supabase.from('attempts')` or `supabase.from('compare_sessions')` calls in CompareResultPage.

## 3. Verification

### A. Database Verification

Run these SQL queries in Supabase SQL Editor to verify the RPCs work:

#### 1. Create a test invite:
```sql
-- First, get a valid attempt_a_id (replace with actual attempt ID)
SELECT id, user_first_name, user_last_name, total_score 
FROM attempts 
WHERE total_score IS NOT NULL 
LIMIT 1;

-- Create invite (replace <attempt_a_id> with actual UUID)
SELECT * FROM create_compare_invite('<attempt_a_id>'::uuid, 1440);
```

#### 2. Verify token exists:
```sql
-- Replace <token> with the invite_token from step 1
SELECT 
  cs.id,
  cs.invite_token,
  cs.status,
  cs.attempt_a_id,
  cs.attempt_b_id,
  cs.expires_at,
  a.user_first_name as a_first_name,
  a.user_last_name as a_last_name,
  b.user_first_name as b_first_name,
  b.user_last_name as b_last_name
FROM compare_sessions cs
JOIN attempts a ON a.id = cs.attempt_a_id
LEFT JOIN attempts b ON b.id = cs.attempt_b_id
WHERE cs.invite_token = '<token>';
```

#### 3. Test get_compare_payload_by_token:
```sql
-- Replace <token> with the invite_token
SELECT * FROM get_compare_payload_by_token('<token>');
```

**Expected result:**
- `session_id` should be a UUID string
- `attempt_a` should be a jsonb object with `id` field
- `attempt_b` should be NULL (if pending) or jsonb object with `id` field (if completed)
- `attempt_a_id` and `attempt_b_id` should be UUIDs
- All score fields should be present

#### 4. Test complete_compare_session:
```sql
-- First create attempt B (or use existing)
-- Then complete the session (replace <token> and <attempt_b_id>)
SELECT * FROM complete_compare_session('<token>', '<attempt_b_id>'::uuid);
```

#### 5. Verify completed session payload:
```sql
-- After completing, verify payload returns both attempts
SELECT 
  status,
  attempt_a_id,
  attempt_b_id,
  (attempt_a->>'id') as attempt_a_jsonb_id,
  (attempt_b->>'id') as attempt_b_jsonb_id,
  a_total_score,
  b_total_score
FROM get_compare_payload_by_token('<token>');
```

**Expected result:**
- `status` = 'completed'
- `attempt_a_id` matches `attempt_a->>'id'`
- `attempt_b_id` matches `attempt_b->>'id'`
- Both `a_total_score` and `b_total_score` are NOT NULL

### B. Browser Console Verification

#### 1. Test Invite Flow:
1. Navigate to `/compare/invite/<token>` (replace with actual token)
2. Open browser DevTools Console
3. Look for logs:
   - `[CompareInvitePage] RPC response:` - should show data
   - No errors about "missing attempt data"

#### 2. Test Result Flow (Pending):
1. Navigate to `/compare/result/<token>` where token is pending
2. Check console for:
   - `[CompareResultPage] 🔵 Calling RPC get_compare_payload_by_token`
   - `[CompareResultPage] Session not completed, skipping attempt processing`
   - Should show waiting state, NOT error

#### 3. Test Result Flow (Completed):
1. Complete the quiz as person B (link attempt B to session)
2. Navigate to `/compare/result/<token>`
3. Check console for:
   - `[CompareResultPage] 🔍 processCompareData entry:` - should show:
     - `attemptAId: "..."` (not null)
     - `attemptBId: "..."` (not null)
     - `hasAttemptA: true`
     - `hasAttemptB: true`
   - `[CompareResultPage] ✅ Comparison built:` - should show comparison object
   - **NO errors** about "RPC returned completed session but missing attempt data"
   - **NO errors** about "Cannot build AttemptBData"

#### 4. Verify Canonical ID Logic:
In console, check the debug log:
```javascript
// Should see in processCompareData entry log:
{
  attemptAId: "abc123...",  // From attempt_a.id or attempt_a_id
  attemptBId: "def456...",  // From attempt_b.id or attempt_b_id
  hasAttemptA: true,
  hasAttemptB: true,
  attemptAFromPayload: true,  // attempt_a.id exists
  attemptBFromPayload: true  // attempt_b.id exists
}
```

### C. End-to-End Test

1. **Create Invite:**
   - Person A completes quiz
   - Creates compare invite
   - Gets invite token

2. **Open Invite:**
   - Person B opens `/compare/invite/<token>`
   - Should see invite page (not error)
   - Person B starts quiz

3. **Complete Quiz:**
   - Person B completes quiz
   - System calls `complete_compare_session`
   - Session status becomes 'completed'

4. **View Results:**
   - Navigate to `/compare/result/<token>`
   - Should see comparison results (NOT waiting, NOT error)
   - Both person A and person B data should be visible

## Expected Behavior After Fix

✅ **Before Fix:**
- UI shows "Session completed but attempts missing"
- DEV error: "RPC returned completed session but missing attempt data"
- Comparison doesn't render even when `attempt_b.id` exists

✅ **After Fix:**
- UI correctly recognizes completed sessions when `attempt_b.id` exists
- Comparison renders successfully
- No false "missing attempt data" errors
- Canonical ID logic ensures `attempt_b?.id` is used as primary source

## Troubleshooting

If you still see errors:

1. **Check RPC returns attempt_a.id and attempt_b.id:**
   ```sql
   SELECT 
     (attempt_a->>'id') as a_id,
     (attempt_b->>'id') as b_id,
     attempt_a_id,
     attempt_b_id
   FROM get_compare_payload_by_token('<token>');
   ```
   Both `a_id` and `b_id` should match their respective `*_id` fields.

2. **Check console logs:**
   - Look for `processCompareData entry` log
   - Verify `attemptAId` and `attemptBId` are not null
   - Verify `hasAttemptA` and `hasAttemptB` are true

3. **Verify session status:**
   ```sql
   SELECT status, attempt_a_id, attempt_b_id 
   FROM compare_sessions 
   WHERE invite_token = '<token>';
   ```
   Should show `status = 'completed'` and both attempt IDs present.

