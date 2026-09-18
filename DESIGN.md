---
name: Waypoint
description: A personal goal planner where projects are courses, waypoints are the checkpoints, and the calendar is the log.
colors:
  chart-paper: "#F6F4F0"
  log-page: "#FFFEFC"
  recessed-field: "#F1EEE8"
  ink: "#1C1A17"
  pencil: "#6A655C"
  rule-line: "#DCD7CB"
  brass: "#8C5E2A"
  cleared-green: "#CDD9BE"
  surveyed-green: "#3F6B4A"
  correction-red: "#9A3B2E"
  tick-white: "#FFFFFF"
  night-paper: "#131210"
  night-page: "#1C1A17"
  night-field: "#100F0D"
  night-ink: "#F2EFE9"
  night-pencil: "#9A948A"
  night-rule: "#3B372F"
  night-brass: "#D4A055"
  night-cleared: "#2D3725"
  night-surveyed: "#7FB08A"
  night-correction: "#E0806F"
typography:
  display:
    fontFamily: "Gambetta, Georgia, serif"
    fontSize: "46px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Gambetta, Georgia, serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Gambetta, Georgia, serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Switzer, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Switzer, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.02em"
    fontFeature: "tabular-nums"
  eyebrow:
    fontFamily: "Switzer, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "12px"
  pill: "999px"
spacing:
  sp-0: "2px"
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "24px"
  sp-6: "32px"
  sp-7: "48px"
components:
  button:
    backgroundColor: "{colors.log-page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 16px"
    height: "44px"
  button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chart-paper}"
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chart-paper}"
    rounded: "{rounded.pill}"
    padding: "12px 16px"
    height: "44px"
  button-solid-hover:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.tick-white}"
  button-danger:
    backgroundColor: "{colors.correction-red}"
    textColor: "{colors.tick-white}"
    rounded: "{rounded.pill}"
  button-disabled:
    backgroundColor: "{colors.recessed-field}"
    textColor: "{colors.pencil}"
  input:
    backgroundColor: "{colors.recessed-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 12px"
    height: "44px"
  input-focus:
    backgroundColor: "{colors.recessed-field}"
    textColor: "{colors.ink}"
  input-error:
    backgroundColor: "{colors.recessed-field}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.log-page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px"
  tag:
    backgroundColor: "transparent"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
    typography: "{typography.label}"
---

# Design System: Waypoint

## Overview

**Creative North Star: "The Ship's Log"**

Waypoint is a book you keep, not a dashboard you check. Its own vocabulary gives the system away — projects are *courses*, checkpoints are *waypoints*, you *plot* the week ahead and the calendar is the *log* of where you actually went. The visual world takes that literally: warm paper, ink, a ruled line, and one brass instrument that marks where you are now. Nothing glows. Nothing is chrome-plated. It should feel like a thing that has been carried around.

The density is deliberately low for a productivity tool. This is a single-person app opened many times a day, usually one-handed on a phone at arm's length, often for five seconds. That scene, not a feature list, sets the rules: a 16px body floor, 44px targets, the primary navigation under the thumb, and no screen that requires two hands to finish a thought. Where a denser app would pack more in, Waypoint leaves the space and trusts the page.

Two anti-references are confirmed and binding, because the app shipped both and they were rejected. The first is the **single-hue tint**: an earlier palette put all fourteen tokens inside a 2.8° hue spread, so the app had no true neutral and read as a theme applied over a design rather than a designed palette. The second is the **saturated default face** — good typefaces (Fraunces, Karla) used so widely they had stopped meaning anything. In both cases the fault was not ugliness, it was indistinguishability. Waypoint would rather be quiet than generic.

**Key Characteristics:**
- Warm near-neutral stage (hue ~85°, chroma under 0.016) with exactly one chromatic accent
- Content carries colour; chrome never does
- Surfaces are objects: a 1px rule first, shadow only to seat them
- An old-style serif for naming things, a neutral grotesque for reading them
- Tabular numerals everywhere, because every number sits in a column read downward
- Instant theme switching; motion only ever answers an action

## Colors

A warm paper stage with a single brass accent, plus two semantic colours that exist only to say whether something went the right way.

### Primary
- **Brass** (`#8C5E2A` light / `#D4A055` dark): the one chromatic voice. It marks focus rings, the current goal reading, the effort line, and the "your review is ready" prompt. It is an instrument needle, not a brand splash. It never fills a large area.

### Secondary
- **Surveyed Green** (`#3F6B4A` / `#7FB08A`): a reading moved the right way; a pace that is ahead. Semantic only.
- **Correction Red** (`#9A3B2E` / `#E0806F`): destruction and failure — the danger button, the failure banner, an invalid field. Never decorative, never a highlight.

### Tertiary
- **Cleared Green** (`#CDD9BE` / `#2D3725`): fills a calendar day on which everything was cleared. The single most rewarding state in the app and therefore the one that must actually be visible — it carries 1.27:1 (light) and 1.54:1 (dark) against a normal cell, where it previously carried 1.11:1 and was effectively invisible.
- **The twelve course colours** (`components/helpers.ts`, one light and one dark set): purple, teal, ochre, blue, rose, green, cyan, olive, terracotta, indigo, brown, gold. Muted, evenly spread, and assigned per course. These are **content**, not system colour.

### Neutral
- **Chart Paper** (`#F6F4F0` / `#131210`): the canvas behind everything. Warm, barely chromatic.
- **Log Page** (`#FFFEFC` / `#1C1A17`): every card and raised surface.
- **Recessed Field** (`#F1EEE8` / `#100F0D`): inputs, calendar cells, day pills — anything that reads as pressed into the page.
- **Ink** (`#1C1A17` / `#F2EFE9`): body text, and the fill of solid buttons and checked controls.
- **Pencil** (`#6A655C` / `#9A948A`): metadata, placeholders, secondary labels. 5.0:1 on paper, so it is quiet without being weak.
- **Rule Line** (`#DCD7CB` / `#3B372F`): every border and divider.

### Named Rules

**The One Brass Rule.** The accent occupies under 10% of any screen. It is where you are now and what you are touching — nothing else. If brass is helping something look nice, remove it.

**The Course Colour Rule.** The twelve-colour palette belongs to content and only content: which course a task belongs to, which line is which on a chart. Chrome stays neutral so those twelve can actually be told apart. The chrome was purple once and it swallowed the purple course whole.

**The No-Grey Rule.** There are no pure greys. Every neutral carries a trace of the paper's warmth (hue ~85°, chroma ≤0.016). Never introduce a cool or achromatic grey; it will read as a foreign element pasted onto the page.

**The Semantic Colour Rule.** Green and red mean outcome, never emphasis. A number is not green because it is important; it is green because it moved the right way.

## Typography

**Display Font:** Gambetta (with Georgia, serif)
**Body Font:** Switzer (with system-ui, sans-serif)

Both are from Fontshare / Indian Type Foundry, self-hosted from `app/fonts` via `next/font/local`. Neither is on Google Fonts. ITF's Free Font License permits and recommends self-hosting and treats subsetting as a derivative work, so the shipped files are official and untouched.

**Character:** Gambetta is an old-style text serif with an angled stress and real calligraphic warmth — chosen specifically because it holds its character at 20px, which is where this app's display face actually lives (every card title), rather than only at poster sizes. The high-contrast display serifs go spindly there. Switzer is a neutral grotesque that gets out of the way and has the even, unfussy digits this app leans on constantly.

### Hierarchy
- **Display** (Gambetta 700, 46px `--fs-7`, 1.05): one per screen at most. Today's greeting, the running timer.
- **Headline** (Gambetta 700, 34px `--fs-6`, 1.05): page-level numbers.
- **Section value** (Gambetta 700, 26px `--fs-5`, 1.1): the current goal reading, KPI values.
- **Title** (Gambetta 500, 20px `--fs-4`, 1.3): every card title, course name, modal heading. The most-used display size by a wide margin.
- **Body** (Switzer 400, 16px `--fs-3`, 1.65): row titles, prose. Prose is capped at 56ch (`.wp-note`).
- **Secondary** (Switzer 400/500, 14px `--fs-2`, 1.65): supporting sentences, button labels.
- **Label** (Switzer 700, 12px `--fs-1`, +0.02em): counts, dates, units, deltas. Tabular.
- **Eyebrow** (Switzer 700, 12px `--fs-1`, +0.1em, uppercase): field labels inside a form or brief.
- **Micro** (Switzer 700, 11px `--fs-0`): the two densest roles only — bottom tab bar labels and chart axis ticks. Nothing else may use it.

### Named Rules

**The Tabular Rule.** `font-variant-numeric: tabular-nums` is set on the root and is never turned off. Every number in this app sits in a column that is read downward — counts, times, deltas, percentages — and proportional digits make those columns twitch as values change.

**The 11px Floor Rule.** Nothing renders below 11px, and 11px is reserved for the tab bar and chart ticks. The app previously drew 9px and 10px text in `--muted`; at phone reading distance that is decoration, not information.

**The One Hero Rule.** `--fs-7` appears at most once per screen. If two things are hero-sized, neither is.

## Layout

The app is a single centred column: `.wp-main` is capped at **1000px** with `--sp-6` top padding and `--sp-4` side gutters, and a bottom padding that adds `env(safe-area-inset-bottom)` so the last card clears the tab bar on a notched phone. Cards stack in a `.wp-stack` flex column with a `--sp-5` (24px) gap, which is the app's primary rhythm.

Multi-column areas all use `auto-fit` + `minmax` rather than fixed column counts, so they collapse by available width instead of by breakpoint: two-up card grids at `minmax(300px, 1fr)`, the project brief at `minmax(200px, 1fr)`, KPI tiles at `minmax(170px, 1fr)`. The calendar is the one fixed grid — `repeat(7, minmax(0, 1fr))` — because a week has seven days at every width.

**Breakpoints** (three, all max-width except the nav swap):
- **769px and up**: navigation is a top tab row; the bottom tab bar is hidden.
- **768px and down**: navigation moves to the fixed bottom tab bar; KPI tiles go to two columns.
- **560px and down**: card padding drops from `--sp-5` to `--sp-4`; `.wp-tag` (the course name on an activity row) is hidden.

**Spacing scale** — eight steps, and every spacing value in the stylesheet draws from one: `--sp-0` 2px (hairline gaps between dots and paired icons), `--sp-1` 4px, `--sp-2` 8px, `--sp-3` 12px, `--sp-4` 16px, `--sp-5` 24px, `--sp-6` 32px, `--sp-7` 48px.

**The device story.** This is a single-user app with two real surfaces: an iPhone with the app installed to the home screen (375–430px, standalone, safe-area insets live, held one-handed at roughly 30–35cm) and a Mac browser. There is no tablet story and no anonymous-visitor story. Design for the thumb first and let the desktop inherit.

### Named Rules

**The Token Rule.** Every spacing, size, and radius value is a token. There are exactly three literal exceptions in the entire stylesheet and each is documented in place: the 3px course bar and its matching 3px radius, and the `-1px` of the screen-reader clipping idiom. A new literal is a bug, not a choice.

**The Thumb Rule.** Every interactive element is at least 44×44px. Two exceptions are permitted and both are documented with their arithmetic: calendar day cells (seven columns cannot fit 44px in 375px) and the colour-swatch grid. Both expand their hit area with an absolutely positioned `::before` instead of growing visually.

**The Auto-Fit Rule.** Multi-column layouts collapse by available width (`auto-fit` + `minmax`), not by breakpoint. Add a breakpoint only when something other than column count must change.

## Elevation & Depth

Hybrid, and deliberately border-led. A surface is defined first by a **1px `--rule` border**, and only then seated by a shadow. The system previously relied on shadow alone with a `panel`-on-`paper` contrast of 1.08:1, which meant cards were not objects at all — they were slightly different rectangles of the same colour. The border does the structural work; the shadow only says how far off the page a thing sits.

### Shadow Vocabulary
- **Seated** (`--shadow`: `0 1px 2px rgba(28,26,23,.05), 0 4px 16px rgba(28,26,23,.05)`; dark `0 1px 2px rgba(0,0,0,.4), 0 4px 16px rgba(0,0,0,.3)`): things that rest *on* the page — cards, KPI tiles, the failure banner. Two layers: a tight contact shadow and a wider ambient one.
- **Floating** (`--shadow-float`: `0 8px 24px rgba(28,26,23,.16)`; dark `0 8px 24px rgba(0,0,0,.5)`): things that hover *over* the page and will be dismissed — the kebab menu and the select listbox. A menu needs more lift than a card; pretending otherwise is how a system starts leaking one-off shadows.
- **Scrim** (`--scrim`: `rgba(28,26,23,.5)`; dark `rgba(0,0,0,.6)`): the modal backdrop.
- **Focus ring** (`box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 18%, transparent)`): fields only, drawn as a ring rather than a second border so nothing reflows on focus.

### Named Rules

**The Edge Before Shadow Rule.** If a surface needs to read as an object, give it a border. Shadow is never the primary means of separation — it fails in dark mode, at low brightness, and for anyone with reduced contrast settings.

**The Two Elevations Rule.** There are exactly two: seated and floating. Seated is for anything that rests on the page; floating is for anything that will be dismissed. There is no third, and a new `box-shadow` literal anywhere in the stylesheet is drift — that is precisely how five hardcoded shadows tinted with a retired purple survived a full palette replacement.

## Shapes

Three radii and no others: **`--r-sm` 8px** for small recessed controls (day pills, chart focus rings), **`--r-md` 12px** for everything that is a surface or a field (cards, inputs, modals, KPI tiles), and **`--r-pill` 999px** for anything that reads as a control you press or a token you scan — buttons, tags, icon buttons, progress tracks, the toggle dot.

The form language is: **surfaces are gently rounded rectangles; controls are pills; status dots are circles.** A pill is a promise that something is pressable or is a discrete chunk of information. Do not use `--r-pill` on a static container.

Borders are always 1px and always `--rule`, except where a semantic colour takes over (`--negative` on an invalid field or the failure banner, `--accent` on focus, the course colour on a tag).

## Components

Character across the board: **quiet and precise.** Surfaces are flat at rest. Colour, motion, and weight are responses to an action, never decoration at rest.

### Buttons
- **Shape:** fully rounded pill (`--r-pill`), `--sp-3 --sp-4` padding (12px 16px), 44px minimum height, 14px bold label, 6px gap to a leading icon.
- **Default:** page-coloured fill (`--panel`) with a 1px `--ink` border and ink label. On hover it inverts — ink fill, paper label.
- **Solid (primary):** ink fill, paper label. On hover it goes brass. There is at most one solid button in any view.
- **Danger:** `--negative` fill with white label (6.9:1). Used for irreversible actions only.
- **Disabled:** `--field` fill, `--pencil` label, `--rule` border, `cursor: not-allowed` — **not** opacity. At `opacity: .35` a disabled primary label computed to 1.93:1, so the first thing anyone saw on the sign-in screen was a button that looked broken rather than merely inactive. The explicit colours hold 5.0:1 light and 6.4:1 dark.
- **Toggle (`.is-on`):** takes the solid treatment, so "currently on" reads identically wherever it appears.
- **Focus:** 2px `--accent` outline at 2px offset, inherited from the root rule.

### Cards / Containers
- **Corner:** `--r-md` (12px).
- **Background:** `--panel`. **Border:** 1px `--rule`, in both themes.
- **Shadow:** the single seated-surface value.
- **Padding:** `--sp-5` (24px), dropping to `--sp-4` (16px) at 560px and below.
- **Head:** a flex row pairing a Gambetta 500/20px title with a right-aligned `--fs-1` count. Every card that contains a countable list shows `n/m`.

### Inputs / Fields
- **Style:** `--field` background, 1px `--rule` border, `--r-md`, 12px padding, 44px minimum height, 200px minimum width (sized to the longest placeholder the app uses so it never clips).
- **Hover:** border shifts to `--pencil`.
- **Focus:** border goes `--accent` plus a 3px brass ring at 18% alpha. Drawn on the field itself so pointer focus and keyboard focus look the same.
- **Error (`.is-error`):** border goes `--negative`, the ring turns red on focus, and `aria-invalid` is set. Paired with a `role="alert"` message.
- **Disabled:** `--pencil` text on `--paper`, `--rule` border, full opacity.

### Chips / Tags
- **Style:** transparent fill, 1px border and text both in the **course's own colour**, pill radius, `--sp-1 --sp-2` padding, 12px bold, capped at 150px with ellipsis.
- **Note:** hidden below 560px. On the primary device the course association then survives only as the coloured ring on the checkbox — a known weakness, documented rather than endorsed.

### Navigation
- **Desktop (769px+):** a text tab row in the header; active tab takes `--ink`, inactive `--muted`.
- **Mobile (≤768px):** a fixed bottom bar, 5 tabs, 19px icon over an 11px label, 56px tall plus `env(safe-area-inset-bottom)`. Active tab is `--ink` and carries `aria-current="page"`.
- **Header:** sticky, `--paper` background, 1px `--rule` bottom border, 69px tall. Holds the wordmark and up to three 44px icon buttons.

### The Route (signature)
`MiniRoute` draws a course as nodes on a line — a filled node per reached waypoint, an outlined node per pending one, connected by legs. It is the one component that expresses the product's own metaphor as geometry rather than as vocabulary, and it is currently under-used: the flat progress bar still holds the hero position on both the course card and the goal meter. **When adding a progress display, reach for the route before reaching for a bar.**

## Do's and Don'ts

### Do:
- **Do** draw every spacing, size, and radius from a token. The scale is `--sp-0`…`--sp-7`, `--fs-0`…`--fs-7`, `--r-sm`/`--r-md`/`--r-pill`.
- **Do** give any new surface a 1px `--rule` border before you consider a shadow.
- **Do** keep the accent under 10% of a screen, and use `--positive`/`--negative` for outcome rather than emphasis.
- **Do** let the twelve course colours be the only strong colour on a screen.
- **Do** hold a 44×44px minimum hit area, expanding with a positioned `::before` rather than growing the visual element.
- **Do** write empty states and errors in the product's own voice — name the actual next activity, name the missing variable, say "A quiet week is still a week."
- **Do** give every field all five states: rest, hover, focus, error, disabled.
- **Do** cap prose at 56ch and keep body text at 16px.

### Don't:
- **Don't** introduce a cool or achromatic grey. Every neutral carries the paper's warmth.
- **Don't** animate the theme switch. Fading surfaces while text colour flips instantly produced a ~250ms window where text sat at roughly 1:1 against its own card.
- **Don't** animate `width`, `height`, `padding`, or `margin` on anything larger than a progress fill; prefer `transform` and `opacity`.
- **Don't** use opacity to express a disabled state. Set explicit muted colours so the label stays readable.
- **Don't** render text below 11px, and don't use 11px outside the tab bar and chart ticks.
- **Don't** put a second family, a gradient, or a glow into the system. Emphasis comes from weight, size, and space.
- **Don't** use `--r-pill` on a static container; a pill promises a control or a token.
- **Don't** add a breakpoint when `auto-fit` + `minmax` would collapse the layout by width instead.
- **Don't** let a destructive action share a colour with a positive one. That mistake shipped once: a single purple served as focus ring, error border, destructive fill, "good delta", and "ahead of pace" simultaneously.
