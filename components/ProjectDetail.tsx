import { useState } from "react";
import { Plus, Check, Trash2, ChevronLeft, Flag, TrendingUp, Repeat, Pause, Play } from "lucide-react";
import type { Activity, ColoredProject, GoalEntry, NewActivity, NewRecurringActivity, RecurringActivity } from "./types";
import { GoalMeter } from "./shared";
import { ProjectIcon } from "./identity";
import { formatDelta, deltaIsGood, formatGoalValue, parseGoalValue } from "./goal";
import { fmtShort, formatWeekdays, pad, shiftKey } from "./helpers";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ProjectDetail({
  project,
  activities,
  recurring,
  goalEntries,
  today,
  onBack,
  onEdit,
  onToggleWaypoint,
  onAddWaypoint,
  onRemoveWaypoint,
  onAddActivity,
  onAddRecurring,
  onSetRecurringActive,
  onRemoveRecurring,
  onToggleActivity,
  onRemoveActivity,
  onAddGoalEntry,
  onRemoveGoalEntry,
}: {
  project: ColoredProject;
  activities: Activity[];
  recurring: RecurringActivity[];
  goalEntries: GoalEntry[];
  today: string;
  onBack: () => void;
  onEdit: () => void;
  onToggleWaypoint: (pid: string, wid: string) => void;
  onAddWaypoint: (pid: string, title: string, due: string) => void;
  onRemoveWaypoint: (pid: string, wid: string) => void;
  onAddActivity: (a: NewActivity) => void;
  onAddRecurring: (r: NewRecurringActivity) => void;
  onSetRecurringActive: (id: string, active: boolean) => void;
  onRemoveRecurring: (id: string) => void;
  onToggleActivity: (id: string) => void;
  onRemoveActivity: (id: string) => void;
  onAddGoalEntry: (projectId: string, value: number) => void;
  onRemoveGoalEntry: (id: string) => void;
}) {
  const [wTitle, setWTitle] = useState("");
  const [wDue, setWDue] = useState(shiftKey(today, 14));
  const [aTitle, setATitle] = useState("");
  const [aDate, setADate] = useState(today);
  /* Recurring swaps what the same add-row's date field means, rather than
     being a second form — the user's own framing: check a box, and the date
     picker becomes a day-of-week picker. */
  const [isRecurring, setIsRecurring] = useState(false);
  const [rWeekdays, setRWeekdays] = useState<number[]>([]);
  const [reading, setReading] = useState("");

  const sorted = [...activities].sort((a, b) => (a.date < b.date ? 1 : -1));
  const entries = goalEntries.filter((e) => e.projectId === project.id);
  const unitHint = project.goal
    ? { number: "3", time: "1:45:00", currency: "10000", percent: "80" }[project.goal.unit]
    : "";
  const parsedReading = project.goal ? parseGoalValue(reading, project.goal.unit) : null;
  const logReading = () => {
    if (parsedReading === null) return;
    onAddGoalEntry(project.id, parsedReading);
    setReading("");
  };
  const wDone = project.waypoints.filter((w) => w.done).length;

  return (
    <div className="wp-stack">
      <button className="wp-back" onClick={onBack}>
        <ChevronLeft size={15} /> All projects
      </button>

      <section className="wp-card">
        <span className="wp-project-bar" style={{ background: project.color }} />
        <div className="wp-card-head">
          <h2 className="wp-display wp-display-sm wp-cardtitle">
            <ProjectIcon icon={project.icon} color={project.color} size={20} />
            {project.name}
          </h2>
          <button className="wp-btn" onClick={onEdit}>
            Edit details
          </button>
        </div>
        <div className="wp-brief">
          <div>
            <p className="wp-eyebrow wp-mono">Purpose</p>
            <p>{project.purpose || "—"}</p>
          </div>
          <div>
            <p className="wp-eyebrow wp-mono">Situation</p>
            <p>{project.situation || "—"}</p>
          </div>
          <div>
            <p className="wp-eyebrow wp-mono">Approach</p>
            <p>{project.approach || "—"}</p>
          </div>
        </div>
      </section>

      {project.goal && (
        <section className="wp-card">
          <div className="wp-card-head">
            <h3>Goal</h3>
            <span className="wp-mono wp-muted">{entries.length} READINGS</span>
          </div>

          <GoalMeter goal={project.goal} entries={entries} color={project.color} />

          <div className="wp-addrow">
            <input
              className="wp-input wp-mono"
              placeholder={`Where it stands today — ${unitHint}`}
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && logReading()}
            />
            <button className="wp-btn wp-btn-solid" onClick={logReading} disabled={parsedReading === null}>
              <TrendingUp size={15} /> Log it
            </button>
          </div>

          {entries.length > 0 && (
            <ul className="wp-list wp-readings">
              {[...entries].reverse().map((e, i, arr) => {
                const prev = arr[i + 1];
                const delta = prev ? formatDelta(prev.value, e.value, project.goal!) : null;
                const good = prev ? deltaIsGood(prev.value, e.value, project.goal!) : false;
                return (
                  <li key={e.id} className="wp-row">
                    <span className="wp-mono wp-muted wp-upcoming-date">{fmtShort(e.date)}</span>
                    <span className="wp-row-title">
                      {formatGoalValue(e.value, project.goal!.unit)}
                    </span>
                    {delta && (
                      <span className={`wp-mono wp-delta${good ? " is-good" : ""}`}>{delta}</span>
                    )}
                    <button
                      className="wp-icon"
                      onClick={() => onRemoveGoalEntry(e.id)}
                      aria-label="Delete this reading"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Waypoints</h3>
          <span className="wp-mono wp-muted">
            {wDone}/{project.waypoints.length}
          </span>
        </div>

        {project.waypoints.length === 0 ? (
          <p className="wp-empty">No waypoints yet. Break the goal into the checkpoints that prove progress.</p>
        ) : (
          <ol className="wp-waypoints">
            {project.waypoints.map((w, i) => (
              <li key={w.id} className={`wp-waypoint${w.done ? " is-done" : ""}`}>
                <span className="wp-wp-index wp-mono">{pad(i + 1)}</span>
                <button
                  className="wp-check"
                  style={{
                    borderColor: project.color,
                    background: w.done ? project.color : "transparent",
                    color: "var(--tick)",
                  }}
                  onClick={() => onToggleWaypoint(project.id, w.id)}
                  aria-pressed={w.done}
                  aria-label={`Toggle waypoint ${w.title}`}
                >
                  {w.done && <Check size={13} strokeWidth={3} color="currentColor" />}
                </button>
                <span className="wp-row-title">{w.title}</span>
                <span className="wp-mono wp-muted">{w.due ? fmtShort(w.due).toUpperCase() : "—"}</span>
                <button
                  className="wp-icon"
                  onClick={() => onRemoveWaypoint(project.id, w.id)}
                  aria-label={`Delete waypoint ${w.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className="wp-addrow">
          <input
            className="wp-input"
            placeholder="Next waypoint"
            value={wTitle}
            onChange={(e) => setWTitle(e.target.value)}
          />
          <input className="wp-input wp-mono" type="date" value={wDue} onChange={(e) => setWDue(e.target.value)} />
          <button
            className="wp-btn wp-btn-solid"
            onClick={() => {
              if (!wTitle.trim()) return;
              onAddWaypoint(project.id, wTitle.trim(), wDue);
              setWTitle("");
            }}
          >
            <Flag size={14} /> Add
          </button>
        </div>
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Activities</h3>
          <span className="wp-mono wp-muted">
            {activities.filter((a) => a.done).length}/{activities.length}
          </span>
        </div>
        {sorted.length === 0 ? (
          <p className="wp-empty">No activities on this project yet.</p>
        ) : (
          <ul className="wp-list">
            {sorted.map((a) => (
              <li key={a.id} className={`wp-row${a.done ? " is-done" : ""}`}>
                <button
                  className="wp-check"
                  style={{
                    borderColor: project.color,
                    background: a.done ? project.color : "transparent",
                    color: "var(--tick)",
                  }}
                  onClick={() => onToggleActivity(a.id)}
                  aria-pressed={a.done}
                  aria-label={`Toggle ${a.title}`}
                >
                  {a.done && <Check size={13} strokeWidth={3} color="currentColor" />}
                </button>
                <span className="wp-row-title">{a.title}</span>
                <span className="wp-mono wp-muted">{fmtShort(a.date).toUpperCase()}</span>
                <button className="wp-icon" onClick={() => onRemoveActivity(a.id)} aria-label={`Delete ${a.title}`}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {recurring.length > 0 && (
          <ul className="wp-list">
            {recurring.map((r) => (
              <li key={r.id} className={`wp-row${r.active ? "" : " is-paused"}`}>
                <Repeat size={14} className="wp-muted" aria-hidden="true" />
                <span className="wp-row-title">{r.title}</span>
                <span className="wp-mono wp-muted">{formatWeekdays(r.weekdays)}</span>
                <button
                  className="wp-icon"
                  onClick={() => onSetRecurringActive(r.id, !r.active)}
                  aria-label={r.active ? `Pause ${r.title}` : `Resume ${r.title}`}
                  title={r.active ? "Pause — stops appearing on new days" : "Resume"}
                >
                  {r.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  className="wp-icon"
                  onClick={() => onRemoveRecurring(r.id)}
                  aria-label={`Delete the recurring rule for ${r.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="wp-addrow">
          <input
            className="wp-input"
            placeholder={isRecurring ? "Title, e.g. Gym" : "Add an activity"}
            value={aTitle}
            onChange={(e) => setATitle(e.target.value)}
          />
          {isRecurring ? (
            <div className="wp-daypills">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  className={`wp-daypill${rWeekdays.includes(i) ? " is-on" : ""}`}
                  onClick={() =>
                    setRWeekdays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))
                  }
                  aria-pressed={rWeekdays.includes(i)}
                  aria-label={DAY_FULL[i]}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <input className="wp-input wp-mono" type="date" value={aDate} onChange={(e) => setADate(e.target.value)} />
          )}
          <button
            className={`wp-btn${isRecurring ? " is-on" : ""}`}
            onClick={() => setIsRecurring((v) => !v)}
            aria-pressed={isRecurring}
            title="Recurring — repeats on chosen weekdays instead of one date"
          >
            <Repeat size={14} /> Recurring
          </button>
          <button
            className="wp-btn wp-btn-solid"
            disabled={!aTitle.trim() || (isRecurring && rWeekdays.length === 0)}
            onClick={() => {
              if (!aTitle.trim()) return;
              if (isRecurring) {
                if (rWeekdays.length === 0) return;
                onAddRecurring({ projectId: project.id, title: aTitle.trim(), weekdays: rWeekdays });
                setRWeekdays([]);
              } else {
                onAddActivity({ projectId: project.id, title: aTitle.trim(), date: aDate });
              }
              setATitle("");
            }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </section>
    </div>
  );
}
