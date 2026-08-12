# Waypoint — project brief

A personal goal planner for one user. Projects are courses, sub-goals are waypoints,
the calendar is the log. Built as a prototype first; this document is the spec for
turning it into a real app.

## Stack

- Next.js (App Router) + TypeScript
- Supabase — Postgres + Auth (password, with a magic link as a second route)
- Plain CSS in `app/globals.css`. **No Tailwind, no component library.** The design
  already exists as hand-written CSS in the prototype; port it as-is.
- Deployed on Vercel

## Source material

`prototype/waypoint-journal.jsx` — the working prototype. Every feature below already
works there. The port should preserve behaviour and visual design exactly; the only
change is where the data lives.

## Data model

See `schema.sql`. Six tables: `projects`, `waypoints`, `activities`, `sessions`,
`goal_entries`, `prefs`.
All protected by row level security keyed on `auth.uid()`.

Field notes that are easy to get wrong:

- **`ci`** is a colour *slot* (0–11), not a hex value. Light and dark mode each have
  their own six-colour palette; the same slot resolves to a different hex in each mode
  so a project keeps its identity when the mode changes. Never store hex.
- **`date` on activities is a plain date, not a timestamp.** All date handling is local
  time. The prototype builds keys as `YYYY-MM-DD` from `getFullYear/getMonth/getDate` —
  never `toISOString()`, which shifts the day for anyone east of UTC. Denmark is UTC+1/+2,
  so this bug would move every evening activity to the next day.
- **`status`** is `active` or `archived`. Archived projects stay fully intact and
  readable; they just leave the Today view and the default Projects list.
- **`waypoints.done_at` is what makes a review possible.** `done` alone cannot say
  *when* a checkpoint was reached, so it cannot answer which waypoints moved in a
  given week. Anything ticked before the column existed has a null here and reads
  correctly as reached at some earlier point, rather than being counted into the
  current week.
- **A session is an instant, an activity is a day.** `sessions.started_at` and
  `ended_at` are real timestamps, but `sessions.date` is still a plain local date
  and is written by the client. Deriving it in SQL from `started_at` would use UTC
  and move every evening session to the next day — the same trap as above.

## Features (all working in the prototype)

**Today** — greeting, a one-line note generated from the day's activities, the course
strip (activities as nodes on a progress track), the day's to-do list with checkboxes,
active projects with their route lines, and the next seven days.

**Projects** — create and edit with Purpose / Situation / Approach / target date /
colour slot / optional icon. A project can also carry a **goal**: a label, a unit and
the two ends of the journey, with readings logged over time so it can be watched
moving rather than only described. Everything is stored as a plain number — seconds
for a time, kroner for money — so the progress arithmetic is the same whatever is
measured. There is no direction field: a target below the start counts downwards,
which is true of a race time and false of revenue, and a derived answer cannot
contradict the numbers it describes. Waypoints add, tick, delete. Archive and reactivate. Delete with an inline
confirm, which cascades to that project's activities.

**Calendar** — Monday-first month grid. One dot per activity in its project's colour:
outlined = planned, filled = cleared. A day where everything is cleared gets a tinted
background. Click a day to see and edit it.

**Statistics** — completion rate, cleared count, clear streak, an effort score, and
a per-project breakdown.

The effort score turns three different kinds of record into one running number: a
cleared activity is worth 1 point, a reached waypoint 3, and a focus block 1 point
per 25 minutes, converted continuously off the running total so a 47-minute sitting
and two 30-minute ones both land at the same rate. It is plotted as a single
cumulative line with no ceiling — the goal meter and waypoints already answer "how
close," bounded 0–100%; this answers "how much has gone in so far," and only ever
grows. See `components/effort.ts`.

**Import** — paste a list, one activity per line, optional leading `YYYY-MM-DD`.

**Focus** — a focus/break timer on the Today view, bound to a project and
optionally to one of today's open activities. Presets of 25/5, 50/10, 90/20 and a
custom pair; a long break after a set number of blocks; auto-start of either phase
as a preference. Each completed block is written to `sessions`, so Statistics can
answer where the hours went, not just which boxes were ticked. Stopping early still
logs the minutes that were actually worked.

**Review** — a Monday-to-Sunday look back at the week: what was cleared and what was
left open, which waypoints were reached, focus time logged, and a per-project
breakdown. Available from its own tab at any time, and any past week can be paged
back to.

It also comes to you. Early on a Sunday it waits as a quiet card on Today; from
09:00 it opens itself in a window over the app — either as the hour passes on a
window left open, or the moment the app is next opened that day. Closing it settles
the week, and it does not ask again until the next one. Both the card and the window
are derived from the same two facts, the clock and whether the week is settled, so
there is no separate open/closed flag able to disagree with them. If notifications
have been granted for the timer, nine o'clock also sends one, since a window that
opens behind other things is a window nobody sees.

Each project row states route walked against time elapsed toward the target date —
*ahead*, *on pace*, *behind pace*. It stays silent for the first stretch of a
project's run, when barely any time has passed and a single tick would read as being
ahead. Projects that did not move are listed too, plainly. A week where nothing
happened on a course is exactly what a review exists to show.

**Light / dark** — a toggle in the header, persisted per user in `prefs`.

### The timer, on an app that stays open

Waypoint is meant to sit open all day, which the timer has to survive:

- The countdown is derived from an absolute end timestamp, never accumulated from
  ticks. A backgrounded tab gets throttled to roughly one tick a minute, so a
  counter that decrements per tick would drift badly; reading the clock instead
  means the display is right the moment the window is looked at again.
- The running phase is persisted, so a reload mid-session picks it back up.
- A phase that ended more than two minutes ago is settled silently — no bell for a
  break that finished while the machine was asleep.
- The day key is recomputed at midnight and whenever the window regains focus.
  Computing it once per mount is fine for a page reloaded daily; here it would
  leave yesterday's list on screen in the morning.

### Definitions worth keeping consistent

- **Completion rate** counts only activities dated today or earlier. Future activities
  are not failures.
- **Clear streak** counts consecutive days, going back from today, where every planned
  activity was cleared. Days with nothing planned are skipped rather than breaking the
  streak. If today still has open items, the count starts from yesterday.
- **A week runs Monday to Sunday**, matching the calendar grid. On a Sunday the week
  under review is the one ending that day, not the one before.
- **The week's activities are the ones dated inside it**, cleared or not. An old item
  ticked this week belongs to the week it was planned for, which is what keeps the
  review a picture of the plan rather than of the ticking.

## Build order

**Phase 1 — port.** Next.js app, the prototype rendered as components, still using
local state. Deployed on Vercel and reachable from the phone. No database yet.

**Phase 1a — local persistence.** Superseded by phase 2. Data lived in
`localStorage` behind a store interface, which is what made the app usable day to
day before there was a database. What remains on the device is the countdown of a
running timer — it is about the window rather than about the user.

**Phase 2 — persistence.** Done. Supabase, one user. `components/db.ts` reads and
writes one record at a time; every change is applied to the screen first and written
after, and a write that fails takes its change back and says so.

Two things turned out differently from the plan written here:

- *The interface had to change, not just its implementation.* Saving the whole
  dataset on every change is fine for a few kilobytes and wrong for Postgres, where
  a single tick would rewrite every row the user owns. The callers changed with it.
- *Sign-in is a password, not a magic link.* The link depends on Supabase's built-in
  mail sender, which allows a handful of messages an hour and is meant for testing.
  Hitting that limit locked the only door to the app, on exactly the day a new device
  was being set up. The link is still there as a second route.

Public sign-up is turned off in Supabase. The app is on a public URL, and row level
security keeps one user's rows to themselves, but there is no reason to let a
stranger create an account.

**Phase 3 — Garmin.** OAuth against the Garmin Connect API, pull completed activities,
write them in with `source = 'garmin'` and the Garmin activity id as `external_id`.
The unique index handles repeat syncs. The existing paste-importer already produces the
same shape, so the write path is shared.

## Working agreements

- Small commits, one concern each.
- Mobile matters — this gets opened on a phone in the morning. Test at 380px wide.
- Keyboard focus stays visible, and `prefers-reduced-motion` stays respected.
- Copy is plain and specific. Errors say what happened and what to do. Empty states
  invite an action rather than apologising.
