import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { Activity, ColoredProject, NewActivity } from "./types";
import { fmtLong, fmtShort, fromKey, keyOf } from "./helpers";
import { ActivityRow } from "./shared";
import { Select } from "./Select";

export function CalendarView({
  activities,
  projects,
  projectsById,
  today,
  onToggle,
  onRemove,
  onAdd,
  onImport,
}: {
  activities: Activity[];
  projects: ColoredProject[];
  projectsById: Record<string, ColoredProject>;
  today: string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (a: NewActivity) => void;
  onImport: () => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = fromKey(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [title, setTitle] = useState("");
  const active = projects.filter((p) => p.status === "active");
  /* derived rather than synced in an effect — see TodayView */
  const [chosen, setPid] = useState("");
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

  const dayItems = (byDate[selected] || []).sort((a, b) => Number(a.done) - Number(b.done));
  const monthLabel = new Date(cursor.y, cursor.m, 1)
    .toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    .toUpperCase();

  const step = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="wp-stack">
      <section className="wp-card">
        <div className="wp-card-head">
          <div className="wp-monthnav">
            <button className="wp-icon" onClick={() => step(-1)} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <h3 className="wp-mono wp-month">{monthLabel}</h3>
            <button className="wp-icon" onClick={() => step(1)} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="wp-btn" onClick={onImport}>
            <Download size={14} /> Import activities
          </button>
        </div>

        <div className="wp-cal-head wp-mono">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="wp-cal">
          {cells.map((k, i) => {
            if (!k) return <span key={`x${i}`} className="wp-cell is-blank" />;
            const items = byDate[k] || [];
            const allDone = items.length > 0 && items.every((a) => a.done);
            return (
              <button
                key={k}
                className={`wp-cell${k === today ? " is-today" : ""}${k === selected ? " is-sel" : ""}${
                  allDone ? " is-clear" : ""
                }`}
                onClick={() => setSelected(k)}
              >
                <span className="wp-mono wp-cell-num">{k.slice(-2)}</span>
                <span className="wp-cell-dots">
                  {items.slice(0, 6).map((a) => {
                    const c = projectsById[a.projectId]?.color || "var(--rule)";
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
        <p className="wp-legend wp-mono">
          <span className="wp-dot" style={{ border: "1.5px solid var(--ink)" }} /> PLANNED
          <span className="wp-dot" style={{ background: "var(--ink)", border: "1.5px solid var(--ink)" }} /> CLEARED
          <span className="wp-legend-clear" /> DAY FULLY CLEARED
        </p>
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>{fmtLong(selected)}</h3>
          <span className="wp-mono wp-muted">
            {dayItems.filter((a) => a.done).length}/{dayItems.length}
          </span>
        </div>
        {dayItems.length === 0 ? (
          <p className="wp-empty">Nothing on this day. Add something below.</p>
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
        <div className="wp-addrow">
          <input
            className="wp-input"
            placeholder={`Add an activity on ${fmtShort(selected)}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim() && pid) {
                onAdd({ projectId: pid, title: title.trim(), date: selected });
                setTitle("");
              }
            }}
          />
          <Select
            className="wp-select"
            value={pid}
            options={active.map((p) => ({ value: p.id, label: p.name }))}
            onChange={setPid}
            ariaLabel="Project"
          />
          <button
            className="wp-btn wp-btn-solid"
            disabled={!active.length}
            onClick={() => {
              if (!title.trim() || !pid) return;
              onAdd({ projectId: pid, title: title.trim(), date: selected });
              setTitle("");
            }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </section>
    </div>
  );
}
