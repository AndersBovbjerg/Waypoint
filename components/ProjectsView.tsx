import { useState } from "react";
import { Plus, Archive, RotateCcw, Trash2 } from "lucide-react";
import type { Activity, ColoredProject, GoalEntry, ProjectStatus } from "./types";
import { fmtShort } from "./helpers";
import { GoalMeter, MiniRoute } from "./shared";

export function ProjectsView({
  projects,
  activities,
  goalEntries,
  onOpen,
  onNew,
  onStatus,
  onDelete,
}: {
  projects: ColoredProject[];
  activities: Activity[];
  goalEntries: GoalEntry[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onStatus: (id: string, status: ProjectStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"active" | "archive">("active");
  const [confirm, setConfirm] = useState<string | null>(null);
  const shown = projects.filter((p) => (filter === "archive" ? p.status !== "active" : p.status === "active"));

  return (
    <div className="wp-stack">
      <div className="wp-toolbar">
        <div className="wp-seg">
          <button className={`wp-segbtn${filter === "active" ? " is-on" : ""}`} onClick={() => setFilter("active")}>
            Active
          </button>
          <button className={`wp-segbtn${filter === "archive" ? " is-on" : ""}`} onClick={() => setFilter("archive")}>
            Archive
          </button>
        </div>
        <button className="wp-btn wp-btn-solid" onClick={onNew}>
          <Plus size={15} /> New project
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="wp-card">
          <p className="wp-empty">
            {filter === "active"
              ? "No active projects. Create one to start plotting a course."
              : "Nothing archived yet. Finished projects land here."}
          </p>
        </div>
      ) : (
        <div className="wp-grid-2">
          {shown.map((p) => {
            const acts = activities.filter((a) => a.projectId === p.id);
            const aDone = acts.filter((a) => a.done).length;
            const wDone = p.waypoints.filter((w) => w.done).length;
            const pct = p.waypoints.length ? Math.round((wDone / p.waypoints.length) * 100) : 0;
            return (
              <article key={p.id} className="wp-card wp-project">
                <span className="wp-project-bar" style={{ background: p.color }} />
                <div className="wp-card-head">
                  {/* The title is the real button; its ::after stretches over the
                      whole card, so anywhere is clickable while there is still
                      exactly one thing to tab to. */}
                  <h3>
                    <button className="wp-cardlink" onClick={() => onOpen(p.id)}>
                      {p.name}
                    </button>
                  </h3>
                  <span className="wp-mono wp-muted">{pct}%</span>
                </div>
                <p className="wp-purpose">{p.purpose || "No purpose written yet."}</p>
                {p.goal && (
                  <GoalMeter
                    goal={p.goal}
                    entries={goalEntries.filter((e) => e.projectId === p.id)}
                    color={p.color}
                    compact
                  />
                )}
                <MiniRoute waypoints={p.waypoints} color={p.color} />
                <p className="wp-mono wp-muted wp-meta">
                  {wDone}/{p.waypoints.length} WAYPOINTS · {aDone}/{acts.length} ACTIVITIES · TARGET{" "}
                  {p.target ? fmtShort(p.target).toUpperCase() : "—"}
                </p>
                <div className="wp-project-actions">
                  {p.status === "active" ? (
                    <button className="wp-btn" onClick={() => onStatus(p.id, "archived")}>
                      <Archive size={14} /> Archive
                    </button>
                  ) : (
                    <button className="wp-btn" onClick={() => onStatus(p.id, "active")}>
                      <RotateCcw size={14} /> Reactivate
                    </button>
                  )}
                  {confirm === p.id ? (
                    <span className="wp-confirm">
                      <button className="wp-btn wp-btn-danger" onClick={() => onDelete(p.id)}>
                        Delete for good
                      </button>
                      <button className="wp-btn" onClick={() => setConfirm(null)}>
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button className="wp-icon" onClick={() => setConfirm(p.id)} aria-label={`Delete ${p.name}`}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
