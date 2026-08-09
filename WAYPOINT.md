# Waypoint — project brief

A personal goal planner for one user. Projects are courses, sub-goals are waypoints,
the calendar is the log. Built as a prototype first; this document is the spec for
turning it into a real app.

## Stack

- Next.js (App Router) + TypeScript
- Supabase — Postgres + Auth (magic link)
- Plain CSS in `app/globals.css`. **No Tailwind, no component library.** The design
  already exists as hand-written CSS in the prototype; port it as-is.
- Deployed on Vercel

## Source material

`prototype/waypoint-journal.jsx` — the working prototype. Every feature below already
works there. The port should preserve behaviour and visual design exactly; the only
change is where the data lives.

## Data model

See `schema.sql`. Four tables: `projects`, `waypoints`, `activities`, `prefs`.
All protected by row level security keyed on `auth.uid()`.

Field notes that are easy to get wrong:

- **`ci`** is a colour *slot* (0–5), not a hex value. Light and dark mode each have
  their own six-colour palette; the same slot resolves to a different hex in each mode
  so a project keeps its identity when the mode changes. Never store hex.
- **`date` on activities is a plain date, not a timestamp.** All date handling is local
  time. The prototype builds keys as `YYYY-MM-DD` from `getFullYear/getMonth/getDate` —
  never `toISOString()`, which shifts the day for anyone east of UTC. Denmark is UTC+1/+2,
  so this bug would move every evening activity to the next day.
- **`status`** is `active` or `archived`. Archived projects stay fully intact and
  readable; they just leave the Today view and the default Projects list.

## Features (all working in the prototype)

**Today** — greeting, a one-line note generated from the day's activities, the course
strip (activities as nodes on a progress track), the day's to-do list with checkboxes,
active projects with their route lines, and the next seven days.

**Projects** — create and edit with Purpose / Situation / Approach / target date /
colour slot. Waypoints add, tick, delete. Archive and reactivate. Delete with an inline
confirm, which cascades to that project's activities.

**Calendar** — Monday-first month grid. One dot per activity in its project's colour:
outlined = planned, filled = cleared. A day where everything is cleared gets a tinted
background. Click a day to see and edit it.

**Statistics** — completion rate, cleared count, clear streak, a fourteen-day
cleared-vs-planned chart, and a per-project breakdown.

**Import** — paste a list, one activity per line, optional leading `YYYY-MM-DD`.

**Light / dark** — a toggle in the header, persisted per user in `prefs`.

### Definitions worth keeping consistent

- **Completion rate** counts only activities dated today or earlier. Future activities
  are not failures.
- **Clear streak** counts consecutive days, going back from today, where every planned
  activity was cleared. Days with nothing planned are skipped rather than breaking the
  streak. If today still has open items, the count starts from yesterday.

## Build order

**Phase 1 — port.** Next.js app, the prototype rendered as components, still using
local state. Deployed on Vercel and reachable from the phone. No database yet.

**Phase 2 — persistence.** Supabase auth (magic link, one user). Replace local state
with database reads and writes. Optimistic updates on every toggle — ticking a checkbox
must feel instant, not wait for a round trip.

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
