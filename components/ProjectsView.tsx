import { useEffect, useRef, useState } from "react";
import { Plus, Archive, RotateCcw, Trash2, MoreHorizontal } from "lucide-react";
import type { Activity, ColoredProject, GoalEntry, ProjectStatus } from "./types";
import { fmtShort } from "./helpers";
import { GoalMeter, MiniRoute } from "./shared";
import { ProjectIcon } from "./identity";

/* Archive and delete used to be the two most prominent buttons on every
   card — a sizeable, bordered "Archive" pill sitting right below the
   purpose text. They're the rarest actions on a project you open daily.
   Tucked behind this menu, visual weight finally matches how often each
   thing actually happens. */
function ProjectMenu({
  status,
  onArchive,
  onDelete,
}: {
  status: ProjectStatus;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="wp-kebab" ref={ref}>
      <button
        className="wp-kebab-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Project options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div className="wp-kebab-menu" role="menu" onClick={(e) => e.stopPropagation()}>
          {confirming ? (
            <>
              <button className="wp-kebab-item is-danger" role="menuitem" onClick={onDelete}>
                <Trash2 size={14} /> Delete for good
              </button>
              <button className="wp-kebab-item" role="menuitem" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </>
          ) : (
            <>
              <button className="wp-kebab-item" role="menuitem" onClick={onArchive}>
                {status === "active" ? (
                  <>
                    <Archive size={14} /> Archive
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} /> Reactivate
                  </>
                )}
              </button>
              <button className="wp-kebab-item is-danger" role="menuitem" onClick={() => setConfirming(true)}>
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
            return (
              <article key={p.id} className="wp-card wp-project">
                <span className="wp-project-bar" style={{ background: p.color }} />
                <ProjectMenu
                  status={p.status}
                  onArchive={() => onStatus(p.id, p.status === "active" ? "archived" : "active")}
                  onDelete={() => onDelete(p.id)}
                />
                <div className="wp-card-head">
                  {/* The title is the real button; its ::after stretches over the
                      whole card, so anywhere is clickable while there is still
                      exactly one thing to tab to. */}
                  <h3 className="wp-cardtitle">
                    <ProjectIcon icon={p.icon} color={p.color} size={17} />
                    <button className="wp-cardlink" onClick={() => onOpen(p.id)}>
                      {p.name}
                    </button>
                  </h3>
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
                <p className="wp-meta-line wp-muted">
                  <span>
                    {wDone}/{p.waypoints.length} waypoints
                  </span>
                  <span>
                    {aDone}/{acts.length} activities
                  </span>
                  <span>{p.target ? fmtShort(p.target) : "no target date"}</span>
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
