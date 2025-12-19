# Tracking Implementation Summary

## Overview
Implemented comprehensive tracking for CTAs and PDF downloads, plus admin RPC functions for dashboard queries.

## A. Frontend Tracking Changes

### 1. Created Tracking Helper (`src/lib/trackCardEvent.ts`)
- `trackCardEvent()` - Fire-and-forget tracking function
- Card type constants: `CTA_MIND_VARAJ_COURSE`, `CTA_PERSONAL_RESULT_CARD`, `CTA_MY_MIND_PATTERN_CARD`, `CTA_COMPARE_MINDS`, `PDF_COMPARE`, `PDF_MY_MIND_PATTERN`
- Event type constants: `CLICK`, `DOWNLOAD`
- Handles errors silently, never blocks user actions

### 2. Updated Components

#### `src/features/quiz/components/RecommendationCard.tsx`
- Added `attemptId` prop
- Tracks `cta_mind_varaj_course` click when course CTA button is clicked

#### `src/features/quiz/components/SocialShareSection.tsx`
- Tracks `cta_personal_result_card` click when "اشتراک‌گذاری متنی" button is clicked
- Tracks `cta_personal_result_card` download when "دانلود PDF خلاصه" is clicked

#### `src/features/quiz/components/MindPatternCard.tsx`
- Tracks `cta_my_mind_pattern_card` click when "مشاهده کامل" button is clicked
- Tracks `pdf_my_mind_pattern` download when PDF download button is clicked

#### `src/features/compare/components/CompareInviteSection.tsx`
- Tracks `cta_compare_minds` click when "دعوت یک نفر برای مقایسه‌ی ذهن‌ها" button is clicked

#### `src/pages/CompareResultPage.tsx`
- Tracks `pdf_compare` download when compare PDF download button is clicked
- Passes `attemptId` and `compareSessionId` when available

#### `src/app/components/ResultPage.tsx`
- Updated to pass `attemptId` to `RecommendationSection`

## B. Admin RPC Functions (SQL Migration)

### File: `supabase/migrations/032_admin_tracking_rpcs.sql`

#### 1. `admin_completed_attempts_with_clicks()`
**Signature:**
```sql
admin_completed_attempts_with_clicks(
  p_session_token text,
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 50
) RETURNS jsonb
```

**Returns:**
```json
{
  "ok": true,
  "data": {
    "page": 1,
    "page_size": 50,
    "total": 100,
    "rows": [
      {
        "attempt_id": "uuid",
        "first_name": "string",
        "last_name": "string",
        "phone_masked": "****1234",
        "completed_at": "timestamp",
        "clicked_mind_varaj_course": true,
        "clicked_personal_result_card": false,
        "clicked_my_mind_pattern_card": true,
        "clicked_compare_minds": false
      }
    ]
  },
  "error": null
}
```

**Features:**
- Validates admin session via `validate_admin_session()`
- Returns `ADMIN_UNAUTHORIZED` error if session invalid
- Filters by date range (start_date, end_date)
- Pagination support (max 100 per page)
- CTA flags computed via EXISTS subqueries on `card_events`

#### 2. `admin_compare_share_activity()`
**Signature:**
```sql
admin_compare_share_activity(
  p_session_token text,
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 50
) RETURNS jsonb
```

**Returns:**
```json
{
  "ok": true,
  "data": {
    "page": 1,
    "page_size": 50,
    "total": 50,
    "rows": [
      {
        "created_at": "timestamp",
        "share_action": "copy_link",
        "invite_token": "string",
        "compare_session_id": "uuid",
        "page_path": "string",
        "participant_id": "uuid",
        "session_status": "completed",
        "attempt_a_id": "uuid",
        "attempt_a_completed_at": "timestamp",
        "attempt_b_id": "uuid",
        "attempt_b_completed_at": "timestamp"
      }
    ]
  },
  "error": null
}
```

**Features:**
- Validates admin session
- Filters `card_share_events` where `card_type = 'compare_minds'`
- Joins to `compare_sessions` and `attempts` tables
- Supports filtering by date range and invite_token
- Pagination support

## C. Admin Helper (`src/lib/callAdminRpc.ts`)

### Function: `callAdminRpc<T>()`
**Signature:**
```typescript
callAdminRpc<T = any>(
  rpcName: string,
  params: Record<string, any>
): Promise<AdminRpcResponse<T>>
```

**Usage:**
```typescript
const result = await callAdminRpc<CompletedAttemptsData>(
  'admin_completed_attempts_with_clicks',
  {
    p_session_token: adminToken,
    p_filters: { start_date: '2024-01-01' },
    p_page: 1,
    p_page_size: 50
  }
);

if (result.ok) {
  const { page, total, rows } = result.data;
  // Use data
} else {
  console.error(result.error.code, result.error.message);
}
```

**Features:**
- Type-safe response unwrapping
- Handles `{ok, data, error}` contract
- Graceful error handling
- Returns standardized error structure

## Tracking Points Summary

| Location | Card Type | Event Type | Context |
|----------|-----------|------------|---------|
| RecommendationCard | `cta_mind_varaj_course` | `click` | Course CTA button |
| SocialShareSection | `cta_personal_result_card` | `click` | Share text button |
| SocialShareSection | `cta_personal_result_card` | `download` | Summary PDF download |
| MindPatternCard | `cta_my_mind_pattern_card` | `click` | View full pattern button |
| MindPatternCard | `pdf_my_mind_pattern` | `download` | Mind pattern PDF download |
| CompareInviteSection | `cta_compare_minds` | `click` | Create invite button |
| CompareResultPage | `pdf_compare` | `download` | Compare PDF download |

## Notes

1. **Fire-and-forget**: All tracking calls are async and non-blocking. Errors are logged but never shown to users.

2. **Context extraction**: 
   - `attemptId` extracted from props/state when available
   - `compareSessionId` extracted from session state when available
   - `participantId` can be extracted from auth context if needed
   - All IDs default to `null` if not available (event still tracked)

3. **Admin session validation**: Both admin RPCs use `validate_admin_session()` which returns NULL for invalid tokens (no exception). RPCs explicitly check for NULL and return `ADMIN_UNAUTHORIZED` error.

4. **Pagination**: Admin RPCs enforce max page_size of 100 to prevent abuse.

5. **Phone masking**: Phone numbers are masked as `****1234` (last 4 digits only) for privacy.

## Testing Checklist

- [ ] Course CTA click tracked in `card_events`
- [ ] Personal result card click tracked
- [ ] Mind pattern card click tracked
- [ ] Compare minds CTA click tracked
- [ ] Mind pattern PDF download tracked
- [ ] Compare PDF download tracked
- [ ] Admin RPCs return correct data structure
- [ ] Admin RPCs reject invalid session tokens
- [ ] Pagination works correctly
- [ ] Filters work correctly (date range, invite_token)

