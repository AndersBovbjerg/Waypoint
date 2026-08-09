import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ColoredProject, NewActivity } from "./types";

export function ImportModal({
  projects,
  today,
  onClose,
  onImport,
}: {
  projects: ColoredProject[];
  today: string;
  onClose: () => void;
  onImport: (list: NewActivity[]) => void;
}) {
  const [text, setText] = useState("");
  const [pid, setPid] = useState(projects[0]?.id || "");

  const parsed = useMemo(() => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(\d{4}-\d{2}-\d{2})\s*[|,;\-–]?\s*(.+)$/);
        return m ? { date: m[1], title: m[2].trim() } : { date: today, title: line };
      });
  }, [text, today]);

  return (
    <div className="wp-overlay" onClick={onClose}>
      <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wp-card-head">
          <h3>Import activities</h3>
          <button className="wp-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className="wp-note wp-note-sm">
          One activity per line. Start a line with a date to place it on that day, otherwise it lands on today.
        </p>
        <pre className="wp-mono wp-sample">{`2026-08-03 | Strength session A
2026-08-04 | Easy 5 km run
Call the bakery back`}</pre>
        <label className="wp-field">
          <span className="wp-eyebrow wp-mono">Paste your list</span>
          <textarea className="wp-input wp-area" rows={7} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="wp-field">
          <span className="wp-eyebrow wp-mono">Assign to project</span>
          <select className="wp-input wp-select" value={pid} onChange={(e) => setPid(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="wp-modal-actions">
          <span className="wp-mono wp-muted">{parsed.length} READY</span>
          <button className="wp-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="wp-btn wp-btn-solid"
            disabled={!parsed.length || !pid}
            onClick={() => onImport(parsed.map((x) => ({ ...x, projectId: pid })))}
          >
            Import {parsed.length || ""}
          </button>
        </div>
      </div>
    </div>
  );
}
