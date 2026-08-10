-- Waypoint — migration 02: measurable goals, and project identity
-- Run in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run more than once.

-- ============================================================
-- GOALS ON PROJECTS
-- A goal is stored as two plain numbers and a unit. Everything is kept as a
-- number — seconds for a time, kroner for money — so the progress arithmetic
-- is identical whatever is being measured, and the unit only decides how the
-- value is written and read.
--
-- There is deliberately no "direction" column. Whether smaller is better is
-- derived from the two numbers: a target below the start means downwards,
-- which is true of a race time and false of revenue. A stored direction could
-- disagree with the numbers; a derived one cannot.
-- ============================================================
alter table projects add column if not exists goal_label  text;
alter table projects add column if not exists goal_unit   text
  check (goal_unit is null or goal_unit in ('number','time','currency','percent'));
alter table projects add column if not exists goal_start  numeric;
alter table projects add column if not exists goal_target numeric;

-- ============================================================
-- GOAL READINGS
-- The series is what turns a goal from a sentence written once into something
-- you can watch move. `date` is a plain local day key, written by the client,
-- for the same reason as everywhere else in this schema.
-- ============================================================
create table if not exists goal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  date       date not null,
  value      numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists goal_entries_project_date_idx on goal_entries (project_id, date);
create index if not exists goal_entries_user_idx         on goal_entries (user_id);

alter table goal_entries enable row level security;

drop policy if exists "own goal entries" on goal_entries;
create policy "own goal entries" on goal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- PROJECT IDENTITY
-- The palette grows from six slots to twelve, and a project can carry an icon
-- as well as a colour. `ci` stays a slot rather than a hex value: light and
-- dark each tune the same slot differently, so a stored colour would look
-- wrong in one of the two modes.
-- ============================================================
alter table projects drop constraint if exists projects_ci_check;
alter table projects add constraint projects_ci_check check (ci between 0 and 11);

alter table projects add column if not exists icon text;
