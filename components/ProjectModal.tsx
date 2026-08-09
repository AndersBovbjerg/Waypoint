import { useState } from "react";
import { X } from "lucide-react";
import type { Project } from "./types";

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

  return (
    <div className="wp-overlay" onClick={onClose}>
      <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wp-card-head">
          <h3>{draft.name ? "Edit project" : "New project"}</h3>
          <button className="wp-icon" onClick={onClose} aria-label="Close">
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
          <button className="wp-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="wp-btn wp-btn-solid" disabled={!p.name.trim()} onClick={() => onSave(p)}>
            Save project
          </button>
        </div>
      </div>
    </div>
  );
}
