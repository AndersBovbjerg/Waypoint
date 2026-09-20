"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Mode } from "./types";

/* ------------------------------------------------------------------
   The door — the shell sign-in and first-run onboarding both wear.

   They were built as two unrelated screens, which is how the app came to
   have a designed interior and an undesigned entrance. They are the same
   moment: somebody outside the app, being asked for one thing at a time.
   One shell, two contents.
   ------------------------------------------------------------------ */

type Node = [number, number];

/* Sign-in shows a course already under way; onboarding shows the three steps
   being walked. Both are the same drawing at different lengths, which is the
   point — the mark on the door is the mark inside the app. */
export const ROUTE_RUNNING: Node[] = [
  [16, 176],
  [88, 150],
  [146, 158],
  [214, 94],
  [284, 24],
];

/* The middle node sits well below the straight line between start and
   finish, not on it. Three near-collinear points drew the route and the
   dashed ideal on top of each other, which read as a rendering fault rather
   than as the two different things they are. */
export const ROUTE_STEPS: Node[] = [
  [16, 176],
  [132, 140],
  [284, 28],
];

const poly = (n: Node[]) => n.map(([x, y]) => `${x},${y}`).join(" ");

/* A surveyed line: the legs actually walked in the signal colour, the ones
   ahead in the rule colour, and the straight dashed line between start and
   finish as the ideal that no real route ever follows. That last line is the
   whole idea of the product in one mark, which is why it is here rather than
   a stock illustration. */
export function RouteMark({ nodes, reached }: { nodes: Node[]; reached: number }) {
  const walked = nodes.slice(0, Math.max(reached + 1, 1));
  const ahead = nodes.slice(Math.max(reached, 0));
  const first = nodes[0];
  const last = nodes[nodes.length - 1];

  return (
    <svg className="wp-door-art" viewBox="0 0 300 200" aria-hidden="true">
      <line
        x1={first[0]} y1={first[1]} x2={last[0]} y2={last[1]}
        stroke="var(--edge)" strokeWidth="1" strokeDasharray="4 5" opacity=".55"
      />
      {ahead.length > 1 && (
        /* --edge, not --line. The rule colour is tuned for a hairline against
           a raised card; on the panel's sunken paper in light mode it came
           out at barely over 1.1:1 and the legs still to walk simply were not
           there. Sharing --edge with the dashed ideal is fine — the dashes
           are what tell the two apart, and both mean "not yet". */
        <polyline
          points={poly(ahead)} fill="none" stroke="var(--edge)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" opacity=".8"
        />
      )}
      {walked.length > 1 && (
        /* keyed on progress so the line redraws itself each time a step is
           cleared, rather than snapping to its new length */
        <polyline
          key={reached} className="wp-door-route"
          points={poly(walked)} fill="none" stroke="var(--signal)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />
      )}
      {nodes.map(([x, y], i) => {
        if (i < reached) return <circle key={i} cx={x} cy={y} r="5" fill="var(--signal)" />;
        const here = i === reached;
        /* The last node is where the course ends, so it is marked even while
           it is still out of reach — an unmarked destination makes the route
           look like it merely stops. */
        const end = i === nodes.length - 1;
        return (
          <circle
            key={i} cx={x} cy={y} r={here ? 7 : 5}
            fill="var(--sunken)"
            stroke={here || end ? "var(--signal)" : "var(--edge)"}
            strokeWidth={here ? 3 : 2}
          />
        );
      })}
    </svg>
  );
}

/* The right half. Everything in it is decoration in the strict sense — it
   repeats or frames what the form already says, and never carries a fact on
   its own, because below 900px it is not rendered at all. */
export function DoorPanel({
  eyebrow,
  nodes,
  reached,
  quote,
  stat,
}: {
  eyebrow: string;
  nodes: Node[];
  reached: number;
  quote: string;
  stat: string;
}) {
  return (
    <aside className="wp-door-panel">
      <div className="wp-door-panel-top">
        <span className="wp-logo" aria-hidden="true" />
        <span className="wp-eyebrow" style={{ margin: 0 }}>{eyebrow}</span>
      </div>
      <RouteMark nodes={nodes} reached={reached} />
      <div>
        <p className="wp-door-quote">{quote}</p>
        <p className="wp-door-stat">{stat}</p>
      </div>
    </aside>
  );
}

/* Which face the door wears.

   Inside the app the mode is a toggle and deliberately ignores the operating
   system — see layout.tsx. The door cannot use that rule: the preference
   lives in the account, and at sign-in there is no account yet. The system
   preference is the only thing known about this person at that moment, so it
   is what gets used, and the account's own setting takes over the instant
   there is one to read. */
export function useDoorMode(preferred?: Mode, active = true): Mode {
  const [system, setSystem] = useState<Mode>("light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => setSystem(mq.matches ? "dark" : "light");
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  const mode = preferred ?? system;

  useEffect(() => {
    /* Only while the door is the thing on screen. AuthGate cannot call this
       hook conditionally, and it stays mounted after sign-in because it
       renders the app through a child function — so without this flag its
       effect kept running. React commits a child's effects before its
       parent's, which meant Waypoint wrote the account's mode and AuthGate
       overwrote it with the operating system's one frame later. Invisible
       whenever the two agreed, and a pale canvas plus the wrong iOS status
       bar whenever they did not. */
    if (!active) return;
    document.documentElement.dataset.mode = mode;
    /* Same single owned tag as the app uses, and for the same reason: never
       remove a theme-color meta that Next rendered from the viewport export,
       because React still owns that node. */
    let meta = document.head.querySelector<HTMLMetaElement>("meta[data-wp-theme]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.setAttribute("data-wp-theme", "");
      document.head.appendChild(meta);
    }
    meta.content = mode === "dark" ? "#000000" : "#FFFFFF";
  }, [mode, active]);

  return mode;
}

export function Door({
  mode,
  panel,
  children,
}: {
  mode: Mode;
  panel: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="wp-root wp-door" data-mode={mode}>
      <main className="wp-door-form">
        <div className="wp-door-inner">{children}</div>
      </main>
      {panel}
    </div>
  );
}

/* The step rail. Three states — cleared, here, ahead — and the word for the
   step you are on, which is the part that still works with colour off. */
export function StepRail({ steps, step }: { steps: readonly string[]; step: number }) {
  return (
    <ol className="wp-rail">
      {steps.map((label, i) => (
        <li key={label}>
          <span
            className={`wp-railnum${i < step ? " is-done" : i === step ? " is-now" : ""}`}
            aria-hidden="true"
          >
            {i < step ? "✓" : i + 1}
          </span>
          <span
            className={`wp-raillabel${i === step ? " is-now" : ""}`}
            aria-current={i === step ? "step" : undefined}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <span className={`wp-railline${i < step ? " is-done" : ""}`} aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  );
}

/* Every submit in the door runs through this, so "waiting" looks the same on
   all of them. */
export function Spinner() {
  return <span className="wp-spin" aria-hidden="true" />;
}
