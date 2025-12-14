-- Create invites table
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  quiz_slug text not null default 'rumination',
  inviter_attempt_id uuid not null references attempts(id) on delete cascade,
  invitee_attempt_id uuid references attempts(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','completed','expired')),
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- Create index on token for fast lookups
create index if not exists idx_invites_token on invites(token);

-- Create index on inviter_attempt_id
create index if not exists idx_invites_inviter on invites(inviter_attempt_id);

-- Enable RLS
alter table invites enable row level security;

-- RLS policies: No direct client access (all via server functions)
create policy "No direct client access to invites" on invites
  for all
  using (false)
  with check (false);
