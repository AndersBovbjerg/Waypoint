import { useState } from "react";
import { X } from "lucide-react";
import type { Goal, GoalUnit, Project } from "./types";
import { UNITS, formatGoalValue, parseGoalValue } from "./goal";
import { Overlay } from "./Overlay";

export function ProjectModal({
  draft,
  palette,
  onClose,
  onSave,
}: {
  draft: Project;
  palette: string[];
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [p, setP] = useState<Project>(draft);
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }));

  /* The two ends of the goal are held as text while they are being typed —
     a half-typed "1:4" has no number in it yet, and forcing one would turn
     every keystroke into a wrong value. */
  const [label, setLabel] = useState(draft.goal?.label ?? "");
  const [unit, setUnit] = useState<GoalUnit>(draft.goal?.unit ?? "number");
  const [startText, setStartText] = useState(
    draft.goal ? formatGoalValue(draft.goal.start, draft.goal.unit) : ""
  );
  const [targetText, setTargetText] = useState(
    draft.goal ? formatGoalValue(draft.goal.target, draft.goal.unit) : ""
  );

  const start = parseGoalValue(startText, unit);
  const target = parseGoalValue(targetText, unit);
  const goal: Goal | null =
    label.trim() && start !== null && target !== null
      ? { label: label.trim(), unit, start, target }
      : null;
  /* said out loud rather than silently dropping what was typed */
  const goalIncomplete = label.trim().length > 0 && goal === null;

  const next: Project = { ...p, goal };

  /* Only guard what would actually be lost — an untouched form closes at once. */
  const dirty = JSON.stringify(next) !== JSON.stringify(draft);

  return (
    <Overlay dirty={dirty} onClose={onClose}>
      {(requestClose) => (
      <>
        <div className="wp-card-head">
          <h3>{draft.name ? "Edit project" : "New project"}</h3>
          <button className="wp-icon" onClick={requestClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <label className="wp-field">
          <span className="wp-eyebrow wp-mono">Name</span>
          <input className="wp-input" value={p.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </label>
        <label className="wp-field">
          <span className="wp-eyebrow wp-mono">Purpose — why this matters</span>
          <textarea className="wp-input wp-area" rows={2} value={p.purpose} onChange={(e) => set("purpose", e.target.value)} />
        </label>
        <label className="wp-field">
          <span className="wp-eyebrow wp-mono">Situation — where you stand now</span>
          <textarea className="wp-input wp-area" rows={2} value={p.situation} onChange={(e) => set("situation", e.target.value)} />
        </label>
        <label className="wp-field">
          <span className="wp-eyebrow wp-mono">Approach — how you&rsquo;ll get there</span>
          <textarea className="wp-input wp-area" rows={2} value={p.approach} onChange={(e) => set("approach", e.target.value)} />
        </label>
        <label className="wp-field">
          <span className="wp-eyebrow wp-mono">Target date</span>
          <input className="wp-input wp-mono" type="date" value={p.target} onChange={(e) => set("target", e.target.value)} />
        </label>
        <div className="wp-field wp-goalbox">
          <span className="wp-eyebrow wp-mono">Goal — what counts as arriving</span>
          <input
            className="wp-input"
            placeholder="Half marathon time, monthly revenue, paying clients…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          {label.trim().length > 0 && (
            <>
              <div className="wp-timer-presets wp-goalunits">
                {UNITS.map((u) => (
                  <button
                    key={u.id}
                    className={`wp-segbtn wp-timer-preset${unit === u.id ? " is-on" : ""}`}
                    onClick={() => setUnit(u.id)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
              <div className="wp-goalrow">
                <label className="wp-goalnum">
                  <span className="wp-eyebrow wp-mono">From</span>
                  <input
                    className="wp-input wp-mono"
                    placeholder={UNITS.find((u) => u.id === unit)!.hint}
                    value={startText}
                    onChange={(e) => setStartText(e.target.value)}
                  />
                </label>
                <label className="wp-goalnum">
                  <span className="wp-eyebrow wp-mono">To</span>
                  <input
                    className="wp-input wp-mono"
                    placeholder={UNITS.find((u) => u.id === unit)!.hint}
                    value={targetText}
                    onChange={(e) => setTargetText(e.target.value)}
                  />
                </label>
              </div>
              {goalIncomplete ? (
                <p className="wp-empty wp-goalhint">
                  Add both numbers to track this one. Which way is better is worked out from
                  them — a target below the start counts downwards.
                </p>
              ) : (
                goal && (
                  <p className="wp-empty wp-goalhint">
                    {formatGoalValue(goal.start, goal.unit)} → {formatGoalValue(goal.target, goal.unit)},
                    counting {goal.target < goal.start ? "down" : "up"}.
                  </p>
                )
              )}
            </>
          )}
        </div>

        <div className="wp-field">
          <span className="wp-eyebrow wp-mono">Colour on the calendar</span>
          <div className="wp-colors">
            {palette.map((c, i) => (
              <button
                key={c}
                className={`wp-colorbtn${p.ci === i ? " is-on" : ""}`}
                style={{ background: c }}
                onClick={() => set("ci", i)}
                aria-label={`Use colour ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="wp-modal-actions">
          <button className="wp-btn" onClick={requestClose}>
            Cancel
          </button>
          <button className="wp-btn wp-btn-solid" disabled={!p.name.trim()} onClick={() => onSave(next)}>
            Save project
          </button>
        </div>
      </>
      )}
    </Overlay>
  );
}
