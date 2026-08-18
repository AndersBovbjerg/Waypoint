-- Waypoint — phase 5 migration: fix the recurring-activity upsert conflict
-- Run in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run once. Re-running will error on existing objects, which is fine.

-- ============================================================
-- activities_external_unique was a PARTIAL index (`where external_id is
-- not null`), which Postgres will not match against a plain
-- `ON CONFLICT (user_id, source, external_id) DO NOTHING` — that clause
-- would need to repeat the same WHERE predicate to target a partial index,
-- and supabase-js's .upsert({onConflict}) has no way to express that. Every
-- upsert against this index (materializeRecurring, and Strava's webhook
-- once that's turned back on) has been failing with "no unique or
-- exclusion constraint matching the ON CONFLICT specification" — silently
-- caught in Waypoint.tsx's own try/catch, so recurring activities were
-- never actually being created, just failing quietly on every load.
--
-- The fix is a plain (non-partial) unique index on the same three columns.
-- This is not a behaviour change for existing rows: a standard unique
-- constraint never treats two NULLs as duplicates of each other, so manual
-- activities (external_id always null) keep coexisting freely exactly as
-- before — only the ON CONFLICT matching is what's fixed.
-- ============================================================
drop index if exists activities_external_unique;

create unique index if not exists activities_external_unique
  on activities (user_id, source, external_id);
