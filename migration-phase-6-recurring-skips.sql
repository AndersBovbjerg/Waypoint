-- Waypoint — phase 6 migration: let a deleted recurring instance stay deleted
-- Run in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run once. Re-running will error on existing objects, which is fine.

-- ============================================================
-- RECURRING SKIPS
-- Deleting a recurring-sourced activity only removes that one row — the
-- materializer, on the next load, has no way to tell "the user deleted
-- this on purpose" apart from "this was never generated," and recreates
-- it. This table is that missing memory: one row per (rule, date) that
-- was explicitly dismissed, checked by pendingRecurringDates alongside
-- the existing-activity set so a deleted day is never regenerated.
-- No user_id of its own — ownership is inherited through the rule, the
-- same shape waypoints already use for projects.
-- ============================================================
create table if not exists recurring_skips (
  rule_id uuid not null references recurring_activities(id) on delete cascade,
  date    date not null,
  primary key (rule_id, date)
);

alter table recurring_skips enable row level security;

create policy "own recurring skips" on recurring_skips
  for all using (
    exists (select 1 from recurring_activities r where r.id = recurring_skips.rule_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from recurring_activities r where r.id = recurring_skips.rule_id and r.user_id = auth.uid())
  );
