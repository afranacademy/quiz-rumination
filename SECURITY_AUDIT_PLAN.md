# Security & Ethics Audit Plan - Compare Minds Page

## Executive Summary

This plan addresses three security/ethics pillars:
1. **Data Minimization**: Ensure no PII (phone/email/raw IDs/tokens) leaks into UI/PDF/share
2. **Abuse Prevention**: Add rate limiting for invite creation and validation
3. **Cleanup**: Remove unused code, document intentional decisions, ensure single safety statement

---

## Pillar 1: Data Minimization Audit

### Step 1.1: Audit Phone/Email Usage

**Files to Check:**
- `src/pages/CompareResultPage.tsx`
- `src/pdf/ComparePdfDocument.tsx`
- `src/pdf/templates/ComparePdfCompactDocument.tsx`
- `src/features/compare/export/compareTextExport.ts`
- `src/features/compare/buildCompareShareText.ts`

**Verification:**
- ✅ **CONFIRMED**: No phone/email fields in PDF components
- ✅ **CONFIRMED**: No phone/email in `buildCompareShareText` or `compareTextExport`
- ✅ **CONFIRMED**: Phone is only collected in forms (`CompareInvitePage`, `InviteIdentityGate`) but never displayed in outputs

**Decision:**
- **Option B**: Phone is NOT used in any output paths (UI/PDF/share)
- **Action**: Document `maskPhone()` as intentionally unused with clear comment

**Files to Change:**
- `src/pages/CompareResultPage.tsx` (add comment to `maskPhone()`)

---

### Step 1.2: Audit Raw IDs/Tokens in Outputs

**Files to Check:**
- `src/pages/CompareResultPage.tsx` (UI rendering)
- `src/pdf/ComparePdfDocument.tsx`
- `src/pdf/templates/ComparePdfCompactDocument.tsx`
- `src/features/compare/export/compareTextExport.ts`

**Verification:**
- ✅ **CONFIRMED**: No raw IDs/tokens in PDF components
- ✅ **CONFIRMED**: No raw IDs/tokens in share text builders
- ⚠️ **FOUND**: Console logs show truncated IDs (e.g., `attemptA_id.substring(0, 8) + "..."`) - these are DEV-only, acceptable

**Decision:**
- No changes needed - all ID/token exposure is DEV-only and properly truncated

---

### Step 1.3: Verify Console Logs are DEV-Only

**Files to Check:**
- `src/pages/CompareResultPage.tsx`
- `src/pdf/ComparePdfDocument.tsx`
- `src/pdf/templates/ComparePdfCompactDocument.tsx`

**Verification:**
- ✅ **CONFIRMED**: All `console.log/error/warn` in `CompareResultPage.tsx` are wrapped in `import.meta.env.DEV`
- ✅ **CONFIRMED**: PDF components only have DEV logs

**Decision:**
- No changes needed - all logs are properly gated

**Files to Change:**
- None (already compliant)

---

## Pillar 2: Abuse Prevention (Rate Limiting)

### Step 2.1: Add Rate Limiting to Invite Creation

**Current State:**
- RPC: `create_compare_invite(p_attempt_a_id uuid)` in `supabase/migrations/002_compare_flow.sql`
- No rate limiting exists

**Approach:**
- **Server-side (preferred)**: Add rate limiting in RPC function using PostgreSQL
- Track attempts per `attempt_a_id` in a rate limit table
- Limit: 10 invites per `attempt_a_id` per hour

**Files to Create:**
- `supabase/migrations/025_add_rate_limiting_compare_invites.sql`

**Implementation:**
```sql
-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS compare_invite_rate_limits (
  attempt_a_id uuid PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
  invite_count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Update create_compare_invite RPC with rate limiting
CREATE OR REPLACE FUNCTION create_compare_invite(attempt_a_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text;
  session_id uuid;
  rate_limit_record compare_invite_rate_limits%ROWTYPE;
  current_count int;
  window_start_time timestamptz;
  RATE_LIMIT_COUNT int := 10;
  RATE_LIMIT_WINDOW interval := '1 hour';
BEGIN
  -- Validate attempt exists
  IF NOT EXISTS (SELECT 1 FROM attempts WHERE id = attempt_a_id_param) THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  -- Check rate limit
  SELECT * INTO rate_limit_record
  FROM compare_invite_rate_limits
  WHERE attempt_a_id = attempt_a_id_param;

  IF rate_limit_record IS NULL THEN
    -- First request for this attempt
    INSERT INTO compare_invite_rate_limits (attempt_a_id, invite_count, window_start)
    VALUES (attempt_a_id_param, 1, now())
    ON CONFLICT (attempt_a_id) DO NOTHING;
  ELSE
    -- Check if window has expired
    IF now() - rate_limit_record.window_start > RATE_LIMIT_WINDOW THEN
      -- Reset window
      UPDATE compare_invite_rate_limits
      SET invite_count = 1, window_start = now(), updated_at = now()
      WHERE attempt_a_id = attempt_a_id_param;
    ELSE
      -- Check if limit exceeded
      IF rate_limit_record.invite_count >= RATE_LIMIT_COUNT THEN
        RAISE EXCEPTION 'Rate limit exceeded';
      END IF;
      
      -- Increment count
      UPDATE compare_invite_rate_limits
      SET invite_count = invite_count + 1, updated_at = now()
      WHERE attempt_a_id = attempt_a_id_param;
    END IF;
  END IF;

  -- Generate unique token
  LOOP
    new_token := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM compare_tokens WHERE invite_token = new_token);
  END LOOP;

  -- Create session (using compare_tokens table)
  INSERT INTO compare_tokens (invite_token, attempt_a_id, status, expires_at)
  VALUES (new_token, attempt_a_id_param, 'pending', now() + interval '7 days')
  RETURNING id INTO session_id;

  RETURN new_token;
END;
$$;
```

**Files to Change:**
- `supabase/migrations/025_add_rate_limiting_compare_invites.sql` (new file)

**What NOT to Change:**
- Do NOT change the RPC signature
- Do NOT change error messages to reveal rate limits
- Do NOT add rate limit details to client-side error messages

---

### Step 2.2: Add Rate Limiting to Token Validation

**Current State:**
- RPC: `get_compare_payload_by_token(p_token text)` (in migration `005_create_get_compare_payload_by_token.sql`)
- No rate limiting exists

**Approach:**
- Track validation attempts per token per IP (if available) or per token
- Limit: 30 validations per token per minute
- Use PostgreSQL rate limit table

**Files to Create:**
- `supabase/migrations/026_add_rate_limiting_token_validation.sql`

**Implementation:**
```sql
-- Create rate limit tracking for token validation
CREATE TABLE IF NOT EXISTS compare_token_validation_rate_limits (
  token_hash text PRIMARY KEY, -- Hash of token for privacy
  validation_count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function to hash token (simple MD5 for rate limiting, not security)
CREATE OR REPLACE FUNCTION hash_token_for_rate_limit(token_param text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN md5(token_param);
END;
$$;

-- Update get_compare_payload_by_token with rate limiting
-- (Note: This requires finding the current implementation and adding rate limit check)
```

**Files to Change:**
- `supabase/migrations/026_add_rate_limiting_token_validation.sql` (new file)
- Need to read current `get_compare_payload_by_token` implementation first

**What NOT to Change:**
- Do NOT reveal rate limit details in error messages
- Do NOT change RPC return structure
- Use generic error: "Unable to process request" (not "rate limited")

---

## Pillar 3: Cleanup + Clarity

### Step 3.1: Review Safety Statements

**Files to Check:**
- `src/features/compare/relationalContent.ts` (SAFETY_STATEMENT constant)
- `src/features/compare/getCompareNarratives.ts` (safetyText)
- `src/features/compare/export/compareTextExport.ts` (safetyText in share)
- `src/pages/CompareResultPage.tsx` (UI safety rendering)
- `src/pdf/ComparePdfDocument.tsx` (PDF safety)
- `src/pdf/templates/ComparePdfCompactDocument.tsx` (PDF safety)

**Verification:**
- ✅ **CONFIRMED**: Safety statement appears exactly once in each output:
  - UI: `narratives.safetyText` (from template engine)
  - PDF: `narratives.safetyText` (same source)
  - Share: `rendered.safetyText` (same source)
- ✅ **CONFIRMED**: No duplicate safety statements
- ✅ **CONFIRMED**: `SAFETY_STATEMENT` constant in `relationalContent.ts` is legacy (not used in compare flow)

**Decision:**
- `SAFETY_STATEMENT` in `relationalContent.ts` is intentionally unused (legacy from old flow)
- Add comment explaining it's legacy

**Files to Change:**
- `src/features/compare/relationalContent.ts` (add comment to SAFETY_STATEMENT)

---

### Step 3.2: Document Unused Helpers

**Files to Check:**
- `src/pages/CompareResultPage.tsx` (`maskPhone()` function)

**Verification:**
- ✅ **CONFIRMED**: `maskPhone()` is defined but never called
- ✅ **CONFIRMED**: Phone is not displayed in any output path

**Decision:**
- Keep `maskPhone()` with clear comment explaining it's intentionally unused (defensive coding for future)

**Files to Change:**
- `src/pages/CompareResultPage.tsx` (add comment to `maskPhone()`)

---

## Implementation Checklist

### Commit 1: Data Minimization Documentation
- [ ] Add comment to `maskPhone()` explaining intentional non-use
- [ ] Verify no phone/email in outputs (manual check)
- [ ] Verify all console.log are DEV-only (grep check)

**Files:**
- `src/pages/CompareResultPage.tsx`

---

### Commit 2: Rate Limiting - Invite Creation
- [ ] Create `supabase/migrations/025_add_rate_limiting_compare_invites.sql`
- [ ] Add rate limit table and update RPC
- [ ] Test: Create 11 invites in 1 hour → should fail on 11th
- [ ] Verify error message is generic

**Files:**
- `supabase/migrations/025_add_rate_limiting_compare_invites.sql` (new)

---

### Commit 3: Rate Limiting - Token Validation
- [ ] Read current `get_compare_payload_by_token` implementation
- [ ] Create `supabase/migrations/026_add_rate_limiting_token_validation.sql`
- [ ] Add rate limit check to RPC
- [ ] Test: Validate same token 31 times in 1 minute → should fail on 31st
- [ ] Verify error message is generic

**Files:**
- `supabase/migrations/026_add_rate_limiting_token_validation.sql` (new)
- May need to update existing migration file

---

### Commit 4: Cleanup - Safety Statement Documentation
- [ ] Add comment to `SAFETY_STATEMENT` in `relationalContent.ts` explaining legacy status
- [ ] Verify safety appears exactly once in each output path

**Files:**
- `src/features/compare/relationalContent.ts`

---

## Verification Checklist

### Manual Testing
- [ ] Open CompareResultPage → verify no phone/email visible
- [ ] Download PDF → verify no phone/email/raw IDs
- [ ] Share text → verify no phone/email/raw IDs
- [ ] Create 11 invites rapidly → verify 11th fails with generic error
- [ ] Validate same token 31 times rapidly → verify 31st fails with generic error
- [ ] Check browser console in PROD build → verify no logs

### Code Checks
- [ ] `grep -r "phone\|email" src/pdf` → should return nothing
- [ ] `grep -r "console\." src/pages/CompareResultPage.tsx | grep -v "import.meta.env.DEV"` → should return nothing
- [ ] `grep -r "attempt.*id\|session.*id\|token" src/pdf` → should return nothing (except comments)
- [ ] Verify safety statement appears once in UI, once in PDF, once in share

---

## Decisions & Rationale

1. **maskPhone()**: Keep with comment - defensive coding, may be needed if phone display is added later
2. **Rate Limiting**: Server-side (PostgreSQL) - most secure, cannot be bypassed by client
3. **Error Messages**: Generic ("Unable to process request") - prevents information leakage
4. **Safety Statement**: Single source (template engine) - already correct, just document legacy constant

---

## Acceptance Criteria

✅ No phone/email/raw IDs/tokens in UI/PDF/share outputs
✅ Rate limiting exists for invite create + validate (server-side)
✅ No PROD debug logs
✅ No changes to analysis logic, thresholds, texts, or UI layout
✅ All intentionally unused code is documented

