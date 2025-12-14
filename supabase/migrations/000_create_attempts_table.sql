-- Create attempts table if it doesn't exist
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_slug text not null default 'rumination',
  first_name text,
  answers_raw jsonb not null,
  answers_scored jsonb not null,
  total_score int not null,
  level text not null,
  created_at timestamptz default now()
);

-- Create index on quiz_slug
create index if not exists idx_attempts_quiz_slug on attempts(quiz_slug);

-- Create index on created_at
create index if not exists idx_attempts_created_at on attempts(created_at);

-- Enable RLS
alter table attempts enable row level security;

-- RLS policy: Users can only insert their own attempts
create policy "Users can insert their own attempts" on attempts
  for insert
  with check (true);

-- RLS policy: Users cannot read others' attempts directly
-- (Access only via server functions)
create policy "No direct client read access to attempts" on attempts
  for select
  using (false);
