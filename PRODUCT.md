# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One user: the author. Whether it stays that way is **explicitly undecided** (recorded 20 September 2026). Design for one user, but avoid choices that would be expensive to undo if it opens up — public sign-up is currently disabled in Supabase.

The situation is two surfaces, not one:

- **An iPhone with the app installed to the home screen** — standalone, safe-area insets live, 375–430px, held one-handed at arm's length. Many short opens a day, often about five seconds.
- **A Mac browser**, where longer sessions and maintenance happen. This is also where the author reviews his own changes, which is why a fix only visible on a phone can read as no fix at all.

There is no tablet story and no anonymous-visitor story.

## Product Purpose

A personal goal planner. A goal becomes a **course**; the checkpoints that prove progress become **waypoints**; the calendar is the **log** of where you actually went.

Success is that the user can answer **"am I on track?"** at a glance, and then act on the answer. The first half works. The second half is the app's main open problem — see Operating Context.

## Positioning

Progress is a **route**, not a percentage. A course has named checkpoints and a target date, so there is an ideal line you can be measurably ahead of or behind — which a completion percentage cannot express. A neighbouring to-do app can copy a checklist; it cannot copy "you are behind your own pace and here is where."

Goals carry **dated readings** rather than a single target, so a goal is something watched moving rather than a sentence written once.

## Operating Context

- **The primary job is accountability**: am I on track? Planning and logging exist to serve that question, not the other way round. This is the confirmed answer to what the Today screen should be built around.
- **A week runs Monday to Sunday**, matching the calendar grid. On a Sunday the week under review is the one ending that day.
- **The Sunday review is looked at, but its output is not actionable.** In the user's own words: *"I believe I use it, and look at it, but I don't know what to do with the information that I am given. I want to act on it, I just don't know how. In that way it's useless, but I think it could be valuable if I use the information in the right way."*
  This is an **open problem**, and it is the sharpest one in the product: a review that reports facts without producing a decision fails the accountability job above. The fix is what the review *emits*, not where it lives in the navigation.
- **Activities are logged after the fact, not planned ahead.** Manual activities are created already completed, as a record of what happened. The only activities that exist before they are done are the ones a recurring rule materialised. This is the actual usage pattern, confirmed by the user on 20 September 2026, and it is not a habit to be corrected.
- **Plans are adaptive and externally owned, so they cannot be plotted far ahead.** The user's training is prescribed week to week by a watch that re-plans every remaining workout the moment one is missed. A calendar of future activities is therefore stale within a day of any miss, and maintaining one by hand is the hassle that prevents planning at all. In his words: *"if I miss just one day, every single workout after the one I missed is gonna change… so I can't plot weeks ahead."*
  The consequence for design: **plan at the waypoint level, which is stable; log at the activity level, which is volatile.** Waypoints are the structure. Activities are evidence. Any feature that asks the user to schedule activities into future weeks is working against how the product is actually used.
- **Completion rate and the clear streak do not measure what they appear to.** Because manual activities are born completed, every one logged pushes completion rate toward 100% regardless of adherence; the figure tracks logging volume, not discipline. And `clearStreak` ends on any day with nothing logged, so it reads as "days I both did something and completed every recurring item." The user's real metric is **recurring adherence**. Treat both existing figures as unreliable headlines until this is deliberately resolved — it affects Statistics and the home-screen widget as well as the review.
- **The intent to focus arrives before the decision about what it counts toward.** Asking which course a session belongs to before it can start puts a filing decision in front of an impulse.
- Migrations are run by hand against Supabase. Unrun migrations have caused silent feature failures twice, so any design that needs a schema change carries a real adoption cost and should be weighed against a client-side alternative.

## Capabilities and Constraints

**Surfaces:** Today, Courses, Calendar, Review, Stats. Plus a focus timer, goals with dated readings, recurring activity rules, and a home-screen streak widget driven by Scriptable.

**Terminology is load-bearing and binding:** projects are *courses*, sub-goals are *waypoints*, dated to-dos are *activities*, the calendar is *the log*. Use this vocabulary in UI copy.

**Definitions fixed in code, and not to be re-derived:**
- Completion rate counts only activities dated today or earlier; future activities are not failures.
- The clear streak counts consecutive real calendar days; a day with nothing logged ends it rather than being skipped, so the number is one the user could reach by counting days himself. One definition (`clearStreak` in `components/helpers.ts`) shared by Statistics and the widget.
- A week's activities are the ones dated inside it, cleared or not.

**Technical constraints that shape design:**
- Dates are local-time `YYYY-MM-DD` keys, never `toISOString()`, which would shift every evening activity to the next day in Denmark.
- A course's colour is a **slot** (0–11), never a hex, so a course keeps its identity across light and dark.
- `sessions.project_id` is `NOT NULL`. Filing a focus session after the fact therefore needs either a migration or a client-side holding pattern.
- Plain CSS in `app/globals.css`. No Tailwind and no component library, deliberately.
- Supabase with row level security keyed on `auth.uid()`.

**Undecided or parked:**
- Whether the app ever opens to more than one user.
- What the weekly review should emit.
- Strava is written but parked behind a paid API tier.
- Push reminders are built but not live; the VAPID variables are unset.

## Brand Commitments

The name **Waypoint**. The nautical vocabulary above is binding, not decorative.

Voice: plain and specific. Errors say what happened and what to do. Empty states invite the next action rather than apologising — "A quiet week is still a week."

## Evidence on Hand

- `prototype/waypoint-journal.jsx` — the original working prototype.
- `WAYPOINT.md` — the functional spec and working agreements.
- `DESIGN.md` and `.impeccable/design.json` — the visual system as shipped.
- Live at `waypoint-steel-ten.vercel.app`, deployed from `main` on Vercel.

**There are no other users, no usage data, no testimonials and no benchmarks.** Future work must not invent any, and must not put a fabricated figure on a screen the author will read as real.

## Product Principles

1. **Answer "am I on track" before anything else.** Every surface earns its place by serving that question or getting out of its way.
2. **A five-second open has to be enough.** The most common session is one-handed, on a phone, and over before a spinner would finish.
3. **Information that does not lead to an action is not finished.** The weekly review is the standing example of this failing.
4. **Never ask for a decision earlier than it is needed.** Filing, categorising and configuring come after the thing they describe, not before it. This extends to dates: the product does not ask the user to schedule work whose schedule is not his to set.
5. **Progress is expressed as distance, not as a percentage.** "About three activities from the next waypoint" is actionable in a way that "66%" is not, because it names the thing the user would actually do next.
6. **One user today; don't make it expensive to be wrong about that.**

## Accessibility & Inclusion

No externally imposed standard, but these are treated as binding by the existing implementation and should stay so: visible keyboard focus, `prefers-reduced-motion` respected, 44×44px minimum touch targets, nothing rendered below 11px, and contrast measured before a colour ships as text.
