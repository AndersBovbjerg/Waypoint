import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { Goal, GoalUnit, Project } from "./types";
import { UNITS, formatGoalValue, parseGoalValue } from "./goal";
import { ICONS } from "./identity";
import { Overlay } from "./Overlay";

/* How many colour slots show before the "+" — the rest of the palette (and
   every icon) waits behind it. Keeping six visible by default, rather than
   the full twelve plus nineteen icons, was the one piece of identity the
   audit's "reduce to three choices" recommendation was asked not to touch:
   a project still gets a colour and an optional icon, just not thirty-one
   simultaneous decisions to get there. */
const VISIBLE_COLORS = 6;

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

  /* Purpose, situation, approach and the goal are reflection, not what's
     needed to start a course — they fold away by default on a new project.
     Editing one that already has them written stays expanded, so nothing
     written before looks like it went missing. */
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(draft.purpose || draft.situation || draft.approach || draft.goal)
  );
  /* Same idea for colour: six swatches by default, everything else — the
     rest of the palette and every icon — a tap away. A project already
     using a deeper slot or a chosen icon starts open. */
  const [identityOpen, setIdentityOpen] = useState(draft.icon !== null || draft.ci >= VISIBLE_COLORS);

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
    <Overlay dirty={dirty} onClose={onClose} scroll>
      {(requestClose) => (
        <>
          <div className="wp-modal-head">
            <h3>{draft.name ? "Edit project" : "New project"}</h3>
            <button className="wp-icon" onClick={requestClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="wp-modal-body">
            <label className="wp-field">
              <span className="wp-eyebrow">Name</span>
              <input className="wp-input" value={p.name} onChange={(e) => set("name", e.target.value)} autoFocus />
            </label>

            <label className="wp-field">
              <span className="wp-eyebrow">Target date — optional</span>
              <input className="wp-input wp-mono" type="date" value={p.target} onChange={(e) => set("target", e.target.value)} />
            </label>

            <div className="wp-field">
              <span className="wp-eyebrow">Colour</span>
              <div className="wp-colors">
                {palette.slice(0, VISIBLE_COLORS).map((c, i) => (
                  <button
                    key={c}
                    className={`wp-colorbtn${p.ci === i ? " is-on" : ""}`}
                    style={{ background: c }}
                    onClick={() => set("ci", i)}
                    aria-label={`Use colour ${i + 1}`}
                  />
                ))}
                {identityOpen &&
                  palette.slice(VISIBLE_COLORS).map((c, i) => (
                    <button
                      key={c}
                      className={`wp-colorbtn${p.ci === VISIBLE_COLORS + i ? " is-on" : ""}`}
                      style={{ background: c }}
                      onClick={() => set("ci", VISIBLE_COLORS + i)}
                      aria-label={`Use colour ${VISIBLE_COLORS + i + 1}`}
                    />
                  ))}
                {!identityOpen && (
                  <button
                    className="wp-colors-more"
                    onClick={() => setIdentityOpen(true)}
                    aria-label="Show more colours and icons"
                    title="More colours and icons"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>

            {identityOpen && (
              <div className="wp-field">
                <span className="wp-eyebrow">Icon — optional</span>
                <div className="wp-icons">
                  <button
                    className={`wp-iconbtn${p.icon === null ? " is-on" : ""}`}
                    onClick={() => set("icon", null)}
                    title="No icon"
                    aria-label="No icon"
                  >
                    <span className="wp-swatch" style={{ background: palette[p.ci] }} />
                  </button>
                  {ICONS.map(({ id, label: iconLabel, Icon }) => (
                    <button
                      key={id}
                      className={`wp-iconbtn${p.icon === id ? " is-on" : ""}`}
                      onClick={() => set("icon", id)}
                      title={iconLabel}
                      aria-label={iconLabel}
                    >
                      <Icon size={16} color={palette[p.ci]} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!detailsOpen ? (
              <button type="button" className="wp-disclosure-btn" onClick={() => setDetailsOpen(true)}>
                <Plus size={14} /> Add purpose, situation, approach and a goal
              </button>
            ) : (
              <div className="wp-disclosure-body">
                <label className="wp-field">
                  <span className="wp-eyebrow">Purpose — why this matters</span>
                  <textarea className="wp-input wp-area" rows={2} value={p.purpose} onChange={(e) => set("purpose", e.target.value)} />
                </label>
                <label className="wp-field">
                  <span className="wp-eyebrow">Situation — where you stand now</span>
                  <textarea className="wp-input wp-area" rows={2} value={p.situation} onChange={(e) => set("situation", e.target.value)} />
                </label>
                <label className="wp-field">
                  <span className="wp-eyebrow">Approach — how you&rsquo;ll get there</span>
                  <textarea className="wp-input wp-area" rows={2} value={p.approach} onChange={(e) => set("approach", e.target.value)} />
                </label>
                <div className="wp-field wp-goalbox">
                  <span className="wp-eyebrow">Goal — what counts as arriving</span>
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
                          <span className="wp-eyebrow">From</span>
                          <input
                            className="wp-input wp-mono"
                            placeholder={UNITS.find((u) => u.id === unit)!.hint}
                            value={startText}
                            onChange={(e) => setStartText(e.target.value)}
                          />
                        </label>
                        <label className="wp-goalnum">
                          <span className="wp-eyebrow">To</span>
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
              </div>
            )}
          </div>

          <div className="wp-modal-actions">
            <button
              className="wp-btn wp-btn-accent wp-btn-grow"
              disabled={!p.name.trim()}
              onClick={() => onSave(next)}
            >
              {draft.name ? "Save changes" : "Create project"}
            </button>
            <button className="wp-btn wp-btn-ghost" onClick={requestClose}>
              Cancel
            </button>
          </div>
        </>
      )}
    </Overlay>
  );
}
