import { useMemo, useRef, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import type { Activity, ColoredProject, NewActivity, WaypointItem } from "./types";
import { fmtLong, fmtShort, fromKey, keyOf } from "./helpers";
import { ActivityRow } from "./shared";
import { AddActivitySheet } from "./AddActivitySheet";

/* A waypoint pinned to the day it is due, with the course it belongs to. */
interface DueWaypoint {
  w: WaypointItem;
  project: ColoredProject;
}

export function CalendarView({
  activities,
  projects,
  projectsById,
  today,
  onToggle,
  onRemove,
  onAdd,
  onOpenWaypoint,
}: {
  activities: Activity[];
  projects: ColoredProject[];
  projectsById: Record<string, ColoredProject>;
  today: string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (a: NewActivity) => void;
  onOpenWaypoint: (pid: string, wid: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = fromKey(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  /* which way the last month turn went, so the new month slides in from
     the side you were heading towards */
  const [turn, setTurn] = useState<1 | -1 | 0>(0);
  const [adding, setAdding] = useState(false);
  const active = projects.filter((p) => p.status === "active");
  /* The course last added to is the one offered next — derived rather than
     synced in an effect, see TodayView */
  const [chosen, setChosen] = useState("");
  const pid = active.some((p) => p.id === chosen) ? chosen : active[0]?.id || "";

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(keyOf(new Date(cursor.y, cursor.m, d)));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    activities.forEach((a) => {
      (map[a.date] = map[a.date] || []).push(a);
    });
    return map;
  }, [activities]);

  /* Waypoints are the stable layer of a plan — the one thing in this app
     that is honestly dated ahead — so they are the one thing the calendar
     shows before it happens. Active courses only: an archived course's
     deadlines are no longer anyone's. */
  const dueByDate = useMemo(() => {
    const map: Record<string, DueWaypoint[]> = {};
    projects
      .filter((p) => p.status === "active")
      .forEach((project) =>
        project.waypoints.forEach((w) => {
          if (w.due) (map[w.due] = map[w.due] || []).push({ w, project });
        })
      );
    return map;
  }, [projects]);

  const dayItems = (byDate[selected] || []).sort((a, b) => Number(a.done) - Number(b.done));
  const dayDue = dueByDate[selected] || [];
  const monthLabel = new Date(cursor.y, cursor.m, 1)
    .toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    .toUpperCase();

  const step = (n: 1 | -1) => {
    setTurn(n);
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  /* Swiping the grid sideways turns the month, the way a phone's own
     calendar does. Only a clearly horizontal stroke counts, so scrolling
     the page past the calendar never turns it by accident. */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  };

  /* First tap picks the day, a second tap on the same day adds to it. The
     + on the day card does the same, for anyone who never taps twice. */
  const pickDay = (k: string) => {
    if (k === selected) setAdding(true);
    else setSelected(k);
  };

  return (
    <div className="wp-stack">
      <section className="wp-card">
        <div className="wp-calnav">
          <button className="wp-icon" onClick={() => step(-1)} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <h3 className="wp-calnav-month" aria-live="polite">
            {monthLabel}
          </h3>
          <button className="wp-icon" onClick={() => step(1)} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="wp-cal-head wp-mono">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div
          key={`${cursor.y}-${cursor.m}`}
          className={`wp-cal${turn === 1 ? " is-from-next" : turn === -1 ? " is-from-prev" : ""}`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {cells.map((k, i) => {
            if (!k) return <span key={`x${i}`} className="wp-cell is-blank" />;
            const items = byDate[k] || [];
            const due = dueByDate[k] || [];
            const allDone = items.length > 0 && items.every((a) => a.done);
            return (
              <button
                key={k}
                className={`wp-cell${k === today ? " is-today" : ""}${k === selected ? " is-sel" : ""}${
                  allDone ? " is-clear" : ""
                }`}
                onClick={() => pickDay(k)}
                aria-label={
                  k === selected
                    ? `${fmtLong(k)}, selected. Tap again to add an activity`
                    : `${fmtLong(k)}${items.length ? `, ${items.length} activities` : ""}${
                        due.length ? `, ${due.length} waypoint${due.length > 1 ? "s" : ""} due` : ""
                      }`
                }
              >
                {due.length > 0 && (
                  <Flag
                    size={10}
                    strokeWidth={2.5}
                    className="wp-cell-flag"
                    color={due[0].project.color}
                    fill={due.every((d) => d.w.done) ? due[0].project.color : "none"}
                    aria-hidden="true"
                  />
                )}
                <span className="wp-mono wp-cell-num">{k.slice(-2)}</span>
                <span className="wp-cell-dots">
                  {items.slice(0, 6).map((a) => {
                    const c = projectsById[a.projectId]?.color || "var(--edge)";
                    return (
                      <span
                        key={a.id}
                        className="wp-dot"
                        style={{ background: a.done ? c : "transparent", border: `1.5px solid ${c}` }}
                      />
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>{fmtLong(selected)}</h3>
          <div className="wp-dayhead-actions">
            <span className="wp-mono wp-muted">
              {dayItems.filter((a) => a.done).length}/{dayItems.length}
            </span>
            <button
              className="wp-icon wp-dayadd"
              onClick={() => setAdding(true)}
              disabled={!active.length}
              aria-label={`Add an activity on ${fmtShort(selected)}`}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {dayDue.length > 0 && (
          <ul className="wp-list wp-duelist">
            {dayDue.map(({ w, project }) => (
              <li key={w.id} className={`wp-row wp-duerow${w.done ? " is-done" : ""}`}>
                <Flag
                  size={16}
                  strokeWidth={2.25}
                  color={project.color}
                  fill={w.done ? project.color : "none"}
                  aria-hidden="true"
                />
                <button className="wp-row-title wp-rowlink" onClick={() => onOpenWaypoint(project.id, w.id)}>
                  {w.title}
                  <span className="wp-row-sub wp-muted"> · {project.name}</span>
                </button>
                <span className="wp-mono wp-muted">{w.done ? "REACHED" : "WAYPOINT DUE"}</span>
              </li>
            ))}
          </ul>
        )}

        {dayItems.length === 0 ? (
          <p className="wp-empty">
            {active.length
              ? "Nothing on this day yet. Tap the day again to add an activity."
              : "Create a course first — every activity belongs to one."}
          </p>
        ) : (
          <ul className="wp-list">
            {dayItems.map((a) => (
              <ActivityRow
                key={a.id}
                a={a}
                project={projectsById[a.projectId]}
                onToggle={onToggle}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </section>

      {adding && active.length > 0 && (
        <AddActivitySheet
          date={selected}
          projects={active}
          initialProject={pid}
          /* a day already behind you is being logged, not planned */
          initialDone={selected < today}
          onClose={() => setAdding(false)}
          onAdd={(a) => {
            onAdd(a);
            setChosen(a.projectId);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}
