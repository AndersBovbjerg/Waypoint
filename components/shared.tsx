import React from "react";
import { Check, Trash2 } from "lucide-react";
import type { Activity, ColoredProject, Goal, GoalEntry, WaypointItem } from "./types";
import { currentValue, formatGoalValue, goalProgress, goalReached } from "./goal";
import { formatStravaMetrics } from "./helpers";

/* Route walked against time spent. Stated plainly — it's a fact about the
   dates, not a verdict. Takes the two numbers directly rather than a whole
   ProjectWeek/ProjectStanding, so both the weekly review and Statistics'
   all-time project list can render the exact same pace reading without
   either one importing the other's data shape. */
export function Pace({ timeGone, routeDone }: { timeGone: number | null; routeDone: number | null }) {
  if (timeGone === null || routeDone === null) return null;
  const gap = routeDone - timeGone;
  const label = gap >= 0.05 ? "AHEAD" : gap <= -0.15 ? "BEHIND PACE" : "ON PACE";
  const tone = gap <= -0.15 ? "is-behind" : gap >= 0.05 ? "is-ahead" : "";
  return (
    <span
      className={`wp-pace wp-mono ${tone}`}
      title={`${Math.round(routeDone * 100)}% of the route, ${Math.round(timeGone * 100)}% of the time`}
    >
      {label === "AHEAD" && <Check size={11} strokeWidth={3} />}
      {label}
    </span>
  );
}

export function MiniRoute({ waypoints, color }: { waypoints: WaypointItem[]; color: string }) {
  if (!waypoints.length) return <div className="wp-miniroute wp-miniroute-empty" />;
  return (
    <div className="wp-miniroute">
      {waypoints.map((w, i) => (
        <React.Fragment key={w.id}>
          {/* --edge, not the retired --rule: measured at 3.0–3.5:1 against
              both card surfaces, where --line sits at 1.2:1 and the legs you
              have not walked simply are not there. Same token the door's
              route mark uses for the same reason. */}
          {i > 0 && <span className="wp-leg" style={{ background: w.done ? color : "var(--edge)" }} />}
          <span
            className="wp-legnode"
            style={{ background: w.done ? color : "var(--raised)", borderColor: w.done ? color : "var(--edge)" }}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export function ActivityRow({
  a,
  project,
  onToggle,
  onRemove,
}: {
  a: Activity;
  project?: ColoredProject;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  /* An activity whose course was deleted still has to draw a ring and a tag;
     --edge is the neutral that reads on both card surfaces. */
  const color = project?.color || "var(--edge)";
  const metrics = a.source === "strava" ? formatStravaMetrics(a) : null;
  /* The tick draws itself and the ring pops only on the tap that ticks it —
     never on a list of already-done rows arriving on screen. */
  const [ticking, setTicking] = React.useState(false);
  return (
    <li
      className={`wp-row${a.done ? " is-done" : ""}`}
      /* Handed to CSS rather than applied here, so the tag and the sub-line
         can mix it toward --ink for legibility while the border keeps it
         pure. See the course-colour-as-text note in globals.css. */
      style={{ "--course": color } as React.CSSProperties}
    >
      <button
        className={`wp-check${ticking ? " is-ticking" : ""}`}
        style={{ borderColor: color, background: a.done ? color : "transparent", color: "var(--tick)" }}
        onClick={() => {
          setTicking(!a.done);
          onToggle(a.id);
        }}
        onAnimationEnd={() => setTicking(false)}
        aria-pressed={a.done}
        aria-label={a.done ? `Mark ${a.title} as not done` : `Mark ${a.title} as done`}
      >
        {a.done && <Check size={13} strokeWidth={3} color="currentColor" />}
      </button>
      <span className="wp-row-title">
        {a.title}
        {metrics && <span className="wp-row-sub wp-muted"> · {metrics}</span>}
        {/* Same name as the pill beside it, and only one of the two is ever
            displayed — the pill above 560px, this below. It sits inside the
            title so it shares the title's ellipsis and gets truncated first. */}
        <span className="wp-row-course">
          {" · "}
          {project?.name || "No course"}
        </span>
      </span>
      <span className="wp-tag">
        {project?.name || "No project"}
      </span>
      <button className="wp-icon" onClick={() => onRemove(a.id)} aria-label={`Delete ${a.title}`}>
        <Trash2 size={14} />
      </button>
    </li>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="wp-kpi">
      <p className="wp-eyebrow wp-mono">{label}</p>
      <p className="wp-kpi-value">{value}</p>
      <p className="wp-mono wp-muted wp-kpi-sub">{sub}</p>
    </div>
  );
}

/* The goal as a distance travelled. Shown wherever a project is shown, because
   a number you never see cannot motivate anything. */
export function GoalMeter({
  goal,
  entries,
  color,
  compact,
}: {
  goal: Goal;
  entries: GoalEntry[];
  color: string;
  compact?: boolean;
}) {
  const current = currentValue(goal, entries);
  const pct = goalProgress(goal, current);
  const reached = goalReached(goal, current);
  const moved = entries.length > 0;

  return (
    <div className={`wp-goal${compact ? " is-compact" : ""}`}>
      <div className="wp-goal-head">
        <span className="wp-goal-label">{goal.label}</span>
        <span className="wp-goal-now" style={{ color }}>
          {formatGoalValue(current, goal.unit)}
        </span>
      </div>
      <div className="wp-goal-track">
        <div
          className="wp-goal-fill"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
      {/* Two numbers, not four: the big figure above is where things stand
          right now: here is only the target to read it against, and a status
          word. The starting value still drives the math (goalProgress,
          direction) — it just doesn't need to print a second time next to a
          "current" reading that looks identical until the first entry lands. */}
      <p className="wp-mono wp-muted wp-goal-ends">
        <span>{reached ? "Reached" : moved ? `${Math.round(pct * 100)}%` : "No reading yet"}</span>
        <span>Target {formatGoalValue(goal.target, goal.unit)}</span>
      </p>
    </div>
  );
}
