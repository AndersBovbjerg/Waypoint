"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import type { Mode, Project } from "./types";
import { PALETTES, todayKey, uid } from "./helpers";
import { ICONS } from "./identity";
import { Door, DoorPanel, ROUTE_STEPS, Spinner, StepRail } from "./Door";
import { getSupabase } from "./supabase";
import * as db from "./db";

/* ------------------------------------------------------------------
   First run.

   An account with no courses in it has nothing to show and nothing to do,
   and the empty states can only say so much. Three questions, one per
   screen, and the app opens on something the person wrote themselves rather
   than on a set of invitations to start.

   Deliberately three and not more. Every extra field here is a field asked
   before there is any reason to trust the app with it — purpose, situation,
   approach and the goal numbers all already have a good home in the course
   modal, where they are asked for by someone who has decided to stay.
   ------------------------------------------------------------------ */

const STEPS = ["Name", "Course", "Waypoint"] as const;

/* The six that fit on one line at the door's measure. The full twelve are in
   the course modal; choosing from six at setup is a decision, choosing from
   twelve is a task. */
const VISIBLE_COLORS = 6;

/* Short enough to set on three lines at the panel's 20ch measure. The first
   one ran to a ragged three lines with two words stranded on the second. */
const QUOTES = [
  "The app opens with your name on it.",
  "Everything in Waypoint hangs off a course.",
  "A waypoint is proof you’re on the route.",
];

/* Nine buttons — eight marks and the plain colour dot — which is exactly one
   row at the door's measure. The full eighteen are in the course modal and
   belong there: at setup a wall of icons is a task, and the last row of a
   ragged grid always looks like a mistake. */
const SETUP_ICONS = ["run", "strength", "code", "work", "read", "habit", "money", "write"];

export function Onboarding({
  userId,
  mode,
  initialName,
  onDone,
}: {
  userId: string;
  mode: Mode;
  initialName: string;
  onDone: (project: Project | null, name: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [name, setName] = useState(initialName);
  const [course, setCourse] = useState("");
  const [ci, setCi] = useState(0);
  const [icon, setIcon] = useState<string | null>(null);
  const [first, setFirst] = useState("");
  const [due, setDue] = useState("");

  const palette = PALETTES[mode];

  /* The name is worth keeping even when the rest is skipped, and losing it
     is not worth failing the setup over — so it is written on its own, and a
     failure here is noted rather than raised. */
  const saveName = async (value: string) => {
    if (!value) return;
    try {
      const { error: err } = await getSupabase().auth.updateUser({ data: { name: value } });
      if (err) console.warn("Could not save your name:", err.message);
    } catch (e) {
      console.warn("Could not save your name:", e);
    }
  };

  const skip = async () => {
    if (busy) return;
    const trimmed = name.trim();
    await saveName(trimmed);
    onDone(null, trimmed);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    const trimmed = name.trim();
    const project: Project = {
      id: uid(),
      name: course.trim(),
      purpose: "",
      situation: "",
      approach: "",
      target: "",
      ci,
      status: "active",
      created: todayKey(),
      waypoints: [{ id: uid(), title: first.trim(), due, done: false, doneAt: null }],
      goal: null,
      icon,
    };
    try {
      await saveName(trimmed);
      /* Awaited rather than written optimistically like every other change in
         the app: there is no screen behind this one to fall back to, so a
         failure has to be caught here and said, not rolled back into nothing. */
      await db.saveProject(project, userId);
      setBusy(false);
      setDone(true);
      /* Handed up only when the person leaves the last screen, so the app
         behind is already holding the course by the time it is shown. */
      onDone(project, trimmed);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Could not save your course.");
    }
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (step === 0 && name.trim()) setStep(1);
    else if (step === 1 && course.trim()) setStep(2);
    else if (step === 2 && first.trim()) void create();
  };

  if (done) {
    return (
      <Door
        mode={mode}
        panel={
          <DoorPanel
            eyebrow="Ready"
            nodes={ROUTE_STEPS}
            reached={ROUTE_STEPS.length}
            quote="The route is plotted. Now walk it."
            stat="Everything else can be added as you go."
          />
        }
      >
        <div className="wp-door-seal">
          <Check size={22} strokeWidth={3} aria-hidden="true" />
        </div>
        <h1 className="wp-door-title">{name.trim() ? `You’re set, ${name.trim()}.` : "You’re set."}</h1>
        <p className="wp-door-sub">
          <strong>{course.trim()}</strong> is on the board with its first waypoint. Add activities to
          today, and tick the waypoint off when you’ve reached it.
        </p>
        <div className="wp-door-actions">
          <button className="wp-btn wp-btn-solid wp-btn-grow" onClick={() => onDone(null, name.trim())}>
            Open Waypoint
          </button>
        </div>
      </Door>
    );
  }

  const canContinue =
    step === 0 ? Boolean(name.trim()) : step === 1 ? Boolean(course.trim()) : Boolean(first.trim());

  return (
    <Door
      mode={mode}
      panel={
        <DoorPanel
          eyebrow={`Step ${step + 1} of ${STEPS.length}`}
          nodes={ROUTE_STEPS}
          reached={step}
          quote={QUOTES[step]}
          stat="Takes about a minute. Nothing here is permanent."
        />
      }
    >
      <StepRail steps={STEPS} step={step} />

      <form onSubmit={submit} noValidate>
        {step === 0 && (
          <>
            <h1 className="wp-door-title">What should we call you?</h1>
            <p className="wp-door-sub">
              It goes on the greeting when you open the app. Nothing else uses it.
            </p>
            <label className="wp-field">
              <span className="wp-eyebrow">Your name</span>
              <input
                className="wp-input"
                autoFocus
                autoComplete="given-name"
                placeholder="Anders"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="wp-door-title">What are you working towards?</h1>
            <p className="wp-door-sub">
              A course is one goal with a route to it. Give it a name you’d actually say out loud.
            </p>
            <label className="wp-field">
              <span className="wp-eyebrow">Course name</span>
              <input
                className="wp-input"
                autoFocus
                placeholder="Half marathon under 1:45"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              />
            </label>

            <div className="wp-field">
              <span className="wp-eyebrow">Colour</span>
              <div className="wp-colors">
                {palette.slice(0, VISIBLE_COLORS).map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    className={`wp-colorbtn${ci === i ? " is-on" : ""}`}
                    style={{ background: c }}
                    onClick={() => setCi(i)}
                    aria-pressed={ci === i}
                    aria-label={`Use colour ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="wp-field">
              <span className="wp-eyebrow">Icon — optional</span>
              <div className="wp-icons">
                <button
                  type="button"
                  className={`wp-iconbtn${icon === null ? " is-on" : ""}`}
                  onClick={() => setIcon(null)}
                  aria-pressed={icon === null}
                  aria-label="No icon, colour only"
                  title="Colour only"
                >
                  <span className="wp-swatch" style={{ background: palette[ci] }} />
                </button>
                {ICONS.filter((i) => SETUP_ICONS.includes(i.id)).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`wp-iconbtn${icon === id ? " is-on" : ""}`}
                    onClick={() => setIcon(id)}
                    aria-pressed={icon === id}
                    aria-label={label}
                    title={label}
                  >
                    <Icon size={16} color={palette[ci]} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="wp-door-title">What’s the first checkpoint?</h1>
            <p className="wp-door-sub">
              A waypoint is something you can tick — proof you’re on the route rather than near it.
              One is enough to start; the rest come later.
            </p>
            <label className="wp-field">
              <span className="wp-eyebrow">First waypoint</span>
              <input
                className="wp-input"
                autoFocus
                placeholder="Run 10k without stopping"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
              />
            </label>
            <label className="wp-field">
              <span className="wp-eyebrow">Reach it by — optional</span>
              <input
                className="wp-input wp-mono"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </>
        )}

        {error && (
          <p className="wp-door-error" role="alert">
            {error}
          </p>
        )}

        <div className="wp-door-actions">
          {step > 0 && (
            <button type="button" className="wp-btn" onClick={() => setStep(step - 1)} disabled={busy}>
              Back
            </button>
          )}
          <button className="wp-btn wp-btn-solid wp-btn-grow" type="submit" disabled={busy || !canContinue}>
            {busy && <Spinner />}
            {step === 2 ? (busy ? "Setting up…" : "Create course") : "Continue"}
          </button>
        </div>
      </form>

      <p className="wp-door-note">
        <button
          className="wp-btn wp-btn-ghost"
          style={{ padding: 0, minHeight: 0 }}
          onClick={() => void skip()}
          disabled={busy}
        >
          Skip setup — I’ll start from an empty board
        </button>
      </p>
    </Door>
  );
}
