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
Deliberately parked: Strava locked its API behind a paid developer
subscription in mid-2026, and the user is waiting for cheaper student
pricing before turning it on. `STRAVA_ENABLED = false` in `StatsView.tsx`
hides the connect card until then.

Phase 4 (recurring activities) is **built, and live in the UI, but only
half-working on the real database** — see the three migration notes below.
`migration-phase-4` has been run; `-5` and `-6` have not, as of the last
session. Until both run: recurring rules can be created and edited in
`ProjectDetail.tsx`, but no activity rows actually materialize from them
(phase 5 — silent DB conflict), and deleting a materialized instance fails
loudly instead of just failing (phase 6 — no migration means no table to
write the skip to). **Check whether the user has run these before doing
anything else with recurring activities** — don't assume a fix that
shipped in code is actually live.

A home-screen streak widget is also built and working, via a workaround
that took several wrong turns to land on — worth reading the dated section
below before touching it again, so the same dead ends aren't retried.

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
  `migration-phase-4-recurring.sql` (the `recurring_activities` table) **has
  been run** — confirmed directly against the live database (a real
  `select` against the table, not just "the user said so") before this
  shipped. Worth knowing for next time: this one was a harder blocker than
  Strava's ever is — `db.loadAll` queries this table on every single load,
  unconditionally, with no feature flag around it, so deploying it before
  the migration ran wouldn't have left one feature dark, it would have
  broken the entire app's load for the live user.
  **`migration-phase-5-fix-recurring-conflict.sql` has NOT been run** —
  found the hard way: recurring activities silently generated zero rows,
  ever, not even for today, because `activities_external_unique` was a
  *partial* index (`where external_id is not null`) and Postgres refuses
  to match a plain `ON CONFLICT (user_id, source, external_id)` against a
  partial index without repeating its WHERE clause — which supabase-js's
  `.upsert({onConflict})` has no way to express. Every materialization
  attempt failed with "no unique or exclusion constraint matching the ON
  CONFLICT specification," caught by `Waypoint.tsx`'s own try/catch, so it
  never surfaced as anything louder than a console warning. This also
  silently affects Strava's webhook the moment that's re-enabled — same
  upsert pattern, same index. The fix replaces the partial index with a
  plain one on the same three columns; confirmed safe against the live
  data (zero existing rows have a non-null `external_id` to conflict).
  **`migration-phase-6-recurring-skips.sql` has NOT been run** — a second
  recurring-activities bug, reported by the user directly: deleting a
  generated instance "worked" (removed from the list, stayed removed
  across a manual click-around) but came back on every reload. Cause: the
  materializer has no way to distinguish "the user deleted this on
  purpose" from "this was never generated" — both look identical, an
  absent activities row — so it faithfully recreated whatever was just
  removed. `recurring_skips` is the missing memory: one row per
  `(rule_id, date)` explicitly dismissed, checked in `Waypoint.tsx`
  alongside the existing-activity set before materializing. Until this
  migration runs, deleting a recurring activity will fail outright (the
  failure banner, not a silent revert) rather than just being undone —
  `removeActivity` now writes to a table that doesn't exist yet.
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
  home-screen widget; the `today` it's called with must come from
  the phone (`?today=YYYY-MM-DD`), never computed from the server's clock —
  same local-date rule as everywhere else in this app, and getting it backwards
  here specifically would read as a broken streak in the evening for anyone
  east of UTC. **The delivery mechanism is Scriptable, not Shortcuts** — the
  iOS Shortcuts app's own widget is a launcher button, not a display; it
  cannot show data passively no matter how it's configured. The working
  setup is a small Scriptable script (lives on the user's phone, not in
  this repo) that fetches the endpoint and renders a real WidgetKit
  widget via `ListWidget`/`Script.setWidget()`, refreshed on iOS's own
  schedule. Tapping the widget opens the app in Safari, not as the
  standalone home-screen app — confirmed via Apple's own developer forums
  that there is currently no public API for a third-party widget/script to
  launch a specific *installed* PWA on iOS; only tapping that app's own
  icon does. Don't re-propose a `webapp://` URL scheme or similar — it was
  tried, and doesn't exist as a general mechanism (the one report of it
  working was iOS-26-beta-specific and unconfirmed elsewhere).
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
- **A partial unique index doesn't satisfy a plain `ON CONFLICT`.**
  `activities_external_unique` was `on activities (user_id, source,
  external_id) where external_id is not null` — a plain
  `.upsert({onConflict: "user_id,source,external_id"})` from supabase-js
  cannot match it, because Postgres only matches an `ON CONFLICT` target
  against a partial index if the same `WHERE` clause is repeated in the
  conflict clause, which the client library has no way to express. Every
  upsert against that index failed with "no unique or exclusion constraint
  matching the ON CONFLICT specification" — silently, since it was inside
  a try/catch, for as long as the feature using it (recurring activities)
  existed. Fixed in `migration-phase-5-fix-recurring-conflict.sql` by
  making the index non-partial; safe because a standard unique constraint
  never treats two NULLs as duplicates of each other, so rows with a null
  `external_id` (every manually-added activity) keep coexisting exactly as
  before. If a future upsert target needs a partial index, this is why it
  won't work through supabase-js's `onConflict` option.
- **This macOS environment's folder access can silently drop mid-session.**
  Happened twice: every `Read`/`Bash` call against the project path started
  returning `EPERM: operation not permitted`, with no code change to
  explain it — a Files-and-Folders / Full Disk Access permission for
  whatever app is running the session got revoked, not something fixable
  from inside the session. Both times, asking the user to check System
  Settings → Privacy & Security → Files and Folders (toggling the
  permission off and back on, even when it looked already-on) restored
  access within a turn or two. Don't try alternate paths or assume the
  files were deleted — retry the same path after asking.
- **No local service-role key.** `.env.local` only has the two
  `NEXT_PUBLIC_*` Supabase values — `SUPABASE_SERVICE_ROLE_KEY` is
  Vercel-only, per `SUPABASE_SERVICE_ROLE_KEY` in the widget/Strava notes
  above. To inspect real production data directly (not through RLS-blind
  anon queries, which return an empty result for any authenticated-only
  row rather than an error — easy to misread as "the table is empty"), the
  working technique was reading the Supabase auth cookie out of an
  already-logged-in browser tab (`sb-<ref>-auth-token`, base64-decoded
  JSON with an `access_token`) and calling the REST endpoint directly with
  that token plus the public anon key as `apikey`. That's how the
  recurring-activities materialization bug was actually found, after the
  UI alone wasn't enough to tell "no rule exists" apart from "the rule
  exists but never fires."

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
- **Verify platform-specific claims before asserting them, not from
  memory.** Got this wrong twice in a row on the same feature: first
  claiming the iOS Shortcuts widget could display data passively (it
  can't — confirmed by search only after the user reported it didn't
  work), then claiming a `webapp://` URL scheme could deep-link into the
  installed PWA (also wrong — the source was a single beta forum post,
  and Apple's own developer forums confirm no such general mechanism
  exists). Third time, searched and cross-checked against multiple
  sources *before* answering (Scriptable's actual widget API) and it
  worked first try. When the claim is about what a specific OS/browser
  version does, look it up or reproduce it — don't state it as fact from
  training data, and say so plainly if a claim didn't hold up in practice
  rather than quietly moving on.
- **When "it doesn't work" and the UI alone can't say why, check the
  database directly** rather than guessing from the app's behavior — see
  the "no local service-role key" gotcha above for the technique. Found
  the recurring-activities conflict bug this way after several rounds of
  guessing at Shortcuts/iOS causes for what was actually a Postgres
  index problem.

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

## iOS home-screen app, a value audit, recurring activities (14–18 August 2026)

Four separate threads of work, roughly in the order they happened.

**iOS home-screen launch fixed.** The installed app was opening as a normal
Safari tab (address bar, toolbar, the works) instead of standalone. Cause:
this Next.js version's `appleWebApp.capable` metadata only emits the newer
unprefixed `mobile-web-app-capable` tag, which iOS didn't honour before
17.4 — the legacy `apple-mobile-web-app-capable` tag is what actually
matters, and had to be added by hand via `other` in `layout.tsx`'s
metadata (the typed API has no field for it). Also added `viewportFit:
"cover"` to fix a separate symptom (a persistent white strip behind the
home-indicator area) — without it, `env(safe-area-inset-*)` silently
resolves to 0 rather than a real value, so `.wp-tabbar`'s existing
safe-area padding was a no-op the whole time. Both fixes are **user-verified
working** on a real device, not just built and assumed. One trap if this
is ever touched again: turning on `viewport-fit=cover` makes that env()
value real for the first time, which grows the tab bar taller on notched
phones — `.wp-main`'s bottom padding had to become additive with the same
env() value or the last bit of every scrollable view clips under the bar.

**A full value audit, not just a visual one.** Different from the 13
August design pass — that one was spacing/type/hierarchy; this one asked
"does this element earn its place" of every screen, with the user
confirming or overriding each cut. Removed: `CourseStrip` (redundant with
the to-do list right below it), the calendar legend, Statistics' "Effort
score" KPI (already shown in the chart below it) and later its "Active
courses" KPI too (already countable on the Courses tab), and Review's
"Progress by project" section (merged into Statistics instead — see
below). Moved: the Focus timer to the bottom of Today, since the to-do
list is what the page is actually for. Changed: Today's "Active courses"
list shows goal-based progress (how far from the real target) instead of
a waypoint count, for any project that has a goal — explicitly **not**
hiding goal-less projects from the list, which was floated and then
declined by the user. Mechanically, `projectPace` (route walked vs. time
spent) was pulled out of `buildReview` into a shared helper in `week.ts`,
and `buildProjectStandings` added alongside `buildReview` as its all-time
counterpart — Statistics' new "Progress by project" section and the
weekly review's own now share the same pace/goal-movement math instead of
two implementations that could quietly drift apart.

**Recurring activities**, covered in more detail in `WAYPOINT.md`'s own
Features entry — the summary here is what went wrong after it shipped,
since that's what a fresh session most needs to know:
1. It generated zero rows, ever, not even for today — the partial-index
   `ON CONFLICT` bug in the gotchas section above. Fixed in
   `migration-phase-5-fix-recurring-conflict.sql`.
2. Deleting a generated instance came back on the next reload, on every
   device — the materializer couldn't tell "deleted on purpose" apart from
   "never generated." Fixed in `migration-phase-6-recurring-skips.sql`
   plus a new `recurring_skips` table, checked in `Waypoint.tsx` before
   materializing.

**Both migrations are still unrun as of this writing** — check before
assuming recurring activities actually work on the live database.

**Clear streak unified.** There were briefly two streak functions —
`clearStreak` (lenient, skipped empty days, used by Statistics) and
`engagementStreak` (strict, broke on empty days, used only by the
widget) — a deliberate split at the time, reasoned as "right for
reviewing history" vs. "right for a daily nudge." The user reported
Statistics showing a streak of 6 with no real 6-day run, which is exactly
what the lenient version does when several of the "6 days" had nothing
planned on them. Resolved by deleting `engagementStreak` and giving
`clearStreak` its stricter body instead — one function, shared by
Statistics and the widget, so they can't drift apart again. If a lenient
"don't count empty days against me" streak is ever wanted again, it needs
a new name and a clear reason, not a silent reintroduction of the old
`clearStreak`.
