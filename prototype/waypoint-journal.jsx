import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Check, Trash2, ChevronLeft, ChevronRight, X,
  Archive, ArrowUpRight, Download, Flag, RotateCcw, Sun, Moon
} from "lucide-react";

/* ---------------------------------------------------------------
   Waypoint — a personal goal planner
   Quiet Journal, in light and dark.
   --------------------------------------------------------------- */

const STORE_KEY = "waypoint:v2";

/* Six project slots. Same slot, two tunings — dark needs more light in
   the colour or the muted tones disappear against the background. */
const PALETTES = {
  light: ["#7A5C8E", "#3F6B63", "#A6713D", "#5A6E97", "#9A5566", "#4F7A4A"],
  dark:  ["#B79BD6", "#6FBFAE", "#D8A264", "#93AEE0", "#DC8C9E", "#8FC98A"],
};

/* ---------- date helpers (local time, no UTC drift) ---------- */
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const todayKey = () => keyOf(new Date());
const shiftKey = (k, n) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
const fmtLong = (k) =>
  fromKey(k).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = (k) =>
  fromKey(k).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- storage ---------- */
async function loadState() {
  try {
    if (!window.storage) return null;
    const res = await window.storage.get(STORE_KEY, false);
    return res && res.value ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}
async function persist(data) {
  try {
    if (!window.storage) return;
    await window.storage.set(STORE_KEY, JSON.stringify(data), false);
  } catch (e) {
    console.error("Could not save", e);
  }
}

/* ---------- first-run sample so the dashboard isn't blank ---------- */
function seed() {
  const t = todayKey();
  const p1 = uid();
  const p2 = uid();
  return {
    mode: "light",
    projects: [
      {
        id: p1,
        name: "Three paying web clients",
        purpose: "Turn the side work into income I can rely on.",
        situation: "Two portfolio pieces built, no signed clients yet.",
        approach: "Ten cold approaches a week, mockup only after interest.",
        target: shiftKey(t, 90),
        ci: 0,
        status: "active",
        created: t,
        waypoints: [
          { id: uid(), title: "Portfolio page live", due: shiftKey(t, 7), done: true },
          { id: uid(), title: "20 businesses contacted", due: shiftKey(t, 30), done: false },
          { id: uid(), title: "First signed client", due: shiftKey(t, 55), done: false },
          { id: uid(), title: "Third signed client", due: shiftKey(t, 90), done: false },
        ],
      },
      {
        id: p2,
        name: "Match-fit for the season",
        purpose: "Play a full 90 without dropping off.",
        situation: "Training twice a week, no structured strength work.",
        approach: "Three strength sessions plus one running session weekly.",
        target: shiftKey(t, 60),
        ci: 1,
        status: "active",
        created: t,
        waypoints: [
          { id: uid(), title: "Baseline test done", due: shiftKey(t, 3), done: true },
          { id: uid(), title: "Four weeks unbroken", due: shiftKey(t, 28), done: false },
          { id: uid(), title: "Retest and compare", due: shiftKey(t, 60), done: false },
        ],
      },
    ],
    activities: [
      { id: uid(), projectId: p1, title: "Call the bakery back", date: t, done: false },
      { id: uid(), projectId: p1, title: "Write five outreach emails", date: t, done: true },
      { id: uid(), projectId: p2, title: "Strength session A", date: t, done: false },
      { id: uid(), projectId: p2, title: "Easy 5 km run", date: shiftKey(t, 1), done: false },
      { id: uid(), projectId: p1, title: "Update portfolio copy", date: shiftKey(t, 2), done: false },
      { id: uid(), projectId: p2, title: "Strength session B", date: shiftKey(t, -1), done: true },
      { id: uid(), projectId: p1, title: "List 10 local businesses", date: shiftKey(t, -2), done: true },
      { id: uid(), projectId: p2, title: "Strength session C", date: shiftKey(t, -3), done: false },
    ],
  };
}

/* carry over records from the earlier builds */
function normalise(saved) {
  const projects = (saved.projects || []).map((p) => {
    if (typeof p.ci === "number") return p;
    const legacy = ["#A8325A", "#2E6F7E", "#B4762A", "#4E7A3C", "#6A4E8C", "#B4453A"].indexOf(p.color);
    return { ...p, ci: legacy >= 0 ? legacy : 0 };
  });
  return {
    mode: saved.mode === "dark" ? "dark" : "light",
    projects,
    activities: saved.activities || [],
  };
}

/* ---------- dashboard copy ---------- */
function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late one";
  if (h < 11) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
function courseNote(items) {
  const n = items.length;
  const d = items.filter((i) => i.done).length;
  if (n === 0) return "Nothing plotted for today. Add one thing, or take the day off.";
  if (d === n) return `All ${n} cleared. Nothing left on today's course.`;
  if (d === 0) return `${n} plotted for today. Start with ${items[0].title}.`;
  const next = items.find((i) => !i.done);
  return `${d} of ${n} cleared. Next up: ${next.title}.`;
}

/* =============================== APP =============================== */
export default function Waypoint() {
  const [data, setData] = useState({ mode: "light", projects: [], activities: [] });
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("today");
  const [openProject, setOpenProject] = useState(null);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const today = todayKey();

  useEffect(() => {
    let alive = true;
    loadState().then((saved) => {
      if (!alive) return;
      setData(saved && Array.isArray(saved.projects) ? normalise(saved) : seed());
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) persist(data);
  }, [data, ready]);

  const mode = data.mode === "dark" ? "dark" : "light";
  const palette = PALETTES[mode];
  const update = (fn) => setData((d) => fn(d));

  /* ---------- mutations ---------- */
  const saveProject = (p) =>
    update((d) => ({
      ...d,
      projects: d.projects.some((x) => x.id === p.id)
        ? d.projects.map((x) => (x.id === p.id ? p : x))
        : [...d.projects, p],
    }));

  const removeProject = (id) =>
    update((d) => ({
      ...d,
      projects: d.projects.filter((p) => p.id !== id),
      activities: d.activities.filter((a) => a.projectId !== id),
    }));

  const setStatus = (id, status) =>
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, status } : p)) }));

  const toggleWaypoint = (pid, wid) =>
    update((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id !== pid
          ? p
          : { ...p, waypoints: p.waypoints.map((w) => (w.id === wid ? { ...w, done: !w.done } : w)) }
      ),
    }));

  const addWaypoint = (pid, title, due) =>
    update((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id !== pid ? p : { ...p, waypoints: [...p.waypoints, { id: uid(), title, due, done: false }] }
      ),
    }));

  const removeWaypoint = (pid, wid) =>
    update((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id !== pid ? p : { ...p, waypoints: p.waypoints.filter((w) => w.id !== wid) }
      ),
    }));

  const addActivity = (a) =>
    update((d) => ({ ...d, activities: [...d.activities, { id: uid(), done: false, ...a }] }));

  const addManyActivities = (list) =>
    update((d) => ({
      ...d,
      activities: [...d.activities, ...list.map((a) => ({ id: uid(), done: false, ...a }))],
    }));

  const toggleActivity = (id) =>
    update((d) => ({
      ...d,
      activities: d.activities.map((a) =>
        a.id === id ? { ...a, done: !a.done, doneAt: !a.done ? new Date().toISOString() : null } : a
      ),
    }));

  const removeActivity = (id) =>
    update((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));

  /* ---------- derived ---------- */
  const projects = useMemo(
    () => data.projects.map((p) => ({ ...p, color: palette[(p.ci ?? 0) % palette.length] })),
    [data.projects, palette]
  );
  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const activeProjects = projects.filter((p) => p.status === "active");
  const todayItems = data.activities
    .filter((a) => a.date === today)
    .sort((a, b) => Number(a.done) - Number(b.done));

  if (!ready) {
    return (
      <div className="wp-root wp-boot" data-mode="light">
        <style>{CSS}</style>
        <span className="wp-mono wp-muted">Loading your courses…</span>
      </div>
    );
  }

  return (
    <div className="wp-root" data-mode={mode}>
      <style>{CSS}</style>

      <header className="wp-head">
        <div className="wp-brand">
          <span className="wp-logo" aria-hidden="true" />
          <div>
            <h1>Waypoint</h1>
            <p className="wp-mono wp-muted wp-date">{fmtLong(today).toUpperCase()}</p>
          </div>
        </div>

        <div className="wp-headright">
          <nav className="wp-nav" aria-label="Sections">
            {[
              ["today", "Today"],
              ["projects", "Projects"],
              ["calendar", "Calendar"],
              ["stats", "Statistics"],
            ].map(([k, label]) => (
              <button
                key={k}
                className={`wp-tab${view === k ? " is-on" : ""}`}
                onClick={() => {
                  setView(k);
                  setOpenProject(null);
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <button
            className="wp-modebtn"
            onClick={() => update((d) => ({ ...d, mode: mode === "dark" ? "light" : "dark" }))}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={mode === "dark" ? "Light mode" : "Dark mode"}
          >
            {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="wp-main">
        {view === "today" && (
          <TodayView
            items={todayItems}
            projects={activeProjects}
            projectsById={projectsById}
            activities={data.activities}
            today={today}
            onToggle={toggleActivity}
            onRemove={removeActivity}
            onAdd={addActivity}
            onOpenProject={(id) => {
              setOpenProject(id);
              setView("projects");
            }}
          />
        )}

        {view === "projects" && !openProject && (
          <ProjectsView
            projects={projects}
            activities={data.activities}
            onOpen={setOpenProject}
            onNew={() =>
              setEditing({
                id: uid(),
                name: "",
                purpose: "",
                situation: "",
                approach: "",
                target: shiftKey(today, 30),
                ci: data.projects.length % 6,
                status: "active",
                created: today,
                waypoints: [],
              })
            }
            onStatus={setStatus}
            onDelete={removeProject}
          />
        )}

        {view === "projects" && openProject && projectsById[openProject] && (
          <ProjectDetail
            project={projectsById[openProject]}
            activities={data.activities.filter((a) => a.projectId === openProject)}
            today={today}
            onBack={() => setOpenProject(null)}
            onEdit={() => setEditing(projectsById[openProject])}
            onToggleWaypoint={toggleWaypoint}
            onAddWaypoint={addWaypoint}
            onRemoveWaypoint={removeWaypoint}
            onAddActivity={addActivity}
            onToggleActivity={toggleActivity}
            onRemoveActivity={removeActivity}
          />
        )}

        {view === "calendar" && (
          <CalendarView
            activities={data.activities}
            projects={projects}
            projectsById={projectsById}
            today={today}
            onToggle={toggleActivity}
            onRemove={removeActivity}
            onAdd={addActivity}
            onImport={() => setImportOpen(true)}
          />
        )}

        {view === "stats" && (
          <StatsView activities={data.activities} projects={projects} today={today} />
        )}
      </main>

      {editing && (
        <ProjectModal
          draft={editing}
          palette={palette}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            const { color, ...clean } = p;
            saveProject(clean);
            setEditing(null);
          }}
        />
      )}

      {importOpen && (
        <ImportModal
          projects={activeProjects}
          today={today}
          onClose={() => setImportOpen(false)}
          onImport={(list) => {
            addManyActivities(list);
            setImportOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* =============================== TODAY =============================== */
function TodayView({ items, projects, projectsById, activities, today, onToggle, onRemove, onAdd, onOpenProject }) {
  const [title, setTitle] = useState("");
  const [pid, setPid] = useState(projects[0]?.id || "");
  const done = items.filter((i) => i.done).length;

  useEffect(() => {
    if (!pid && projects[0]) setPid(projects[0].id);
  }, [projects, pid]);

  const submit = () => {
    if (!title.trim() || !pid) return;
    onAdd({ projectId: pid, title: title.trim(), date: today });
    setTitle("");
  };

  const week = Array.from({ length: 7 }, (_, i) => shiftKey(today, i + 1));
  const upcoming = activities
    .filter((a) => week.includes(a.date))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="wp-stack">
      <section className="wp-hero">
        <p className="wp-eyebrow wp-mono">Today&rsquo;s course</p>
        <h2 className="wp-display">{greeting()}, Anders.</h2>
        <p className="wp-note">{courseNote(items)}</p>
        <CourseStrip items={items} projectsById={projectsById} />
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>To do today</h3>
          <span className="wp-mono wp-muted">
            {done}/{items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="wp-empty">Nothing here yet. Add the first thing below.</p>
        ) : (
          <ul className="wp-list">
            {items.map((a) => (
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
            placeholder="Add an activity for today"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <select className="wp-input wp-select" value={pid} onChange={(e) => setPid(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="wp-btn wp-btn-solid" onClick={submit} disabled={!projects.length}>
            <Plus size={15} /> Add
          </button>
        </div>
        {!projects.length && <p className="wp-empty">Create a project first — every activity belongs to one.</p>}
      </section>

      <div className="wp-grid-2">
        <section className="wp-card">
          <div className="wp-card-head">
            <h3>Active courses</h3>
            <span className="wp-mono wp-muted">{projects.length}</span>
          </div>
          {projects.length === 0 ? (
            <p className="wp-empty">No active projects.</p>
          ) : (
            <ul className="wp-minilist">
              {projects.map((p) => {
                const wDone = p.waypoints.filter((w) => w.done).length;
                return (
                  <li key={p.id}>
                    <button className="wp-minirow" onClick={() => onOpenProject(p.id)}>
                      <span className="wp-swatch" style={{ background: p.color }} />
                      <span className="wp-minirow-name">{p.name}</span>
                      <span className="wp-mono wp-muted">
                        {wDone}/{p.waypoints.length}
                      </span>
                      <ArrowUpRight size={14} className="wp-muted" />
                    </button>
                    <MiniRoute waypoints={p.waypoints} color={p.color} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="wp-card">
          <div className="wp-card-head">
            <h3>Next seven days</h3>
            <span className="wp-mono wp-muted">{upcoming.length}</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="wp-empty">Nothing plotted for the coming week.</p>
          ) : (
            <ul className="wp-minilist">
              {upcoming.slice(0, 8).map((a) => (
                <li key={a.id} className="wp-upcoming">
                  <span className="wp-mono wp-muted wp-upcoming-date">{fmtShort(a.date)}</span>
                  <span
                    className="wp-dot"
                    style={{ background: projectsById[a.projectId]?.color || "var(--rule)" }}
                  />
                  <span className="wp-upcoming-title">{a.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* The signature element: today's activities as a plotted course */
function CourseStrip({ items, projectsById }) {
  const n = items.length;
  const done = items.filter((i) => i.done).length;
  const pct = n ? (done / n) * 100 : 0;
  return (
    <div className="wp-strip" role="img" aria-label={`${done} of ${n} activities cleared today`}>
      <div className="wp-strip-track">
        <div className="wp-strip-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="wp-strip-nodes">
        {items.map((a, i) => {
          const c = projectsById[a.projectId]?.color || "var(--accent)";
          return (
            <span
              key={a.id}
              className={`wp-node${a.done ? " is-done" : ""}`}
              style={{
                left: n === 1 ? "50%" : `${(i / (n - 1)) * 100}%`,
                background: a.done ? c : "var(--panel)",
                borderColor: c,
              }}
              title={a.title}
            />
          );
        })}
      </div>
      <div className="wp-strip-ends wp-mono">
        <span>START</span>
        <span>{n ? `${done}/${n}` : "—"}</span>
      </div>
    </div>
  );
}

function MiniRoute({ waypoints, color }) {
  if (!waypoints.length) return <div className="wp-miniroute wp-miniroute-empty" />;
  return (
    <div className="wp-miniroute">
      {waypoints.map((w, i) => (
        <React.Fragment key={w.id}>
          {i > 0 && <span className="wp-leg" style={{ background: w.done ? color : "var(--rule)" }} />}
          <span
            className="wp-legnode"
            style={{ background: w.done ? color : "var(--panel)", borderColor: w.done ? color : "var(--rule)" }}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

function ActivityRow({ a, project, onToggle, onRemove }) {
  const color = project?.color || "var(--rule)";
  return (
    <li className={`wp-row${a.done ? " is-done" : ""}`}>
      <button
        className="wp-check"
        style={{ borderColor: color, background: a.done ? color : "transparent", color: "var(--tick)" }}
        onClick={() => onToggle(a.id)}
        aria-pressed={a.done}
        aria-label={a.done ? `Mark ${a.title} as not done` : `Mark ${a.title} as done`}
      >
        {a.done && <Check size={13} strokeWidth={3} color="currentColor" />}
      </button>
      <span className="wp-row-title">{a.title}</span>
      <span className="wp-tag" style={{ color, borderColor: color }}>
        {project?.name || "No project"}
      </span>
      <button className="wp-icon" onClick={() => onRemove(a.id)} aria-label={`Delete ${a.title}`}>
        <Trash2 size={14} />
      </button>
    </li>
  );
}

/* =============================== PROJECTS =============================== */
function ProjectsView({ projects, activities, onOpen, onNew, onStatus, onDelete }) {
  const [filter, setFilter] = useState("active");
  const [confirm, setConfirm] = useState(null);
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
                  <h3>{p.name}</h3>
                  <span className="wp-mono wp-muted">{pct}%</span>
                </div>
                <p className="wp-purpose">{p.purpose || "No purpose written yet."}</p>
                <MiniRoute waypoints={p.waypoints} color={p.color} />
                <p className="wp-mono wp-muted wp-meta">
                  {wDone}/{p.waypoints.length} WAYPOINTS · {aDone}/{acts.length} ACTIVITIES · TARGET{" "}
                  {p.target ? fmtShort(p.target).toUpperCase() : "—"}
                </p>
                <div className="wp-project-actions">
                  <button className="wp-btn" onClick={() => onOpen(p.id)}>
                    Open
                  </button>
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

/* =============================== PROJECT DETAIL =============================== */
function ProjectDetail({
  project, activities, today, onBack, onEdit,
  onToggleWaypoint, onAddWaypoint, onRemoveWaypoint,
  onAddActivity, onToggleActivity, onRemoveActivity,
}) {
  const [wTitle, setWTitle] = useState("");
  const [wDue, setWDue] = useState(shiftKey(today, 14));
  const [aTitle, setATitle] = useState("");
  const [aDate, setADate] = useState(today);

  const sorted = [...activities].sort((a, b) => (a.date < b.date ? 1 : -1));
  const wDone = project.waypoints.filter((w) => w.done).length;

  return (
    <div className="wp-stack">
      <button className="wp-back" onClick={onBack}>
        <ChevronLeft size={15} /> All projects
      </button>

      <section className="wp-card">
        <span className="wp-project-bar" style={{ background: project.color }} />
        <div className="wp-card-head">
          <h2 className="wp-display wp-display-sm">{project.name}</h2>
          <button className="wp-btn" onClick={onEdit}>
            Edit details
          </button>
        </div>
        <div className="wp-brief">
          <div>
            <p className="wp-eyebrow wp-mono">Purpose</p>
            <p>{project.purpose || "—"}</p>
          </div>
          <div>
            <p className="wp-eyebrow wp-mono">Situation</p>
            <p>{project.situation || "—"}</p>
          </div>
          <div>
            <p className="wp-eyebrow wp-mono">Approach</p>
            <p>{project.approach || "—"}</p>
          </div>
        </div>
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Waypoints</h3>
          <span className="wp-mono wp-muted">
            {wDone}/{project.waypoints.length}
          </span>
        </div>

        {project.waypoints.length === 0 ? (
          <p className="wp-empty">No waypoints yet. Break the goal into the checkpoints that prove progress.</p>
        ) : (
          <ol className="wp-waypoints">
            {project.waypoints.map((w, i) => (
              <li key={w.id} className={`wp-waypoint${w.done ? " is-done" : ""}`}>
                <span className="wp-wp-index wp-mono">{pad(i + 1)}</span>
                <button
                  className="wp-check"
                  style={{
                    borderColor: project.color,
                    background: w.done ? project.color : "transparent",
                    color: "var(--tick)",
                  }}
                  onClick={() => onToggleWaypoint(project.id, w.id)}
                  aria-pressed={w.done}
                  aria-label={`Toggle waypoint ${w.title}`}
                >
                  {w.done && <Check size={13} strokeWidth={3} color="currentColor" />}
                </button>
                <span className="wp-row-title">{w.title}</span>
                <span className="wp-mono wp-muted">{w.due ? fmtShort(w.due).toUpperCase() : "—"}</span>
                <button
                  className="wp-icon"
                  onClick={() => onRemoveWaypoint(project.id, w.id)}
                  aria-label={`Delete waypoint ${w.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className="wp-addrow">
          <input
            className="wp-input"
            placeholder="Next waypoint"
            value={wTitle}
            onChange={(e) => setWTitle(e.target.value)}
          />
          <input className="wp-input wp-mono" type="date" value={wDue} onChange={(e) => setWDue(e.target.value)} />
          <button
            className="wp-btn wp-btn-solid"
            onClick={() => {
              if (!wTitle.trim()) return;
              onAddWaypoint(project.id, wTitle.trim(), wDue);
              setWTitle("");
            }}
          >
            <Flag size={14} /> Add
          </button>
        </div>
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Activities</h3>
          <span className="wp-mono wp-muted">
            {activities.filter((a) => a.done).length}/{activities.length}
          </span>
        </div>
        {sorted.length === 0 ? (
          <p className="wp-empty">No activities on this project yet.</p>
        ) : (
          <ul className="wp-list">
            {sorted.map((a) => (
              <li key={a.id} className={`wp-row${a.done ? " is-done" : ""}`}>
                <button
                  className="wp-check"
                  style={{
                    borderColor: project.color,
                    background: a.done ? project.color : "transparent",
                    color: "var(--tick)",
                  }}
                  onClick={() => onToggleActivity(a.id)}
                  aria-pressed={a.done}
                  aria-label={`Toggle ${a.title}`}
                >
                  {a.done && <Check size={13} strokeWidth={3} color="currentColor" />}
                </button>
                <span className="wp-row-title">{a.title}</span>
                <span className="wp-mono wp-muted">{fmtShort(a.date).toUpperCase()}</span>
                <button className="wp-icon" onClick={() => onRemoveActivity(a.id)} aria-label={`Delete ${a.title}`}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="wp-addrow">
          <input
            className="wp-input"
            placeholder="Add an activity"
            value={aTitle}
            onChange={(e) => setATitle(e.target.value)}
          />
          <input className="wp-input wp-mono" type="date" value={aDate} onChange={(e) => setADate(e.target.value)} />
          <button
            className="wp-btn wp-btn-solid"
            onClick={() => {
              if (!aTitle.trim()) return;
              onAddActivity({ projectId: project.id, title: aTitle.trim(), date: aDate });
              setATitle("");
            }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </section>
    </div>
  );
}

/* =============================== CALENDAR =============================== */
function CalendarView({ activities, projects, projectsById, today, onToggle, onRemove, onAdd, onImport }) {
  const [cursor, setCursor] = useState(() => {
    const d = fromKey(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [title, setTitle] = useState("");
  const active = projects.filter((p) => p.status === "active");
  const [pid, setPid] = useState(active[0]?.id || "");

  useEffect(() => {
    if (!pid && active[0]) setPid(active[0].id);
  }, [active, pid]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(keyOf(new Date(cursor.y, cursor.m, d)));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = {};
    activities.forEach((a) => {
      (map[a.date] = map[a.date] || []).push(a);
    });
    return map;
  }, [activities]);

  const dayItems = (byDate[selected] || []).sort((a, b) => Number(a.done) - Number(b.done));
  const monthLabel = new Date(cursor.y, cursor.m, 1)
    .toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    .toUpperCase();

  const step = (n) => {
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
          <select className="wp-input wp-select" value={pid} onChange={(e) => setPid(e.target.value)}>
            {active.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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

/* =============================== STATISTICS =============================== */
function StatsView({ activities, projects, today }) {
  const past = activities.filter((a) => a.date <= today);
  const done = past.filter((a) => a.done).length;
  const rate = past.length ? Math.round((done / past.length) * 100) : 0;

  const days = Array.from({ length: 14 }, (_, i) => shiftKey(today, i - 13));
  const perDay = days.map((k) => {
    const items = activities.filter((a) => a.date === k);
    return { k, planned: items.length, done: items.filter((a) => a.done).length };
  });
  const peak = Math.max(1, ...perDay.map((d) => d.planned));

  const streak = useMemo(() => {
    let count = 0;
    let k = today;
    const todayItems = activities.filter((a) => a.date === today);
    if (todayItems.length > 0 && !todayItems.every((a) => a.done)) k = shiftKey(today, -1);
    for (let i = 0; i < 400; i++) {
      const items = activities.filter((a) => a.date === k);
      if (items.length === 0) {
        k = shiftKey(k, -1);
        continue;
      }
      if (items.every((a) => a.done)) {
        count++;
        k = shiftKey(k, -1);
      } else break;
    }
    return count;
  }, [activities, today]);

  return (
    <div className="wp-stack">
      <div className="wp-kpis">
        <Kpi label="Completion rate" value={`${rate}%`} sub={`${done} of ${past.length} cleared`} />
        <Kpi label="Cleared activities" value={String(done)} sub="all time" />
        <Kpi label="Clear streak" value={String(streak)} sub="days with everything cleared" />
        <Kpi
          label="Active courses"
          value={String(projects.filter((p) => p.status === "active").length)}
          sub={`${projects.length} total`}
        />
      </div>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>Last fourteen days</h3>
          <span className="wp-mono wp-muted">CLEARED / PLANNED</span>
        </div>
        <div className="wp-bars">
          {perDay.map((d) => (
            <div key={d.k} className="wp-barcol" title={`${fmtShort(d.k)} — ${d.done}/${d.planned}`}>
              <div className="wp-bar" style={{ height: `${(d.planned / peak) * 100}%` }}>
                <div
                  className="wp-bar-fill"
                  style={{ height: d.planned ? `${(d.done / d.planned) * 100}%` : "0%" }}
                />
              </div>
              <span className="wp-mono wp-barlabel">{d.k.slice(-2)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wp-card">
        <div className="wp-card-head">
          <h3>By project</h3>
        </div>
        {projects.length === 0 ? (
          <p className="wp-empty">No projects to measure yet.</p>
        ) : (
          <ul className="wp-statlist">
            {projects.map((p) => {
              const acts = activities.filter((a) => a.projectId === p.id && a.date <= today);
              const d = acts.filter((a) => a.done).length;
              const pc = acts.length ? Math.round((d / acts.length) * 100) : 0;
              const w = p.waypoints.filter((x) => x.done).length;
              return (
                <li key={p.id} className="wp-statrow">
                  <span className="wp-swatch" style={{ background: p.color }} />
                  <span className="wp-statname">{p.name}</span>
                  <span className="wp-mono wp-muted">
                    {w}/{p.waypoints.length} WP
                  </span>
                  <span className="wp-statbar">
                    <span className="wp-statbar-fill" style={{ width: `${pc}%`, background: p.color }} />
                  </span>
                  <span className="wp-mono wp-statpct">{pc}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="wp-kpi">
      <p className="wp-eyebrow wp-mono">{label}</p>
      <p className="wp-kpi-value">{value}</p>
      <p className="wp-mono wp-muted wp-kpi-sub">{sub}</p>
    </div>
  );
}

/* =============================== MODALS =============================== */
function ProjectModal({ draft, palette, onClose, onSave }) {
  const [p, setP] = useState(draft);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));

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

function ImportModal({ projects, today, onClose, onImport }) {
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

/* =============================== STYLES =============================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Karla:wght@400;500;700&display=swap');

/* ---------- light (normal) ---------- */
.wp-root {
  --paper:#F3F1F5; --panel:#FBFAFC; --field:#F3F1F5; --ink:#2A2431; --muted:#6E6579;
  --rule:#E2DCE9; --accent:#5E4677; --clear:#EAE4F0; --tick:#FFFFFF;
  --shadow:0 2px 14px rgba(42,36,49,.06);
  --display:'Fraunces', Georgia, serif;
  --body:'Karla', system-ui, sans-serif;
  color-scheme:light;
  background:var(--paper); color:var(--ink); font-family:var(--body);
  min-height:100vh; padding:0 0 64px; font-size:16px; line-height:1.65;
  transition:background .25s ease, color .25s ease;
}

/* ---------- dark ---------- */
.wp-root[data-mode="dark"] {
  --paper:#17131D; --panel:#201B29; --field:#17131D; --ink:#EDE8F2; --muted:#9B90A8;
  --rule:#332B3E; --accent:#B79BD6; --clear:#2B2338; --tick:#17131D;
  --shadow:0 2px 16px rgba(0,0,0,.35);
  color-scheme:dark;
}

.wp-boot { display:flex; align-items:center; justify-content:center; min-height:60vh; }
.wp-root *, .wp-root *::before, .wp-root *::after { box-sizing:border-box; }
.wp-root button { font-family:inherit; cursor:pointer; }
.wp-root :focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.wp-mono { font-family:var(--body); font-size:10px; font-weight:700; letter-spacing:.1em; }
.wp-muted { color:var(--muted); }
.wp-display { font-family:var(--display); font-weight:700; font-size:44px; line-height:1.05;
  letter-spacing:-.01em; margin:2px 0 6px; }
.wp-display-sm { font-size:26px; margin:0; }
.wp-eyebrow { text-transform:uppercase; letter-spacing:.14em; color:var(--muted); margin:0 0 4px; }

/* header */
.wp-head { position:sticky; top:0; z-index:20; background:var(--paper);
  border-bottom:1px solid var(--rule); padding:16px 20px;
  display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.wp-brand { display:flex; align-items:center; gap:12px; }
.wp-brand h1 { font-family:var(--display); font-size:21px; font-weight:700; letter-spacing:-.01em; margin:0; }
.wp-date { margin:2px 0 0; }
.wp-logo { width:18px; height:18px; border-radius:50%; border:2px solid var(--accent); position:relative; flex:none; }
.wp-logo::after { content:''; position:absolute; inset:4px; border-radius:50%; background:var(--accent); }
.wp-headright { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.wp-nav { display:flex; gap:2px; overflow-x:auto; }
.wp-tab { font-family:var(--body); font-size:14px; font-weight:500; background:none; border:none;
  border-bottom:2px solid transparent; color:var(--muted); padding:6px 10px; white-space:nowrap; }
.wp-tab.is-on { color:var(--ink); border-bottom-color:var(--accent); }
.wp-modebtn { display:flex; align-items:center; justify-content:center; width:34px; height:34px;
  border-radius:999px; border:1px solid var(--rule); background:var(--panel); color:var(--muted); }
.wp-modebtn:hover { color:var(--accent); border-color:var(--accent); }

.wp-main { max-width:1000px; margin:0 auto; padding:30px 20px 0; }
.wp-stack { display:flex; flex-direction:column; gap:22px; }
.wp-grid-2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px,1fr)); gap:22px; }

/* cards */
.wp-card { background:var(--panel); border:1px solid transparent; border-radius:14px; padding:24px;
  position:relative; box-shadow:var(--shadow); transition:background .25s ease; }
.wp-root[data-mode="dark"] .wp-card { border-color:var(--rule); }
.wp-card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
.wp-card-head h3 { font-family:var(--display); font-size:19px; font-weight:500; letter-spacing:0; margin:0; }
.wp-project-bar { position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:14px 0 0 14px; }
.wp-project { padding-left:28px; }
.wp-purpose { margin:0 0 14px; color:var(--muted); font-size:15px; }
.wp-meta { margin:12px 0 14px; }
.wp-empty { color:var(--muted); font-size:15px; margin:4px 0 12px; }
.wp-note { font-size:17px; margin:0 0 20px; max-width:56ch; }
.wp-note-sm { font-size:15px; color:var(--muted); margin-bottom:10px; }

/* hero + course strip */
.wp-hero { padding:4px 2px 8px; }
.wp-strip { position:relative; padding:14px 0 0; }
.wp-strip-track { height:2px; background:var(--rule); position:relative; }
.wp-strip-fill { position:absolute; left:0; top:0; height:100%; background:var(--accent); transition:width .5s ease; }
.wp-strip-nodes { position:relative; height:0; }
.wp-node { position:absolute; top:-8px; width:13px; height:13px; border-radius:50%;
  border:2px solid var(--accent); transform:translateX(-50%); transition:background .2s ease; }
.wp-strip-ends { display:flex; justify-content:space-between; padding-top:16px; color:var(--muted); }

/* lists */
.wp-list, .wp-minilist, .wp-waypoints, .wp-statlist { list-style:none; margin:0; padding:0; }
.wp-row, .wp-waypoint { display:flex; align-items:center; gap:10px; padding:12px 0; border-top:1px solid var(--rule); }
.wp-row:first-child, .wp-waypoint:first-child { border-top:none; }
.wp-row-title { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wp-row.is-done .wp-row-title, .wp-waypoint.is-done .wp-row-title { text-decoration:line-through; color:var(--muted); }
.wp-check { width:20px; height:20px; border-radius:50%; border:2px solid var(--ink); background:transparent;
  display:flex; align-items:center; justify-content:center; flex:none; padding:0; transition:background .15s ease; }
.wp-tag { font-family:var(--body); font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
  border:1px solid; border-radius:999px; padding:3px 9px; max-width:150px; overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap; }
.wp-icon { background:none; border:none; color:var(--muted); padding:4px; display:flex; border-radius:999px; }
.wp-icon:hover { color:var(--accent); }
.wp-wp-index { color:var(--muted); width:20px; flex:none; }

.wp-minilist li { padding:10px 0; border-top:1px solid var(--rule); }
.wp-minilist li:first-child { border-top:none; }
.wp-minirow { display:flex; align-items:center; gap:9px; width:100%; background:none; border:none;
  padding:0; text-align:left; color:inherit; font-size:15px; }
.wp-minirow-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wp-swatch { width:9px; height:9px; border-radius:50%; flex:none; }
.wp-upcoming { display:flex; align-items:center; gap:9px; font-size:15px; }
.wp-upcoming-date { width:56px; flex:none; }
.wp-upcoming-title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wp-dot { width:8px; height:8px; border-radius:50%; flex:none; display:inline-block; }

/* route lines */
.wp-miniroute { display:flex; align-items:center; margin-top:8px; }
.wp-miniroute-empty { height:9px; border-top:1px dashed var(--rule); }
.wp-leg { height:2px; flex:1; }
.wp-legnode { width:9px; height:9px; border-radius:50%; border:2px solid; flex:none; }

/* forms */
.wp-addrow { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; }
.wp-input { flex:1; min-width:140px; font-family:var(--body); font-size:15px; color:var(--ink);
  background:var(--field); border:1px solid var(--rule); border-radius:12px; padding:9px 12px; }
.wp-input::placeholder { color:var(--muted); }
.wp-select { flex:0 1 180px; }
.wp-area { width:100%; resize:vertical; }
.wp-field { display:block; margin-bottom:14px; }
.wp-field .wp-eyebrow { display:block; }
.wp-btn { display:inline-flex; align-items:center; gap:6px; font-family:var(--body); font-size:13px;
  font-weight:700; background:var(--panel); color:var(--ink); border:1px solid var(--ink);
  border-radius:999px; padding:8px 14px; }
.wp-btn:hover { background:var(--ink); color:var(--paper); }
.wp-btn-solid { background:var(--ink); color:var(--paper); }
.wp-btn-solid:hover { background:var(--accent); border-color:var(--accent); color:var(--tick); }
.wp-btn-danger { background:var(--accent); border-color:var(--accent); color:var(--tick); }
.wp-btn:disabled { opacity:.35; cursor:not-allowed; }
.wp-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.wp-seg { display:flex; border:1px solid var(--rule); border-radius:999px; overflow:hidden; }
.wp-segbtn { font-family:var(--body); font-size:13px; font-weight:700; background:var(--panel);
  border:none; color:var(--muted); padding:8px 16px; }
.wp-segbtn.is-on { background:var(--ink); color:var(--paper); }
.wp-project-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.wp-confirm { display:flex; gap:8px; }
.wp-back { display:inline-flex; align-items:center; gap:4px; background:none; border:none; color:var(--muted);
  font-family:var(--body); font-size:13px; font-weight:700; padding:0; }
.wp-back:hover { color:var(--accent); }
.wp-brief { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:18px; }
.wp-brief p:last-child { margin:0; font-size:15px; }

/* calendar */
.wp-monthnav { display:flex; align-items:center; gap:8px; }
.wp-month { font-family:var(--body); font-size:12px; font-weight:700; letter-spacing:.12em; margin:0; }
.wp-cal-head, .wp-cal { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; }
.wp-cal-head { color:var(--muted); margin-bottom:8px; }
.wp-cal-head span { text-align:center; }
.wp-cell { aspect-ratio:1/1; background:var(--field); border:1px solid var(--rule); border-radius:12px;
  display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
  gap:4px; padding:6px 3px; min-height:44px; }
.wp-cell.is-blank { background:transparent; border-color:transparent; }
.wp-cell.is-today { border-color:var(--ink); }
.wp-cell.is-sel { outline:2px solid var(--accent); outline-offset:-2px; }
.wp-cell.is-clear { background:var(--clear); }
.wp-cell-num { color:var(--muted); }
.wp-cell.is-today .wp-cell-num { color:var(--ink); }
.wp-cell-dots { display:flex; flex-wrap:wrap; gap:2px; justify-content:center; }
.wp-legend { display:flex; align-items:center; gap:6px; flex-wrap:wrap; color:var(--muted); margin:14px 0 0; }
.wp-legend .wp-dot { margin-left:10px; }
.wp-legend .wp-dot:first-child { margin-left:0; }
.wp-legend-clear { width:12px; height:12px; border-radius:4px; background:var(--clear);
  border:1px solid var(--rule); margin-left:10px; }

/* stats */
.wp-kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:22px; }
.wp-kpi { background:var(--panel); border:1px solid transparent; border-radius:14px; padding:20px; box-shadow:var(--shadow); }
.wp-root[data-mode="dark"] .wp-kpi { border-color:var(--rule); }
.wp-kpi-value { font-family:var(--display); font-size:38px; font-weight:700; line-height:1; margin:8px 0; }
.wp-kpi-sub { margin:0; }
.wp-bars { display:flex; align-items:flex-end; gap:6px; height:150px; padding-top:8px; }
.wp-barcol { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:6px; }
.wp-bar { width:100%; min-height:2px; background:var(--rule); border-radius:6px; display:flex;
  flex-direction:column; justify-content:flex-end; overflow:hidden; }
.wp-bar-fill { width:100%; background:var(--accent); border-radius:6px; transition:height .4s ease; }
.wp-barlabel { color:var(--muted); font-size:10px; }
.wp-statrow { display:flex; align-items:center; gap:10px; padding:12px 0; border-top:1px solid var(--rule); }
.wp-statrow:first-child { border-top:none; }
.wp-statname { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:15px; }
.wp-statbar { width:110px; height:6px; background:var(--rule); border-radius:999px; overflow:hidden; flex:none; }
.wp-statbar-fill { display:block; height:100%; transition:width .4s ease; }
.wp-statpct { width:38px; text-align:right; flex:none; }

/* modals */
.wp-overlay { position:fixed; inset:0; background:rgba(23,19,29,.5); display:flex;
  align-items:flex-start; justify-content:center; padding:24px 16px; overflow-y:auto; z-index:50; }
.wp-modal { background:var(--panel); border:1px solid var(--rule); border-radius:18px; padding:24px;
  width:100%; max-width:520px; margin:auto; box-shadow:var(--shadow); }
.wp-modal-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:6px; flex-wrap:wrap; }
.wp-colors { display:flex; gap:8px; }
.wp-colorbtn { width:26px; height:26px; border-radius:50%; border:2px solid transparent; padding:0; }
.wp-colorbtn.is-on { border-color:var(--ink); }
.wp-sample { font-family:var(--body); font-size:12px; background:var(--field); border:1px solid var(--rule);
  border-radius:12px; padding:12px; color:var(--muted); margin:0 0 14px; white-space:pre-wrap; }

@media (max-width:560px) {
  .wp-display { font-size:32px; }
  .wp-main { padding:20px 14px 0; }
  .wp-card { padding:18px; }
  .wp-tag { display:none; }
  .wp-statbar { width:70px; }
}
@media (prefers-reduced-motion: reduce) {
  .wp-root *, .wp-root *::before, .wp-root *::after { transition:none !important; animation:none !important; }
}
`;
