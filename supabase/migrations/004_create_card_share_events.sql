-- Migration: Create card_share_events table for tracking share/copy analytics
-- Tracks button interactions for My Mind Pattern and Compare Minds cards
-- Privacy-safe: only tracks button clicks, not message content or actual share success

-- ============================================
-- 1. Create card_share_events table
-- ============================================

create table if not exists public.card_share_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  card_type text not null check (card_type in ('my_mind', 'compare_minds')),
  share_action text not null check (share_action in ('copy_link', 'share_text', 'native_share')),

  attempt_id uuid null references public.attempts(id) on delete set null,
  compare_session_id uuid null references public.compare_sessions(id) on delete set null,
  invite_token text null,

  participant_id uuid null references auth.users(id) on delete set null,

  page_path text null,
  user_agent text null,
  referrer text null,

  constraint card_share_events_target_chk check (
    attempt_id is not null or compare_session_id is not null or invite_token is not null
  )
);

-- ============================================
-- 2. Create indexes
-- ============================================

create index if not exists card_share_events_created_at_idx
  on public.card_share_events (created_at desc);

create index if not exists card_share_events_attempt_idx
  on public.card_share_events (attempt_id);

create index if not exists card_share_events_compare_idx
  on public.card_share_events (compare_session_id);

create index if not exists card_share_events_token_idx
  on public.card_share_events (invite_token);

create index if not exists card_share_events_participant_idx
  on public.card_share_events (participant_id);

-- ============================================
-- 3. Enable RLS
-- ============================================

alter table public.card_share_events enable row level security;

-- ============================================
-- 4. Create RLS policies
-- ============================================

-- Allow anon + authenticated to INSERT events
drop policy if exists "share_events_insert_any" on public.card_share_events;
create policy "share_events_insert_any"
on public.card_share_events
for insert
to anon, authenticated
with check (true);

-- Block SELECT for client roles (read from server/admin later)
drop policy if exists "share_events_no_select" on public.card_share_events;
create policy "share_events_no_select"
on public.card_share_events
for select
to anon, authenticated
using (false);

-- ============================================
-- 5. QA / Testing SQL Queries (for admin verification)
-- ============================================

-- Latest events
-- select card_type, share_action, attempt_id, compare_session_id, invite_token, participant_id, created_at
-- from public.card_share_events
-- order by created_at desc
-- limit 50;

-- Shares by attempt
-- select attempt_id, count(*) as clicks
-- from public.card_share_events
-- where card_type='my_mind'
-- group by attempt_id
-- order by clicks desc;

-- Shares by token
-- select invite_token, count(*) as clicks
-- from public.card_share_events
-- where card_type='compare_minds'
-- group by invite_token
-- order by clicks desc;

