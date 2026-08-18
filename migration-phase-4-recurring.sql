-- Waypoint — phase 4 migration: recurring activities
-- Run in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run more than once.

create table if not exists recurring_activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  -- 0=Monday..6=Sunday, matching this app's own Monday-first calendar —
  -- never JS's native 0=Sunday, which would silently disagree with every
  -- other day-of-week convention already in this codebase.
  weekdays    integer[] not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table recurring_activities enable row level security;

create policy "own recurring activities" on recurring_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists recurring_user_idx on recurring_activities (user_id);

-- Materialized instances land in `activities` with source = 'recurring' and
-- external_id = '<rule_id>_<date>' — no schema change needed there, it
-- reuses the unique index already on (user_id, source, external_id).
