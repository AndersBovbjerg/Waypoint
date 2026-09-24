import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { ColoredProject, NewActivity } from "./types";
import { fmtLong } from "./helpers";
import { Overlay } from "./Overlay";

/* What, which course, and whether it already happened. Opened by a second
   tap on a calendar day and by "Log one now" on Today's card.

   The course is a row of chips rather than a dropdown — with a handful of
   active courses, one tap on the one you mean beats opening a list to find
   it. "Already done" is on by default wherever the activity is being
   written down after the fact, which is how most of them arrive. */
export function AddActivitySheet({
  date,
  projects,
  initialProject,
  initialDone = false,
  onClose,
  onAdd,
}: {
  date: string;
  projects: ColoredProject[];
  initialProject: string;
  initialDone?: boolean;
  onClose: () => void;
  onAdd: (a: NewActivity) => void;
}) {
  const [title, setTitle] = useState("");
  const [pid, setPid] = useState(initialProject);
  const [done, setDone] = useState(initialDone);
  const ready = title.trim().length > 0 && Boolean(pid);
  const color = projects.find((p) => p.id === pid)?.color || "var(--signal)";

  return (
    <Overlay dirty={title.trim().length > 0} onClose={onClose}>
      {(requestClose) => (
        <form
          className="wp-addsheet"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) onAdd({ projectId: pid, title: title.trim(), date, done });
          }}
        >
          <div className="wp-card-head">
            <h3>{fmtLong(date)}</h3>
            <button type="button" className="wp-icon" onClick={requestClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <label className="wp-field">
            <span className="wp-eyebrow">Activity</span>
            <input
              className="wp-input wp-addsheet-input"
              autoFocus
              placeholder="Read 25 min"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <fieldset className="wp-field wp-coursechips">
            <legend className="wp-eyebrow">Course</legend>
            <div className="wp-coursechips-row" role="radiogroup" aria-label="Course">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={pid === p.id}
                  className={`wp-coursechip${pid === p.id ? " is-on" : ""}`}
                  style={{ "--course": p.color } as React.CSSProperties}
                  onClick={() => setPid(p.id)}
                >
                  <span className="wp-swatch" style={{ background: p.color }} />
                  <span className="wp-coursechip-name">{p.name}</span>
                </button>
              ))}
            </div>
          </fieldset>

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
                style={{ borderColor: color, background: done ? color : "transparent", color: "var(--tick)" }}
                aria-hidden="true"
              >
                {done && <Check size={13} strokeWidth={3} color="currentColor" />}
              </span>
              Already done
            </button>
            <button type="submit" className="wp-btn wp-btn-solid" disabled={!ready}>
              <Plus size={15} /> {done ? "Log activity" : "Add activity"}
            </button>
          </div>
        </form>
      )}
    </Overlay>
  );
}
