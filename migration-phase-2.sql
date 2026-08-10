-- Waypoint — phase 2 migration
-- Run in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
-- Brings a database created from the original schema.sql up to what the app now
-- stores. Safe to run more than once.

-- ============================================================
-- WAYPOINTS: when the checkpoint was reached
-- `done` alone cannot say which checkpoints moved in a given week, which is
-- what the weekly review is built on.
-- ============================================================
alter table waypoints add column if not exists done_at timestamptz;

-- ============================================================
-- SESSIONS: focus timer blocks, logged against a project
-- Unlike activities, a session is a real moment in time, so it carries
-- timestamps. `date` is the local day key it belongs to, written by the client
-- rather than derived from started_at — deriving it in SQL would use UTC and
-- move every evening session to the next day.
-- ============================================================
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  activity_id uuid references activities(id) on delete set null,
  date        date not null,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  minutes     integer not null check (minutes >= 0),
  completed   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists sessions_user_date_idx on sessions (user_id, date);
create index if not exists sessions_project_idx   on sessions (project_id);

alter table sessions enable row level security;

drop policy if exists "own sessions" on sessions;
create policy "own sessions" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- PREFS: everything else that is per-user rather than per-record
-- review_seen is the Monday of the last week whose review was settled, so the
-- Sunday window does not reopen. It is a plain date for the same local-time
-- reason as everywhere else.
-- Timer settings are never queried by the database, only read and written whole,
-- so they live as one jsonb rather than seven columns.
-- ============================================================
alter table prefs add column if not exists review_seen date;
alter table prefs add column if not exists timer jsonb not null default '{}'::jsonb;
