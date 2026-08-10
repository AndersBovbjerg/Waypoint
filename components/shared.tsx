import React from "react";
import { Check, Trash2 } from "lucide-react";
import type { Activity, ColoredProject, Goal, GoalEntry, WaypointItem } from "./types";
import { currentValue, formatGoalValue, goalProgress, goalReached } from "./goal";

/* The signature element: today's activities as a plotted course */
export function CourseStrip({
  items,
  projectsById,
}: {
  items: Activity[];
  projectsById: Record<string, ColoredProject>;
}) {
  const n = items.length;
  const done = items.filter((i) => i.done).length;
  const pct = n ? (done / n) * 100 : 0;
  return (
    <div className="wp-strip" role="img" aria-label={`${done} of ${n} activities cleared today`}>
      <div className="wp-strip-track">
        <div className="wp-strip-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="wp-strip-nodes">
        {items.map((a, i) => {
          const c = projectsById[a.projectId]?.color || "var(--accent)";
          return (
            <span
              key={a.id}
              className={`wp-node${a.done ? " is-done" : ""}`}
              style={{
                left: n === 1 ? "50%" : `${(i / (n - 1)) * 100}%`,
                background: a.done ? c : "var(--panel)",
                borderColor: c,
              }}
              title={a.title}
            />
          );
        })}
      </div>
      <div className="wp-strip-ends wp-mono">
        <span>START</span>
        <span>{n ? `${done}/${n}` : "—"}</span>
      </div>
    </div>
  );
}

export function MiniRoute({ waypoints, color }: { waypoints: WaypointItem[]; color: string }) {
  if (!waypoints.length) return <div className="wp-miniroute wp-miniroute-empty" />;
  return (
    <div className="wp-miniroute">
      {waypoints.map((w, i) => (
        <React.Fragment key={w.id}>
          {i > 0 && <span className="wp-leg" style={{ background: w.done ? color : "var(--rule)" }} />}
          <span
            className="wp-legnode"
            style={{ background: w.done ? color : "var(--panel)", borderColor: w.done ? color : "var(--rule)" }}
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
  const color = project?.color || "var(--rule)";
  return (
    <li className={`wp-row${a.done ? " is-done" : ""}`}>
      <button
        className="wp-check"
        style={{ borderColor: color, background: a.done ? color : "transparent", color: "var(--tick)" }}
        onClick={() => onToggle(a.id)}
        aria-pressed={a.done}
        aria-label={a.done ? `Mark ${a.title} as not done` : `Mark ${a.title} as done`}
      >
        {a.done && <Check size={13} strokeWidth={3} color="currentColor" />}
      </button>
      <span className="wp-row-title">{a.title}</span>
      <span className="wp-tag" style={{ color, borderColor: color }}>
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
      <p className="wp-mono wp-muted wp-goal-ends">
        <span>{formatGoalValue(goal.start, goal.unit)}</span>
        <span className="wp-goal-pct">
          {reached ? "REACHED" : `${Math.round(pct * 100)}%`}
          {!moved && !reached && " · NO READING YET"}
        </span>
        <span>{formatGoalValue(goal.target, goal.unit)}</span>
      </p>
    </div>
  );
}
