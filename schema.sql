-- Waypoint — database schema for Supabase (Postgres)
-- Run this in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run once. Re-running will error on existing objects, which is fine.

-- ============================================================
-- PROJECTS
-- ============================================================
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  purpose     text default '',
  situation   text default '',
  approach    text default '',
  target      date,
  ci          smallint not null default 0 check (ci between 0 and 5),
  status      text not null default 'active' check (status in ('active','archived')),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- WAYPOINTS  (sub-goals, ordered along a project's route)
-- ============================================================
create table if not exists waypoints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  due         date,
  done        boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ACTIVITIES  (single dated to-dos, what the calendar shows)
-- ============================================================
create table if not exists activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  waypoint_id uuid references waypoints(id) on delete set null,
  title       text not null,
  date        date not null,
  done        boolean not null default false,
  done_at     timestamptz,
  source      text not null default 'manual',   -- 'manual' | 'import' | 'garmin'
  external_id text,                             -- dedupe key for imported items
  created_at  timestamptz not null default now()
);

-- One imported item can only land once per user.
create unique index if not exists activities_external_unique
  on activities (user_id, source, external_id)
  where external_id is not null;

-- ============================================================
-- PREFERENCES  (light / dark)
-- ============================================================
create table if not exists prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode    text not null default 'light' check (mode in ('light','dark'))
);

-- ============================================================
-- INDEXES — the queries the app actually runs
-- ============================================================
create index if not exists activities_user_date_idx  on activities (user_id, date);
create index if not exists activities_project_idx    on activities (project_id);
create index if not exists waypoints_project_idx     on waypoints (project_id, position);
create index if not exists projects_user_status_idx  on projects (user_id, status);

-- ============================================================
-- ROW LEVEL SECURITY
-- Without this, anyone with the public API key could read every row.
-- ============================================================
alter table projects   enable row level security;
alter table waypoints  enable row level security;
alter table activities enable row level security;
alter table prefs      enable row level security;

create policy "own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own activities" on activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own prefs" on prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Waypoints have no user_id of their own; they inherit it through the project.
create policy "own waypoints" on waypoints
  for all using (
    exists (select 1 from projects p where p.id = waypoints.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = waypoints.project_id and p.user_id = auth.uid())
  );
