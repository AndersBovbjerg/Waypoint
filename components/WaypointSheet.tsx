import { useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Trash2, X } from "lucide-react";
import type { ColoredProject, WaypointItem } from "./types";
import { fmtShort, keyOf, shiftKey } from "./helpers";
import { Overlay } from "./Overlay";
import { daysBetween, laterWaypoints, pastTarget, reschedule } from "./reschedule";

export interface WaypointEdit {
  title: string;
  /* the new due date, or the old one when it was not moved */
  due: string;
  done: boolean;
  shiftLater: boolean;
  /* the course's new target date, when the moves ran past the old one */
  target: string | null;
}

/* One waypoint, opened from wherever it is listed: its whole name, when it
   was due, and the one thing a missed checkpoint most needs — a new date.
   Moving it moves the checkpoints planned after it by the same number of
   days, shown before it happens so nothing is moved behind your back. */
export function WaypointSheet({
  waypoint,
  project,
  today,
  onSave,
  onDelete,
  onOpenCourse,
  onClose,
}: {
  waypoint: WaypointItem;
  project: ColoredProject;
  today: string;
  onSave: (e: WaypointEdit) => void;
  onDelete: () => void;
  onOpenCourse: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(waypoint.title);
  const [due, setDue] = useState(waypoint.due);
  const [done, setDone] = useState(waypoint.done);
  const [shiftLater, setShiftLater] = useState(true);
  const [moveTarget, setMoveTarget] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const later = laterWaypoints(project.waypoints, waypoint.id);
  const moves = reschedule(project.waypoints, waypoint.id, due, shiftLater);
  const overrun = pastTarget(moves, project.target);
  const delta = waypoint.due && due ? daysBetween(waypoint.due, due) : 0;

  const cleanTitle = title.trim();
  const changed = cleanTitle !== waypoint.title || due !== waypoint.due || done !== waypoint.done;
  const ready = changed && cleanTitle.length > 0;

  const quick = [
    { label: "Today", day: today },
    { label: "Tomorrow", day: shiftKey(today, 1) },
    { label: "In a week", day: shiftKey(today, 7) },
  ];
  const picked = due !== waypoint.due && !quick.some((q) => q.day === due);

  return (
    <Overlay dirty={changed} onClose={onClose}>
      {(requestClose) => (
        <form
          className="wp-wpsheet"
          style={{ "--course": project.color } as React.CSSProperties}
          onSubmit={(e) => {
            e.preventDefault();
            if (!ready) return;
            onSave({
              title: cleanTitle,
              due,
              done,
              shiftLater,
              target: overrun && moveTarget ? overrun : null,
            });
          }}
        >
          <div className="wp-card-head">
            <span className="wp-eyebrow wp-wpsheet-course">
              <span className="wp-swatch" style={{ background: project.color }} />
              <span className="wp-wpsheet-coursename">Waypoint · {project.name}</span>
            </span>
            <button type="button" className="wp-icon" onClick={requestClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* the whole name, wrapping — and editable in place, since a
              checkpoint's wording is often what needs fixing once it slips */}
          <textarea
            className="wp-wpsheet-title"
            value={title}
            /* field-sizing grows it where supported; elsewhere this rough
               count of lines keeps a long name from scrolling inside */
            rows={Math.min(4, Math.max(1, Math.ceil(title.length / 24)))}
            aria-label="Waypoint name"
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
          />
          <p className={`wp-wpsheet-when${!waypoint.done && waypoint.due && waypoint.due < today ? " wp-drifttext" : " wp-muted"}`}>
            {dueLine(waypoint, today)}
          </p>

          <fieldset className="wp-field wp-wpsheet-move">
            <legend className="wp-eyebrow">Move to</legend>
            <div className="wp-coursechips-row" role="radiogroup" aria-label="New date">
              {quick.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  role="radio"
                  aria-checked={due === q.day}
                  className={`wp-datechip${due === q.day ? " is-on" : ""}`}
                  onClick={() => setDue(due === q.day ? waypoint.due : q.day)}
                >
                  {q.label}
                </button>
              ))}
              {/* The native picker, dressed as a chip: iOS opens its own
                  calendar wheel, the one date control a thumb already knows.
                  The input covers the chip, so the tap lands on it directly. */}
              <span className={`wp-datechip wp-datechip-pick${picked ? " is-on" : ""}`}>
                <CalendarDays size={14} aria-hidden="true" />
                {picked ? fmtShort(due) : "Pick a date"}
                <input
                  ref={picker}
                  type="date"
                  value={due}
                  aria-label="Pick a date"
                  onClick={() => {
                    try {
                      picker.current?.showPicker();
                    } catch {
                      /* older browsers open it on focus anyway */
                    }
                  }}
                  onChange={(e) => e.target.value && setDue(e.target.value)}
                />
              </span>
            </div>
          </fieldset>

          {moves.length > 0 && (
            <div className="wp-wpsheet-moves">
              {later.length > 0 && (
                <button
                  type="button"
                  className="wp-set-row wp-wpsheet-switch"
                  role="switch"
                  aria-checked={shiftLater}
                  onClick={() => setShiftLater((s) => !s)}
                >
                  <span className="wp-set-text">
                    <span className="wp-set-title">Move the later ones too</span>
                    <span className="wp-set-sub">
                      {later.length} waypoint{later.length === 1 ? "" : "s"}, {delta >= 0 ? "+" : "−"}
                      {Math.abs(delta)} day{Math.abs(delta) === 1 ? "" : "s"}, spacing kept
                    </span>
                  </span>
                  <span className={`wp-switch${shiftLater ? " is-on" : ""}`} aria-hidden="true" />
                </button>
              )}
              <ul className="wp-movelist">
                {moves.map((m) => (
                  <li key={m.id}>
                    <span className="wp-movelist-name">{m.id === waypoint.id ? "This one" : m.title}</span>
                    <span className="wp-mono">
                      {m.from && <s className="wp-muted">{fmtShort(m.from).toUpperCase()}</s>}
                      {m.from && " → "}
                      {fmtShort(m.to).toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
              {overrun && (
                <button
                  type="button"
                  className="wp-set-row wp-wpsheet-switch"
                  role="switch"
                  aria-checked={moveTarget}
                  onClick={() => setMoveTarget((s) => !s)}
                >
                  <span className="wp-set-text">
                    <span className="wp-set-title">Move the target date to {fmtShort(overrun)}</span>
                    <span className="wp-set-sub wp-drifttext">
                      The last one now lands after the course&rsquo;s target, {fmtShort(project.target)}.
                    </span>
                  </span>
                  <span className={`wp-switch${moveTarget ? " is-on" : ""}`} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <div className="wp-modal-actions wp-addsheet-actions">
            <button
              type="button"
              className="wp-donetoggle"
              role="switch"
              aria-checked={done}
              onClick={() => setDone((d) => !d)}
            >
              <span
                className="wp-check"
                style={{
                  borderColor: project.color,
                  background: done ? project.color : "transparent",
                  color: "var(--tick)",
                }}
                aria-hidden="true"
              >
                {done && <Check size={13} strokeWidth={3} color="currentColor" />}
              </span>
              Reached
            </button>
            <button type="submit" className="wp-btn wp-btn-solid" disabled={!ready}>
              Save
            </button>
          </div>

          <div className="wp-wpsheet-foot">
            <button type="button" className="wp-set-link" onClick={onOpenCourse}>
              Open {project.name} <ArrowUpRight size={13} aria-hidden="true" />
            </button>
            {deleting ? (
              <span className="wp-wpsheet-confirm" role="alert">
                Delete it?
                <button type="button" className="wp-set-link wp-drifttext" onClick={onDelete}>
                  Delete
                </button>
                <button type="button" className="wp-set-link" onClick={() => setDeleting(false)}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" className="wp-set-link wp-muted" onClick={() => setDeleting(true)}>
                <Trash2 size={13} aria-hidden="true" /> Delete
              </button>
            )}
          </div>
        </form>
      )}
    </Overlay>
  );
}

function dueLine(w: WaypointItem, today: string): string {
  if (w.done) return w.doneAt ? `Reached ${fmtShort(keyOf(new Date(w.doneAt)))}` : "Reached";
  if (!w.due) return "No date yet";
  const d = daysBetween(today, w.due);
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d > 1) return `Due ${fmtShort(w.due)}, in ${d} days`;
  return `Was due ${fmtShort(w.due)}, ${-d} day${d === -1 ? "" : "s"} ago`;
}
