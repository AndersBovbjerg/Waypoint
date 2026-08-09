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
  -- when the checkpoint was reached. The weekly review needs this to say which
  -- waypoints moved in a given week; `done` alone cannot answer that.
  done_at     timestamptz,
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
-- SESSIONS  (focus timer blocks, logged against a project)
-- Unlike activities, a session is a real moment in time, so it carries
-- timestamps. `date` is the local day key it belongs to, stored explicitly
-- rather than derived from started_at — deriving it in SQL would use UTC
-- and move every evening session to the next day.
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
create index if not exists sessions_user_date_idx    on sessions (user_id, date);
create index if not exists sessions_project_idx      on sessions (project_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Without this, anyone with the public API key could read every row.
-- ============================================================
alter table projects   enable row level security;
alter table waypoints  enable row level security;
alter table activities enable row level security;
alter table sessions   enable row level security;
alter table prefs      enable row level security;

create policy "own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own activities" on activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sessions" on sessions
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
