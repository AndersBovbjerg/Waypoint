@AGENTS.md

# Session memory

This is a running note for picking the project back up in a fresh session — not
the spec. **`WAYPOINT.md` is the source of truth** for what the app is and does;
it has been kept current after every change, including the two places where the
build diverged from the original plan (the store interface had to become
granular, and sign-in became a password). Read it first.

This file holds what `WAYPOINT.md` shouldn't carry: account state, operating
gotchas, and how we've been working together.

## Where things stand

Phases 1, 2, and the extra features asked for on top (focus timer, weekly
review, goals, project identity, the app's own dropdown, an effort score) are
all built, tested, and pushed. `main` is deployed and auto-deploys on push.

Phase 3 (Strava) is **written but not yet live** — see the migration and env
var notes below. It has never run against the real Strava API; the OAuth
round trip and the webhook both need a public URL, so neither has been
exercised end to end. Treat it as unproven until a real run has landed.

- **Live app:** waypoint-steel-ten.vercel.app — public, no deployment protection.
- **GitHub:** `AndersBovbjerg/Waypoint`, connected to Vercel for auto-deploy on
  push to `main`.
- **Supabase:** password sign-in (magic link kept as a fallback route, but the
  built-in mailer rate-limits to a handful of messages an hour — don't rely on
  it). Public sign-up is disabled. One user.
- **Migrations:** `schema.sql` is the original shape; `migration-phase-2.sql`
  (sessions, `waypoints.done_at`, prefs columns) and
  `migration-02-goals-and-identity.sql` (goals, `goal_entries`, twelve colour
  slots, project icon) have both been run against the live database already.
  `migration-phase-3-strava.sql` (the `strava_tokens` table and the metric
  columns on `activities`) **has not been run yet** — nothing in the Strava
  feature works until it is. Any new schema change needs a new migration file,
  applied by the user in the Supabase SQL editor — never assume a column
  exists without checking.
- **Strava env vars, not yet set anywhere:** `STRAVA_CLIENT_ID`,
  `STRAVA_CLIENT_SECRET`, `STRAVA_WEBHOOK_VERIFY_TOKEN` and
  `SUPABASE_SERVICE_ROLE_KEY`, all server-only — the last one bypasses row
  level security, so a `NEXT_PUBLIC_` prefix on it would hand every row to
  anyone who opened devtools. The webhook subscription itself is registered
  once by hand against Strava's `push_subscriptions` endpoint after the
  routes are deployed; it cannot point at localhost.
- **Widget env vars, not yet set anywhere:** `WIDGET_API_TOKEN` (any random
  string — it's a shared secret, not a real auth flow, which is fine for one
  endpoint on a single-user app with no public sign-up) and `WIDGET_USER_ID`
  (the Supabase auth user id, from Dashboard → Authentication → Users).
  `app/api/widget/streak` reuses `SUPABASE_SERVICE_ROLE_KEY` above — no new
  Supabase-side setup needed, just the two new env vars. Feeds an iOS
  Shortcuts home-screen widget; the `today` it's called with must come from
  the phone (`?today=YYYY-MM-DD`), never computed from the server's clock —
  same local-date rule as everywhere else in this app, and getting it backwards
  here specifically would read as a broken streak in the evening for anyone
  east of UTC.
- **Unfinished housekeeping:** two stray Vercel projects (`waypoint-vbue`,
  `waypoint-vxdj`) were created by a duplicate GitHub import and were never
  confirmed deleted — worth checking before they cause confusion about which
  URL is live.

## Operating gotchas worth not re-learning

- **Local dates, never `toISOString()`.** Every date key (`date`, `due`,
  `target`, the day component of `sessions.date`) is built from
  `getFullYear/getMonth/getDate`. `toISOString()` is only ever correct for a
  genuine instant (`startedAt`, `doneAt`). Getting this backwards shifts
  everything by a day for anyone east of UTC — it's the single most repeated
  rule in this codebase for a reason.
- **Never remove a DOM node React/Next rendered.** A bug here tore out the
  `theme-color` meta tag Next renders from the `viewport` export before
  writing a new one; React's next update threw on `removeChild` mid-commit and
  took the whole page down. Read as a `Failed to fetch` / DNS problem for a
  long time before being traced to this. The app now owns exactly one meta tag
  of its own (`data-wp-theme`), created once and only ever updated in place.
- **`NEXT_PUBLIC_*` env vars on Vercel are easy to corrupt by paste.** One
  outage traced back to `NEXT_PUBLIC_SUPABASE_URL` containing the URL plus a
  trailing quote, a newline, and the next variable's line — Supabase-js built
  garbage requests and every fetch failed. If auth or data loading breaks in
  production but works locally, check the deployed bundle for the actual
  string, not just whether the variable exists.
- **The database write layer is per-record, not whole-document.** Local
  storage originally saved the entire `AppData` object on every change,
  which does not scale to Postgres — a single tick would rewrite every row
  the user owns. `components/db.ts` exposes one function per mutation
  (`setActivityDone`, `addWaypoint`, etc.), and `Waypoint.tsx`'s `mutate()`
  helper applies the change to a `dataRef` optimistically, then rolls it back
  and surfaces a banner if the write fails. New mutations should follow that
  shape, not reintroduce a save-everything path.
- **`start_date_local` from Strava is a lie in ISO clothing.** It ends in `Z`
  but holds local wall-clock time. The day key is `.slice(0, 10)` on the raw
  string — never `new Date(...)`. A 01:30 run is the case that exposes it:
  sliced it stays on the 13th, parsed it moves to the 12th. `done_at` in the
  very same object is a real instant and *does* go through `Date`. Two
  opposite rules, one object; both are commented in the webhook for that
  reason.
- **A typed Supabase client needs `type`, not `interface`.** The service-role
  client in `components/supabase-admin.ts` takes a `Database` generic.
  Declared with `interface`, every table resolved to `never` and each insert
  failed with "not assignable to type `never[]`" — interfaces get no implicit
  index signature, so they do not satisfy `Record<string, GenericTable>`. The
  same declaration as a `type` alias just works. The error message points at
  the insert payload, nowhere near the actual cause.
- **React Compiler is active.** It sometimes can't preserve a manual
  `useMemo` and errors the build (`react-hooks/preserve-manual-memoization`).
  When that happens, the fix used here was to drop the manual memoization for
  cheap, bounded computations rather than fight the compiler — check whether
  the surrounding file already leaves similar work unmemoized before adding a
  `useMemo` back.
- **`components/store.ts` is now just the running timer's countdown** —
  device-local, not synced. Everything else lives in Supabase behind
  `components/db.ts`. Don't resurrect the old whole-document local store.

## How we've been working

- **Small commits, one concern each** (already in `WAYPOINT.md`'s working
  agreements) — held to strictly, including splitting an unrelated leftover
  bug fix into its own commit rather than folding it into the next feature.
- **Throwaway tests for pure logic before wiring UI.** Several real bugs were
  caught this way and would have shipped otherwise: a `formatDelta` sign bug
  in `goal.ts` (a revenue increase displayed with a minus sign), a `firstDate`
  bug in `effort.ts` (partial effort before the first whole point was silently
  excluded from the series), and a `stop()` bug in `useTimer.ts` (logging a
  session from inside a state updater, which React discards). The pattern:
  copy the pure module and its type deps into a scratch dir, run with
  `node --experimental-strip-types`, assert against hand-computed expected
  values, delete the scratch dir once green. Worth repeating for any new pure
  scoring/date/arithmetic module.
- **The `dataviz` skill was loaded before building the effort chart** — load
  it again before building any new chart rather than freehanding one.
- **Deploys and Vercel/Supabase dashboard changes are done with the user's
  explicit go-ahead each time**, even though the Vercel CLI is authenticated
  in this environment. Don't push, redeploy, or change project settings
  without being asked in that turn.
- **Copy is plain and specific**, per the working agreement — errors say what
  happened and what to do, empty states invite the next action.

## Recently shipped, not yet exercised

The effort chart (Statistics tab) was verified with fabricated data via a
temporary preview route (built, screenshotted in light/dark/380px, then
deleted) because the session's own login had expired and re-authenticating
wasn't possible. It has not yet been checked against the user's real data —
worth asking whether the curve matched expectations before assuming it's done.

## Design pass (13 August 2026)

A full visual audit (screenshots + measured CSS at 380/768/1280, both modes)
found the app had no type/spacing/radius scale — 18 font-sizes, 14 gap
values, 9 radii, all chosen ad hoc — plus a real bug (the calendar grid
overflowed its container by 40px, causing page-wide horizontal scroll on
mobile) and a hierarchy problem (Archive/Cancel were the most visually
prominent buttons on the project card and the new-project modal — the rarest
actions, not the most common ones).

Fixed: a seven-step type scale and matching spacing/radius scale now live as
CSS custom properties on `.wp-root` in `globals.css` (`--fs-1`…`--fs-7`,
`--sp-1`…`--sp-7`, `--r-sm`/`--r-md`/`--r-pill`) — any new component should
draw from these rather than picking a fresh pixel value. The header shrank
from a permanent 167px to ~56px; navigation moved to a bottom tab bar on
mobile/tablet (`.wp-tabbar`) and stays a top row above 768px, both driven by
the same `TABS` array in `Waypoint.tsx`. Project cards moved Archive/Delete
behind a "⋯" menu; the new-project modal defaults to name + optional target
date + colour (six swatches, "+" reveals the rest of the palette and every
icon) with purpose/situation/approach/goal behind "+ Add details" — expanded
automatically when editing a project that already has them, so nothing looks
lost. Every interactive element is a real 44×44 hit target except two
deliberate, documented exceptions: calendar day cells (seven columns cannot
fit 44px squares in 380px without reintroducing the overflow bug) and the
colour/icon picker swatches (a dense grid where full 44px targets would
force it to wrap far more than the "six visible, tap to expand" design
wants) — both get a smaller safe expansion via an absolutely positioned
`::before` instead.

One thing to know if a new modal is added: `Overlay` now takes an optional
`scroll` prop that pins the title/close and the action buttons while only
the middle scrolls (`wp-modal-head`/`wp-modal-body`/`wp-modal-actions`,
see `ProjectModal.tsx`). Plain modals (`ImportModal`, confirm dialogs)
don't need it and still just render into `.wp-modal`'s default padding.
