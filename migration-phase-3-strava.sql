-- Waypoint — phase 3 migration: Strava sync
-- Run in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run more than once.

-- ============================================================
-- STRAVA TOKENS — one row per user, holds the OAuth grant and which
-- project synced runs get filed under.
-- ============================================================
create table if not exists strava_tokens (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  athlete_id      bigint not null unique,
  access_token    text not null,
  refresh_token   text not null,
  expires_at      timestamptz not null,
  sync_project_id uuid references projects(id) on delete set null
);

alter table strava_tokens enable row level security;

create policy "own strava tokens" on strava_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- ACTIVITIES — ride-along metrics from a synced Strava activity.
-- All nullable: manual/import rows never populate these.
-- ============================================================
alter table activities add column if not exists distance_m       numeric;
alter table activities add column if not exists moving_time_s    integer;
alter table activities add column if not exists elapsed_time_s   integer;
alter table activities add column if not exists avg_hr           numeric;
alter table activities add column if not exists max_hr           numeric;
alter table activities add column if not exists elevation_gain_m numeric;
alter table activities add column if not exists activity_type    text;

-- `source` already accepts free text (no CHECK constraint) — new rows use
-- source = 'strava'. The existing unique index on (user_id, source,
-- external_id) already makes a repeat webhook delivery a no-op upsert.
