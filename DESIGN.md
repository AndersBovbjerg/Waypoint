---
name: Waypoint
description: A personal goal planner where projects are courses, waypoints are the checkpoints, and the calendar is the log.
colors:
  surface: "#E6EAEE"
  raised: "#FFFFFF"
  sunken: "#EEF2F5"
  ink: "#0F1419"
  muted: "#465563"
  line: "#DDE4EA"
  rim: "#B7C3CD"
  edge: "#71808C"
  signal: "#0A84FF"
  signal-text: "#0A66D6"
  signal-soft: "#E3ECF6"
  on-signal: "#0F1419"
  tick: "#FFFFFF"
  drift: "#8C6103"
  drift-soft: "#FFEED4"
  hazard: "#C8182A"
  hazard-soft: "#FEE9EA"
  on-hazard: "#FFFFFF"
  night-surface: "#000000"
  night-raised: "#17181C"
  night-sunken: "#0B0C0E"
  night-ink: "#E7E9EA"
  night-muted: "#8B98A5"
  night-line: "#2F3336"
  night-rim: "#3A4046"
  night-edge: "#5F6D7A"
  night-signal: "#1C9CF0"
  night-signal-soft: "#061622"
  night-tick: "#000000"
  night-drift: "#F9B434"
  night-hazard: "#FF5C67"
typography:
  display:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.03em"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.025em"
    fontFeature: "tabular-nums"
  value:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tabular-nums"
  title:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.02em"
    fontFeature: "tabular-nums"
  eyebrow:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.1em"
  micro:
    fontFamily: "Work Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  full: "999px"
spacing:
  sp-1: "2px"
  sp-2: "4px"
  sp-3: "8px"
  sp-4: "12px"
  sp-5: "16px"
  sp-6: "24px"
  sp-7: "32px"
  sp-8: "48px"
  sp-9: "64px"
components:
  button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "12px 16px"
    height: "44px"
  button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "12px 16px"
    height: "44px"
  button-solid-hover:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
  button-accent:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.full}"
  button-danger:
    backgroundColor: "{colors.hazard}"
    textColor: "{colors.on-hazard}"
    rounded: "{rounded.full}"
  button-disabled:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.muted}"
  input:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px"
    height: "44px"
  card:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  tag:
    backgroundColor: "transparent"
    rounded: "{rounded.full}"
    padding: "4px 8px"
    typography: "{typography.label}"
  disclosure:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    height: "44px"
    typography: "{typography.label}"
---

# Design System: Waypoint

## Overview

Waypoint is a single-person goal planner, and its own vocabulary gives the model away: projects are *courses*, checkpoints are *waypoints*, you *plot* the week ahead and the calendar is the *log* of where you actually went. Use that vocabulary in UI copy; it is the most distinctive thing the product has.

**This document deliberately has no governing metaphor.** The previous version had one — paper, brass and ink — and that is the part that rotted. Hex values drift loudly: a colour is either the one in the stylesheet or it is not. A metaphor drifts quietly, staying readable and persuasive while describing an application that no longer exists, which is how this file spent months instructing people to build the wrong thing. What survived nine months of change were the rules about *behaviour* — the token discipline, the touch-target floor, the anti-references. Those are below. If you are tempted to add a north star, don't; add a rule instead.

The density is deliberately low for a productivity tool. This is one person's app, opened many times a day, usually one-handed on a phone at arm's length, often for five seconds. That scene sets the rules, not a feature list: a 16px body floor, 44px targets, primary navigation under the thumb, and no screen that needs two hands to finish a thought.

**Two anti-references are confirmed and binding, because the app shipped both and they were rejected.**

1. **The single-hue tint.** An earlier palette put all fourteen tokens inside a 2.8° hue spread, so the app had no true neutral and read as a theme applied over a design rather than a designed palette.
2. **The saturated default face.** Fraunces, Karla, Inter and Roboto were each considered and rejected — not for being ugly, but for being so widely used they had stopped meaning anything. In both cases the fault was indistinguishability. Waypoint would rather be quiet than generic.

**Key Characteristics:**
- A cool slate neutral stage with exactly one chromatic accent, a blue that also glows in from two corners of the canvas
- Content carries colour; chrome never does
- Surfaces are objects: a 1px rule first, shadow only to seat them
- One typeface across the whole app; contrast comes from weight and size, never a second family
- Tabular numerals everywhere, because every number sits in a column read downward
- Instant theme switching; motion only ever answers an action

## Colors

A cool slate stage, one chromatic accent, and two semantic colours that exist only to say whether something went the right way. Light and dark are separate palettes, not one palette dimmed: light is a pale grey page with white cards and a white header, dark is near-black with slightly lifted cards, and both carry the same blue glow in the top-right and bottom-left corners.

### Primary
- **Signal** (`#0A84FF` light / `#1C9CF0` dark): the one chromatic voice. It marks where you are and what you are touching — the focused field, the active tab, the add-activity row, a reached waypoint, the running timer — and, as the one sanctioned large area, it is the glow in two corners of the canvas (see The Backdrop Rule). Otherwise it never fills a large area. `--signal-text` (`#0A66D6`) is the same voice at text weight in light mode, where the fill value holds only 3.65:1 on white; in dark the two are the same value because the blue clears 6:1 against the cards. A signal fill carries `--on-signal`, dark ink, in both themes: white on this blue is 3.7:1 in light and 2.9:1 in dark.

### Secondary
- **Drift** (`#8C6103` / `#F9B434`): behind pace. Amber rather than red on purpose — being behind is a call for attention, not a failure. Always paired with a word, never colour alone.
- **Hazard** (`#C8182A` / `#FF5C67`): destruction and failure only — the danger button, a failed write, an invalid field. Never decorative, never a highlight.

### Tertiary
- **The twelve course colours** (`components/helpers.ts`, one light set and one dark): purple, teal, ochre, blue, rose, green, cyan, olive, terracotta, indigo, brown, gold. Evenly spread, assigned per course. Dark is a set of pastels; light keeps each dark hue and pushes the saturation up at a lightness that still holds 3:1 on a white card, so a course is as vivid by day as at night. These are **content**, not system colour.

### Neutral
- **Surface** (`#E6EAEE` / `#000000`): the canvas behind everything. In light it is a step deeper than the cards (1.2:1 to a white card; it was 1.07:1 and the boxes floated into the page); in dark the *card* is lifted instead, to 1.2:1.
- **Raised** (`#FFFFFF` / `#17181C`): every card and lifted surface, and in light the header too.
- **Sunken** (`#EEF2F5` / `#0B0C0E`): inputs, calendar cells, day pills — anything pressed into the page.
- **Ink** (`#0F1419` / `#E7E9EA`): body text, and the fill of solid buttons and checked controls.
- **Muted** (`#465563` / `#8B98A5`): metadata, placeholders, secondary labels. Measured 6.3:1 on the canvas and 7.7:1 on a card in light; 7.1:1 on the canvas and 6.0:1 on a card in dark. Quiet without being weak.
- **Line** (`#DDE4EA` / `#2F3336`): dividers inside a surface. A hairline, roughly 1.2–1.3:1 — it separates, it does not delineate.
- **Rim** (`#B7C3CD` / `#3A4046`): the outline of a card. One step firmer than `--line`, because a card's own edge has to hold it apart from the page while the rules inside it should stay quiet.
- **Edge** (`#71808C` / `#5F6D7A`): every boundary that has to be *seen* rather than merely felt — field borders, unreached route nodes, the legs of a route not yet walked. Measures 3.3–4.1:1 against the card and sunken surfaces.
- **Tick** (`#FFFFFF` / `#000000`): the check drawn on a filled course-colour swatch, and the one neutral that must flip. Light course colours hold at least 3.1:1 against white; the dark pastels take black.

### Named Rules

**The One Voice Rule.** Apart from the canvas glow, the accent occupies under 10% of any screen. It is where you are now and what you are touching — nothing else. If the signal is helping something look nice, remove it.

**The Course Colour Rule.** The twelve-colour palette belongs to content and only content: which course a task belongs to, which line is which on a chart. Chrome stays neutral so those twelve can be told apart. The chrome was purple once and it swallowed the purple course whole.

**The Cool Slate Rule.** Every neutral leans the same way, a cool blue-grey, so the blue accent belongs to the page rather than sitting on it. A warm or green-tinted grey will read as a foreign element pasted onto the stage.

**The Backdrop Rule.** Behind the cards there are exactly two layers, both static and both fixed to the viewport: the accent-blue glow in the top-right and bottom-left corners (`--glow`, full strength in the corner and gone by 70% across; in light it is a deeper, more saturated blue than the dark theme's, because the same value washes out on a pale page), and depth contours drawn as a mask over a token colour (`public/chart-contours.svg`). They show only in the gutters and between cards, they never move, and nothing else goes back there. The glow lives on a `::before` pseudo-element rather than `background-attachment: fixed`, which iOS ignores.

**The Semantic Colour Rule.** Drift and hazard mean outcome, never emphasis. A number is not amber because it is important; it is amber because it is behind.

**The Content-Colour-As-Text Rule.** The twelve course colours were drawn for dots, rings and chart strokes, where 3:1 is the bar. Three of them fail AA as 12px text in light mode. Where a course colour must become text, mix it toward `--ink` — `color-mix(in oklab, var(--course) 85%, var(--ink))`, which darkens in light and lightens in dark from one declaration. 85% is measured: it clears 4.5:1 with margin (5.30 light, 7.67 dark) without flattening the hue that tells twelve courses apart.

## Typography

**Typeface:** Work Sans (with `system-ui, sans-serif`), one variable file from 100 to 900, self-hosted at build by `next/font/google`. There is no second family and no display face; `--display` and `--body` both resolve to it.

**Character:** an early-grotesque descendant drawn by Wei Huang specifically for on-screen text in the 14–48px band, which is the band this app lives in. Its lineage is signage, timetables and ledgers — which is the product's own subject matter — and it carries real tabular figures, verified rather than assumed. Its weight axis starts at 100, which is what makes the system's weight contrast possible at all.

### Hierarchy
- **Display** (800, 52px `--fs-7`, 1.03, -0.03em): at most once per screen, and only above 769px. Today's greeting; the running timer.
- **Headline** (800, 36px `--fs-6`, 1.03, -0.025em): page-level numbers, section headings, and the display/timer roles below 769px.
- **Value** (800, 26px `--fs-5`, 1, -0.03em): KPI readings, the current goal number, door headings. A figure set loose reads as separate digits rather than one value, so these take the tightest tracking in the system.
- **Title** (600, 20px `--fs-4`, 1.3, -0.01em): every card title, course name, modal heading, wordmark (800). The most-used size by a wide margin.
- **Body** (400, 16px `--fs-3`, 1.65): row titles and prose. Prose capped at 56ch.
- **Secondary** (400/700, 14px `--fs-2`): supporting sentences, button labels.
- **Label** (700, 12px `--fs-1`, +0.02em): counts, dates, units, deltas. Tabular.
- **Eyebrow** (700, 12px `--fs-1`, +0.1em, uppercase): field labels inside a form or brief. The only tracked uppercase in the system.
- **Micro** (600, 11px `--fs-0`): two roles only — bottom tab bar labels and chart axis ticks.

### Named Rules

**The Tabular Rule.** `font-variant-numeric: tabular-nums` is set on the root and never turned off. Every number here sits in a column read downward; proportional digits make those columns twitch as values change. A replacement face must be checked for real `tnum` support before it is adopted — two otherwise good candidates were rejected on this alone.

**The 11px Floor Rule.** Nothing renders below 11px, and 11px is reserved for the tab bar and chart ticks. The app once drew 9px and 10px text in `--muted`; at phone reading distance that is decoration, not information.

**The One Hero Rule.** `--fs-7` appears at most once per screen, and only where the width exists to hold it on one line. If two things are hero-sized, neither is.

**The Weight Contrast Rule.** Hierarchy comes from the gap between 400 and 800, not from size alone. The system once drew 22 of ~30 weighted declarations at 700 and never used 800, which is why it read as flat regardless of the scale.

**The Re-Measure Rule.** Any value tuned to a specific face — a field's `min-width` sized to its longest placeholder, a tracking value, a line-height — carries a comment saying so and is re-measured when the face changes. Changing the typeface silently clipped a placeholder by 18px the one time this was skipped.

## Layout

A single centred column: `.wp-main` is capped at 1000px with `--sp-7` top padding, `--sp-5` side gutters, and a bottom padding that adds `env(safe-area-inset-bottom)` so the last card clears the tab bar on a notched phone. `body` carries `margin: 0`; the browser default left every surface 8px in from an edge the fixed tab bar ignored.

Cards stack in a `.wp-stack` flex column with a `--sp-6` (24px) gap, the app's primary rhythm.

Multi-column areas use `auto-fit` + `minmax` rather than fixed column counts, so they collapse by available width instead of by breakpoint: two-up card grids at `minmax(300px, 1fr)`, KPI tiles at `minmax(170px, 1fr)`. The calendar is the one fixed grid — `repeat(7, minmax(0, 1fr))` — because a week has seven days at every width.

**Breakpoints** (four, plus a motion query):
- **900px and up**: the door shows its second pane. Below this it is the form alone.
- **769px and up**: navigation is a top tab row, the bottom tab bar hides, and `--fs-7` becomes available.
- **768px and down**: navigation moves to the fixed bottom tab bar; KPI tiles go to two columns.
- **560px and down**: card padding drops to `--sp-5`; a row's course tag becomes a sub-line instead of a pill.
- **420px and down**: the step rail keeps only the current step's word.
- `prefers-reduced-motion: reduce` disables every transition and animation.

**The device story.** Two real surfaces: an iPhone with the app installed to the home screen (375–430px, standalone, safe-area insets live, held one-handed at roughly 30–35cm) and a Mac browser. There is no tablet story and no anonymous-visitor story. Design for the thumb first and let the desktop inherit — but verify on the desktop, because that is where the maintainer actually looks.

### Named Rules

**The Token Rule.** Every spacing, size and radius value is a token. The literal exceptions in the stylesheet are individually documented in place; a new undocumented literal is a bug, not a choice.

**The Thumb Rule.** Every interactive element is at least 44×44px. The two permitted exceptions — calendar day cells and the colour-swatch grid — expand their hit area with an absolutely positioned `::before` rather than growing visually.

**The Auto-Fit Rule.** Multi-column layouts collapse by available width, not by breakpoint. Add a breakpoint only when something other than column count must change.

## Elevation & Depth

Hybrid, and deliberately border-led. A surface is defined first by a 1px `--rim` border and only then seated by a shadow. The system once relied on shadow alone with a card-to-canvas contrast of 1.08:1, which meant cards were not objects — they were slightly different rectangles of the same colour. The border does the structural work; the shadow only says how far off the page a thing sits.

### Shadow Vocabulary
- **Seated** (`0 1px 2px rgba(15,20,25,.07), 0 4px 14px rgba(15,40,70,.10)`; dark `0 1px 2px rgba(0,0,0,.6), 0 4px 16px rgba(0,0,0,.55)`): things that rest *on* the page. Two layers — a tight contact shadow that seats the card and a wider ambient one. A single blur reads as a glow rather than an object.
- **Floating** (`0 10px 32px rgba(15,20,25,.14)`; dark `0 14px 40px rgba(0,0,0,.7)`): things that hover *over* the page and will be dismissed — the overflow menu, the select listbox, the door's card.
- **Scrim** (`rgba(15,20,25,.55)`; dark `rgba(0,0,0,.7)`): the modal backdrop.
- **Focus ring** (`0 0 0 3px rgba(29,161,242,.30)`; dark `rgba(29,161,242,.35)`): fields only, drawn as a ring rather than a second border so nothing reflows on focus.

### Named Rules

**The Edge Before Shadow Rule.** If a surface needs to read as an object, give it a border. Shadow is never the primary means of separation — it fails in dark mode, at low brightness, and under reduced-contrast settings.

**The Two Elevations Rule.** There are exactly two: seated and floating. There is no third, and a new `box-shadow` literal anywhere in the stylesheet is drift.

## Shapes

Five radii: **`--r-sm` 8px** for small recessed controls (day pills, chart focus rings), **`--r-md` 14px** for fields and anything that reads as pressed in, **`--r-lg` 20px** for cards and modals, **`--r-xl` 28px** where a surface needs to read as notably softer, and **`--r-full`** for anything you press or scan as a discrete token.

The form language: **surfaces are gently rounded rectangles; controls are pills; status dots are circles.** A pill promises that something is pressable or is a discrete chunk of information — do not put `--r-full` on a static container.

Borders are 1px. `--line` for structure, `--edge` for a boundary that must be seen, a semantic colour where one takes over (`--hazard` on an invalid field, `--focus` on focus, the course colour on a tag).

**The one documented radius exception** is the 3px course bar down the left edge of a project card, whose `border-radius: 3px` is matched to its own 3px width rather than drawn from the scale. It is deliberately not added to `rounded`: a radius that exists to round one 3px element is not a reusable step, and promoting it would turn a local exception into a system abstraction.

## Components

Character across the board: **quiet and precise.** Surfaces are flat at rest. Colour, motion and weight are responses to an action, never decoration.

### Buttons
- **Shape:** full pill (`--r-full`), 12px 16px padding, 44px minimum height, 14px/700 label, 8px gap to a leading icon.
- **Default:** `--raised` fill, 1px `--edge` border, ink label. On hover it inverts to an ink fill.
- **Solid (primary):** ink fill, surface label; hover goes `--signal`. At most one solid button in any view.
- **Accent / Danger:** `--signal` with `--on-signal`; `--hazard` with `--on-hazard`. Danger is for irreversible actions only.
- **Disabled:** `--sunken` fill, `--muted` label, `--line` border, `cursor: not-allowed` — **not** opacity. At `opacity:.35` a disabled primary label computed to 1.93:1, so the first thing on the sign-in screen looked broken rather than inactive.
- **Loading:** the label stays and a 14px `--spin` ring is added beside it. Swapping the label changes the button's width mid-press and moves what is under the cursor.

### Cards / Containers
- **Corner** `--r-lg`; **background** `--raised`; **border** 1px `--line` in both themes; **shadow** the seated value; **padding** `--sp-6`, dropping to `--sp-5` at 560px.
- **Head:** a flex row pairing a 20px/600 title with a right-aligned 12px count. Every card containing a countable list shows `n/m`.

### Inputs / Fields
- `--sunken` background, 1px `--edge` border, `--r-md`, 12px padding, 44px minimum height, 220px minimum width (sized to the longest placeholder the app uses, re-measured per the Re-Measure Rule).
- **Hover:** border to `--muted`. **Focus:** border to `--focus` plus the 3px ring, drawn on the field so pointer and keyboard focus look the same. **Error:** border and ring to `--hazard`, `aria-invalid` set, paired with a `role="alert"` message. **Disabled:** `--muted` text on `--surface`, full opacity.

### Chips / Tags
- Transparent fill, 1px border in the course's own colour, text in that colour mixed 85% toward `--ink`, pill radius, 12px/700, capped at 150px with ellipsis.
- At 560px and below the pill is replaced by a sub-line trailing the row title (`title · course`), so the course keeps its name while truncation eats it before the title.

### Navigation
- **Desktop (769px+):** a text tab row in the header; active takes `--signal-text` with a `--signal` underline, inactive `--muted`.
- **Mobile (≤768px):** a fixed bottom bar, five tabs, 19px icon over an 11px label, 56px tall plus `env(safe-area-inset-bottom)`. Active is `--signal-text` with the icon drawn in the brighter `--signal` at a heavier stroke, and carries `aria-current="page"`.
- **Header:** sticky, `--head` (white in light, the canvas in dark), 1px `--head-line` bottom border (`--rim` in light, `--line` in dark), holding the wordmark and up to three 44px icon buttons. `position: sticky` here is load-bearing and fragile: any `overflow` value other than `visible` on `body` makes body a scroll container that never scrolls, and the header silently stops sticking.

### The disclosure row (signature)
A full-width 44px row with a 1px **dashed** `--signal` border, a faint signal tint, a `--signal-text` 14px/700 label and a heavier signal-blue plus, used wherever a control should be present but not occupy the screen until asked for — the Today screen's add-activity row, the course modal's detail sections. Tapping it replaces the row with the real controls in place and focuses the first field. It is the system's answer to "this needs to exist but not interrupt" — it reads as the next thing to do without taking a whole modal to say so: no floating buttons, no modals for tasks that need neither interruption nor protected focus.

### The mark (signature)
One filled node and one open node, with one node-width of space between them. The filled node is where you are; the open node is the next waypoint; the gap is the distance still to cover, which is the product's own sentence rather than a percentage. It is the route component reduced to two nodes — the identity and the interface are made of the same parts, and the previous mark (a ring with the dot in its centre, i.e. arrived) is its ancestor.

Built on one unit **u**, the filled node's diameter: gap 1u, open node 2u, whole mark 4u, with the open node's void 8/512 wider than the filled node so the eye completes the movement. The app icon is the mark in white on a blue gradient running deep at bottom-left to bright at top-right, echoing the canvas glow; a blue-on-dark tile gave the icon no silhouette on a home screen. PNG icons are square and opaque — iOS and Android apply their own mask, and pre-rounded corners come back filled with black. Below ~24px the ring takes a heavier stroke (a quarter of its diameter rather than 23%) so the void does not silt up; that is the `.wp-logo` case in the header and the favicon case in `app/icon.svg`.

### The route (signature)
`MiniRoute` and the door's route mark draw a course as nodes on a line — a filled node per reached waypoint, an `--edge` ring per pending one, connected by legs in the same two colours, with a dashed straight line between start and finish standing for the ideal no real route follows. It is the one component that expresses the product's metaphor as geometry rather than vocabulary. **When adding a progress display, reach for the route before reaching for a bar.**

## Do's and Don'ts

### Do:
- **Do** draw every spacing, size and radius from a token: `--sp-1`…`--sp-9`, `--fs-0`…`--fs-8`, the five radii.
- **Do** give any new surface a 1px `--line` border before you consider a shadow.
- **Do** keep the accent under 10% of a screen (the canvas glow aside), and use drift/hazard for outcome rather than emphasis.
- **Do** let the twelve course colours be the only strong colour on a screen.
- **Do** hold a 44×44px minimum hit area, expanding with a positioned `::before` rather than growing the visual element.
- **Do** measure contrast before shipping a colour as text, especially a content colour.
- **Do** write empty states and errors in the product's own voice — name the actual next activity, name the missing variable, say "A quiet week is still a week."
- **Do** give every field all five states: rest, hover, focus, error, disabled.
- **Do** cap prose at 56ch and keep body text at 16px.

### Don't:
- **Don't** add a governing metaphor to this document. Add a rule instead.
- **Don't** introduce a second typeface. Contrast comes from the 400–800 weight gap.
- **Don't** adopt a typeface without verifying real `tnum` support.
- **Don't** introduce a cool or achromatic grey.
- **Don't** animate the theme switch. Fading surfaces while text colour flips instantly produced a ~250ms window where text sat at roughly 1:1 against its own card.
- **Don't** animate `width`, `height`, `padding` or `margin` on anything larger than a progress fill.
- **Don't** use opacity to express a disabled state.
- **Don't** render text below 11px, and don't use 11px outside the tab bar and chart ticks.
- **Don't** put `--r-full` on a static container.
- **Don't** add a breakpoint when `auto-fit` + `minmax` would collapse the layout by width instead.
- **Don't** reach for a floating action button or a modal for an ordinary create action; the disclosure row is the system's answer.
- **Don't** let a destructive action share a colour with a positive one. That shipped once: a single purple served as focus ring, error border, destructive fill, "good delta" and "ahead of pace" simultaneously.
