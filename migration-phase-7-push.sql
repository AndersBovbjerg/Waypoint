-- Waypoint — phase 7 migration: daily reminder push notifications
-- Run in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run once. Re-running will error on existing objects, which is fine.

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- One row per device that has turned reminders on. `endpoint` is the
-- browser-issued push URL and is unique per device/install — re-enabling
-- on the same device upserts onto the same row instead of piling up
-- duplicates. p256dh/auth are the keys the Web Push spec requires to
-- encrypt the payload; both come straight from PushSubscription.toJSON().
-- ============================================================
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
