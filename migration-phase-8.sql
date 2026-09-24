-- Waypoint — phase 8: Settings, the reworked review, and the Apple Calendar feed.
-- Run in the Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run.
--
-- One file for the whole round, run once. Every statement is additive or
-- widens a constraint, so running it before the code ships is safe for the
-- app already live — but the code must not ship before it has run:
-- saving a course writes weekly_target, and loadAll reads miss_reasons.

-- ============================================================
-- 1. SETTINGS — "System" as a third appearance
-- Resolved on the device from prefers-color-scheme. The inline check from
-- schema.sql only allowed light and dark, so choosing System failed to save.
-- ============================================================
alter table prefs drop constraint if exists prefs_mode_check;
alter table prefs add constraint prefs_mode_check check (mode in ('light', 'dark', 'system'));

-- ============================================================
-- 2. WEEKLY TARGETS — how many activities a week a course is aiming for
-- Null means no explicit target; a course with a recurring rule then
-- borrows the number of days that rule runs on, worked out in the app.
-- ============================================================
alter table projects add column if not exists weekly_target smallint
  check (weekly_target is null or weekly_target between 1 and 21);

-- ============================================================
-- 3. MISS REASONS — why a planned activity did not happen
-- One reason per activity, answered from the Today card or the review.
-- "Did it anyway" is not a reason: it ticks the activity instead. No
-- user_id of its own — ownership comes through the activity, the same
-- shape recurring_skips uses for its rule.
-- ============================================================
create table if not exists miss_reasons (
  activity_id uuid primary key references activities(id) on delete cascade,
  reason      text not null check (reason in ('no_time', 'tired', 'sick', 'forgot', 'not_priority')),
  created_at  timestamptz not null default now()
);

alter table miss_reasons enable row level security;

create policy "own miss reasons" on miss_reasons
  for all using (
    exists (select 1 from activities a where a.id = miss_reasons.activity_id and a.user_id = auth.uid())
  ) with check (
    exists (select 1 from activities a where a.id = miss_reasons.activity_id and a.user_id = auth.uid())
  );

-- ============================================================
-- 4. APPLE CALENDAR FEED — a private subscription URL
-- Calendar apps fetch a feed with no session and no headers, so the URL
-- itself carries a long random token. The function below is the only door
-- through it: it answers for exactly the one user whose prefs hold that
-- token, returns titles and dates and nothing else, and needs no
-- service-role key on the server. Tokens shorter than 32 characters are
-- refused outright, so an empty or guessed value matches nobody.
-- ============================================================
alter table prefs add column if not exists feed_token text unique;

create or replace function public.calendar_feed(p_token text)
returns table (kind text, id uuid, title text, course text, day date, done boolean)
language sql
stable
security definer
set search_path = public
as $$
  with owner as (
    select user_id from prefs where feed_token = p_token and length(p_token) >= 32
  )
  select 'activity', a.id, a.title, p.name, a.date, a.done
    from activities a
    join projects p on p.id = a.project_id
   where a.user_id = (select user_id from owner)
     and a.date between current_date - 60 and current_date + 60
  union all
  select 'waypoint', w.id, w.title, p.name, w.due, w.done
    from waypoints w
    join projects p on p.id = w.project_id
   where p.user_id = (select user_id from owner)
     and p.status = 'active'
     and w.due is not null
$$;

revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
