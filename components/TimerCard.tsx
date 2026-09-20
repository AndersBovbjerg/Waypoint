import { useState } from "react";
import { Play, Pause, SkipForward, Square, Timer as TimerIcon, X } from "lucide-react";
import type { Activity, ColoredProject, TimerSettings, UnfiledSession } from "./types";
import type { TimerApi } from "./useTimer";
import { PRESETS, resolvePreset } from "./store";
import { fmtClock } from "./helpers";
import { Select } from "./Select";

export function TimerCard({
  timer,
  settings,
  onSettings,
  projects,
  projectsById,
  todayItems,
  unfiled,
  onFile,
  onDrop,
}: {
  timer: TimerApi;
  settings: TimerSettings;
  onSettings: (s: TimerSettings) => void;
  projects: ColoredProject[];
  projectsById: Record<string, ColoredProject>;
  todayItems: Activity[];
  /* finished blocks still waiting to be told what they counted toward */
  unfiled: UnfiledSession[];
  onFile: (u: UnfiledSession, projectId: string) => void;
  onDrop: (id: string) => void;
}) {
  const { runtime, remaining, progress, running, label } = timer;
  const idle = runtime.phase === "idle";
  const preset = resolvePreset(settings);

  /* Collapsed until asked for. Ten controls lived here permanently -- four
     presets, two selects, Start and three settings toggles -- on the screen
     the app opens on, to do one thing. Now the resting state is one row.
     Running is never collapsed: a countdown is the whole screen. */
  const [open, setOpen] = useState(false);

  /* both derived, so a project or activity that disappears falls back
     cleanly instead of being corrected by an effect a render later.
     The empty string is meaningful here: it means "decide afterwards",
     which is the default, because the intent to focus arrives before the
     decision about what it counts toward. */
  const [chosenP, setPid] = useState("");
  const pid = projects.some((p) => p.id === chosenP) ? chosenP : "";

  /* only today's open items, and only for the project in question */
  const options = todayItems.filter((a) => !a.done && a.projectId === pid);
  const [chosenA, setAid] = useState("");
  const aid = options.some((a) => a.id === chosenA) ? chosenA : "";

  const activeProject = runtime.projectId ? projectsById[runtime.projectId] : projectsById[pid];
  const accent = activeProject?.color || "var(--signal)";
  const shown = idle ? preset.focus * 60_000 : remaining;

  /* The clock, the strip and the cycle dots are the running instrument.
     At rest, collapsed, they are a 52px zero and an empty track saying
     nothing, so they only render once the card is doing something. */
  const shell = !idle || open;

  const boundActivity = runtime.activityId
    ? todayItems.find((a) => a.id === runtime.activityId)
    : null;

  return (
    <section className={`wp-card wp-timer${running ? " is-running" : ""}`}>
      <div className="wp-card-head">
        <h3>Focus</h3>
        <span className="wp-mono wp-muted">{label.toUpperCase()}</span>
      </div>

      {shell && (
      <div className="wp-timer-clock">
        <span className="wp-timer-time" style={{ color: idle ? "var(--muted)" : accent }}>
          {fmtClock(shown)}
        </span>
        {!idle && activeProject && (
          <span className="wp-timer-on">
            <span className="wp-swatch" style={{ background: accent }} />
            <span className="wp-timer-on-name">
              {boundActivity ? boundActivity.title : activeProject.name}
            </span>
          </span>
        )}
      </div>
      )}

      {/* the same track-and-node grammar as the course strip */}
      {shell && (
      <div className="wp-strip wp-timer-strip">
        <div className="wp-strip-track">
          <div
            className="wp-strip-fill"
            style={{ width: `${Math.min(100, progress * 100)}%`, background: accent }}
          />
        </div>
      </div>
      )}

      {shell && preset.cycles > 0 && <Cycles done={runtime.cycle} of={preset.cycles} color={accent} />}

      {idle && unfiled.length > 0 && (
        <FilingPrompt unfiled={unfiled} projects={projects} onFile={onFile} onDrop={onDrop} />
      )}

      {idle && !open && (
        <div className="wp-focusbar">
          <button className="wp-addbtn wp-focusbar-open" onClick={() => setOpen(true)}>
            <span className="wp-focusbar-label">
              <TimerIcon size={15} /> Focus
            </span>
            <span className="wp-mono">{fmtClock(preset.focus * 60_000)}</span>
          </button>
          <button
            className="wp-btn wp-btn-solid wp-focusbar-play"
            disabled={!projects.length}
            onClick={() => timer.start(null, null)}
            aria-label={`Start ${preset.focus} minutes of focus`}
          >
            <Play size={16} />
          </button>
        </div>
      )}

      {idle && open ? (
        <>
          <div className="wp-timer-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`wp-segbtn wp-timer-preset${settings.presetId === p.id ? " is-on" : ""}`}
                onClick={() => onSettings({ ...settings, presetId: p.id })}
              >
                {p.id === "custom" ? `${settings.custom.focus} / ${settings.custom.break}` : p.label}
              </button>
            ))}
          </div>

          {settings.presetId === "custom" && (
            <div className="wp-addrow wp-timer-custom">
              <label className="wp-timer-num">
                <span className="wp-eyebrow wp-mono">Focus</span>
                <input
                  className="wp-input wp-mono"
                  type="number"
                  min={1}
                  max={180}
                  value={settings.custom.focus}
                  onChange={(e) =>
                    onSettings({
                      ...settings,
                      custom: { ...settings.custom, focus: clamp(e.target.value, 1, 180) },
                    })
                  }
                />
              </label>
              <label className="wp-timer-num">
                <span className="wp-eyebrow wp-mono">Break</span>
                <input
                  className="wp-input wp-mono"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.custom.break}
                  onChange={(e) =>
                    onSettings({
                      ...settings,
                      custom: { ...settings.custom, break: clamp(e.target.value, 1, 60) },
                    })
                  }
                />
              </label>
            </div>
          )}

          <div className="wp-addrow">
            <Select
              className="wp-select"
              value={pid}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              onChange={setPid}
              ariaLabel="Course to focus on"
              placeholder="Decide afterwards"
            />
            <Select
              className="wp-select"
              value={aid}
              options={options.map((a) => ({ value: a.id, label: a.title }))}
              onChange={setAid}
              ariaLabel="Activity to focus on"
              disabled={!options.length}
              placeholder={options.length ? "Whole project" : "No open items today"}
            />
            <button
              className="wp-btn wp-btn-solid"
              disabled={!projects.length}
              onClick={() => timer.start(pid || null, aid || null)}
            >
              <Play size={15} /> Start
            </button>
          </div>

          {!projects.length && (
            <p className="wp-empty">Create a project first — focus time is logged against one.</p>
          )}

          <button className="wp-back wp-focus-collapse" onClick={() => setOpen(false)}>
            Done
          </button>

          <div className="wp-timer-opts">
            <Toggle
              on={settings.autoStartBreak}
              onChange={(v) => onSettings({ ...settings, autoStartBreak: v })}
              label="Auto-start breaks"
            />
            <Toggle
              on={settings.autoStartFocus}
              onChange={(v) => onSettings({ ...settings, autoStartFocus: v })}
              label="Auto-start focus"
            />
            <Toggle
              on={settings.sound}
              onChange={(v) => onSettings({ ...settings, sound: v })}
              label="Sound"
            />
          </div>
        </>
      ) : idle ? null : (
        <div className="wp-timer-actions">
          {running ? (
            <button className="wp-btn" onClick={timer.pause}>
              <Pause size={14} /> Pause
            </button>
          ) : (
            <button className="wp-btn wp-btn-solid" onClick={timer.resume}>
              <Play size={14} /> Resume
            </button>
          )}
          <button className="wp-btn" onClick={timer.skip}>
            <SkipForward size={14} /> Skip to {runtime.phase === "focus" ? "break" : "focus"}
          </button>
          <button className="wp-btn" onClick={timer.stop}>
            <Square size={14} /> Stop
          </button>
        </div>
      )}
    </section>
  );
}

/* Focus blocks completed in the run-up to the next long break. A full set
   stays lit until the next block starts the count over. */
function Cycles({ done, of, color }: { done: number; of: number; color: string }) {
  const lit = done > 0 && done % of === 0 ? of : done % of;
  return (
    <div className="wp-timer-cycles" aria-label={`${done} focus blocks done`}>
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className="wp-legnode"
          style={{
            background: i < lit ? color : "var(--raised)",
            borderColor: i < lit ? color : "var(--edge)",
          }}
        />
      ))}
      <span className="wp-mono wp-muted wp-timer-cyclecount">{done} DONE</span>
    </div>
  );
}

function clamp(raw: string, lo: number, hi: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      className={`wp-toggle${on ? " is-on" : ""}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <span className="wp-toggle-dot" />
      <span className="wp-mono">{label.toUpperCase()}</span>
    </button>
  );
}

/* Compact readout for the header, so the countdown is visible from any view. */
export function TimerBadge({ timer, onClick }: { timer: TimerApi; onClick: () => void }) {
  if (timer.runtime.phase === "idle") return null;
  return (
    <button
      className={`wp-timerbadge${timer.runtime.phase === "focus" ? " is-focus" : ""}`}
      onClick={onClick}
      title="Go to the timer"
    >
      <TimerIcon size={13} />
      <span className="wp-mono">{fmtClock(timer.remaining)}</span>
      {timer.runtime.paused != null && <span className="wp-mono wp-muted">PAUSED</span>}
    </button>
  );
}

/* ---------- where did that time go? ----------
   A block that finished without a course. It is not in the database yet and
   will not be until this is answered, so the question has to survive a
   reload -- which is why it is asked here, on the screen the app opens on,
   rather than in a toast that vanishes. Dismissing is a real answer too:
   time you cannot place is better dropped than filed wrongly. */
function FilingPrompt({
  unfiled,
  projects,
  onFile,
  onDrop,
}: {
  unfiled: UnfiledSession[];
  projects: ColoredProject[];
  onFile: (u: UnfiledSession, projectId: string) => void;
  onDrop: (id: string) => void;
}) {
  const u = unfiled[0];
  const more = unfiled.length - 1;
  return (
    <div className="wp-filing" role="group" aria-label="File a finished focus session">
      <div className="wp-filing-head">
        <p className="wp-filing-q">
          Where did those <strong>{u.minutes} minutes</strong> go?
          {!u.completed && <span className="wp-muted"> · stopped early</span>}
        </p>
        <button className="wp-icon" onClick={() => onDrop(u.id)} aria-label="Don't count this session">
          <X size={15} />
        </button>
      </div>
      <div className="wp-filing-choices">
        {projects.map((p) => (
          <button key={p.id} className="wp-filing-choice" onClick={() => onFile(u, p.id)}>
            <span className="wp-swatch" style={{ background: p.color }} />
            {p.name}
          </button>
        ))}
      </div>
      {more > 0 && (
        <p className="wp-empty wp-filing-more">
          {more} more {more === 1 ? "session" : "sessions"} to place after this one.
        </p>
      )}
    </div>
  );
}
