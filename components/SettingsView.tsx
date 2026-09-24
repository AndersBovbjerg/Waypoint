import { useState } from "react";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Copy, Download } from "lucide-react";
import type { ColoredProject, ThemePref, TimerSettings } from "./types";
import { STRAVA_ENABLED, StravaCard } from "./StravaCard";

/* Everything that used to crowd the header, and the timer's three standing
   preferences that used to sit inside the Focus card. None of it is touched
   daily, which is exactly why it gets its own page instead of a row of icons
   on every screen. */

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function SettingsView({
  theme,
  onTheme,
  name,
  onName,
  reminders,
  timer,
  onTimer,
  userId,
  projects,
  onImport,
  feedToken,
  onFeedToken,
  onSignOut,
  onBack,
}: {
  theme: ThemePref;
  onTheme: (t: ThemePref) => void;
  name: string;
  onName: (n: string) => void;
  reminders: { supported: boolean; on: boolean; busy: boolean; toggle: () => void };
  timer: TimerSettings;
  onTimer: (s: TimerSettings) => void;
  userId: string;
  projects: ColoredProject[];
  onImport: () => void;
  feedToken: string | null;
  onFeedToken: (token: string) => void;
  onSignOut: () => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(name);
  const themeIndex = Math.max(0, THEMES.findIndex((t) => t.value === theme));

  /* Saved on leaving the field or on Enter, never per keystroke: every save
     is a round trip to the auth server. An empty name is not saved — the
     greeting has nothing to say with it — and the field falls back. */
  const commitName = () => {
    const next = draft.trim();
    if (!next) {
      setDraft(name);
      return;
    }
    if (next !== name) onName(next);
  };

  return (
    <div className="wp-stack wp-settings">
      <button className="wp-back" onClick={onBack}>
        <ChevronLeft size={15} /> Back
      </button>
      <h2 className="wp-display wp-display-sm">Settings</h2>

      <section className="wp-set">
        <h3 className="wp-eyebrow wp-set-label">Appearance</h3>
        <div className="wp-set-group">
          <div className="wp-set-row is-stacked">
            <div className="wp-themeseg" role="radiogroup" aria-label="Appearance">
              <span
                className="wp-themeseg-knob"
                style={{ transform: `translateX(${themeIndex * 100}%)` }}
                aria-hidden="true"
              />
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  role="radio"
                  aria-checked={theme === t.value}
                  onClick={() => theme !== t.value && onTheme(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="wp-set-sub">
              System follows your iPhone or Mac, so Waypoint turns dark when they do.
            </p>
          </div>
        </div>
      </section>

      <section className="wp-set">
        <h3 className="wp-eyebrow wp-set-label">Profile</h3>
        <div className="wp-set-group">
          <div className="wp-set-row">
            <label className="wp-set-text" htmlFor="wp-set-name">
              <span className="wp-set-title">Your name</span>
              <span className="wp-set-sub">Used in the greeting on Today.</span>
            </label>
            <input
              id="wp-set-name"
              className="wp-input wp-set-name"
              value={draft}
              placeholder="Add your name"
              autoComplete="given-name"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </div>
        </div>
      </section>

      <section className="wp-set">
        <h3 className="wp-eyebrow wp-set-label">Reminders</h3>
        <div className="wp-set-group">
          {reminders.supported ? (
            <Switch
              on={reminders.on}
              disabled={reminders.busy}
              onChange={reminders.toggle}
              title="Daily reminder"
              sub="17:00, for anything not crossed off today."
            />
          ) : (
            <div className="wp-set-row">
              <span className="wp-set-text">
                <span className="wp-set-title">Daily reminder</span>
                <span className="wp-set-sub">
                  This browser doesn&rsquo;t show notifications. On iPhone, open Waypoint from the home screen.
                </span>
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="wp-set">
        <h3 className="wp-eyebrow wp-set-label">Focus timer</h3>
        <div className="wp-set-group">
          <Switch
            on={timer.autoStartBreak}
            onChange={() => onTimer({ ...timer, autoStartBreak: !timer.autoStartBreak })}
            title="Start breaks by themselves"
          />
          <Switch
            on={timer.autoStartFocus}
            onChange={() => onTimer({ ...timer, autoStartFocus: !timer.autoStartFocus })}
            title="Start the next block by itself"
          />
          <Switch
            on={timer.sound}
            onChange={() => onTimer({ ...timer, sound: !timer.sound })}
            title="Sound when a phase ends"
          />
        </div>
      </section>

      <section className="wp-set">
        <h3 className="wp-eyebrow wp-set-label">Calendar</h3>
        <div className="wp-set-group">
          <CalendarFeed token={feedToken} onToken={onFeedToken} />
        </div>
      </section>

      <section className="wp-set">
        <h3 className="wp-eyebrow wp-set-label">Data</h3>
        <div className="wp-set-group">
          <button className="wp-set-row" onClick={onImport}>
            <Download size={18} className="wp-set-icon" aria-hidden="true" />
            <span className="wp-set-text">
              <span className="wp-set-title">Import activities</span>
              <span className="wp-set-sub">Paste a list, one activity per line.</span>
            </span>
            <ChevronRight size={18} className="wp-set-chev" aria-hidden="true" />
          </button>
          {!STRAVA_ENABLED && (
            <div className="wp-set-row">
              <span className="wp-set-text">
                <span className="wp-set-title">Strava</span>
                <span className="wp-set-sub">Runs will arrive by themselves once the API is switched on.</span>
              </span>
              <span className="wp-set-tag">Later</span>
            </div>
          )}
        </div>
        {STRAVA_ENABLED && <StravaCard userId={userId} projects={projects} />}
      </section>

      <button className="wp-btn wp-set-signout" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

/* The whole row is the control, not just the pill at its end: a 56px target
   the thumb can't miss, and one accessible name that says what it switches. */
function Switch({
  on,
  onChange,
  title,
  sub,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  title: string;
  sub?: string;
  disabled?: boolean;
}) {
  return (
    <button className="wp-set-row" role="switch" aria-checked={on} disabled={disabled} onClick={onChange}>
      <span className="wp-set-text">
        <span className="wp-set-title">{title}</span>
        {sub && <span className="wp-set-sub">{sub}</span>}
      </span>
      <span className={`wp-switch${on ? " is-on" : ""}`} aria-hidden="true" />
    </button>
  );
}

/* 32 url-safe characters from 24 random bytes. Long enough that the link
   cannot be guessed, which is the only thing standing between it and
   anyone else's calendar — see app/api/calendar. */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* Apple Calendar, one way: Waypoint publishes, Calendar subscribes. Ticking
   something off happens here and reaches Calendar the next time it fetches;
   a subscribed calendar is read-only on the phone, so nothing can come back
   the other way. */
function CalendarFeed({ token, onToken }: { token: string | null; onToken: (t: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const path = token ? `${window.location.host}/api/calendar/${token}.ics` : "";

  return (
    <div className="wp-set-row is-stacked">
      <span className="wp-set-text">
        <span className="wp-set-title">Apple Calendar</span>
        <span className="wp-set-sub">
          Subscribe once. Activities and waypoint deadlines show up as all-day events, with an alert at
          08:00 for anything still open. Ticks made here reach Calendar the next time it checks.
        </span>
      </span>

      {!token ? (
        <div className="wp-set-actions">
          <button className="wp-btn wp-btn-solid" onClick={() => onToken(newToken())}>
            <CalendarPlus size={15} /> Set up
          </button>
        </div>
      ) : (
        <>
          <div className="wp-set-actions">
            <a className="wp-btn wp-btn-solid" href={`webcal://${path}`}>
              <CalendarPlus size={15} /> Subscribe
            </a>
            <button
              className="wp-btn"
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.protocol}//${path}`).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="wp-set-sub">
            The link is private: anyone who has it can see your activity titles.
          </p>
          {confirming ? (
            <div className="wp-set-confirm" role="alert">
              <span className="wp-set-sub">The old link stops working, and Calendar needs the new one.</span>
              <div className="wp-set-actions">
                <button
                  className="wp-btn"
                  onClick={() => {
                    onToken(newToken());
                    setConfirming(false);
                  }}
                >
                  Make a new link
                </button>
                <button className="wp-btn wp-btn-ghost" onClick={() => setConfirming(false)}>
                  Keep this one
                </button>
              </div>
            </div>
          ) : (
            <button className="wp-set-link" onClick={() => setConfirming(true)}>
              Make a new link
            </button>
          )}
        </>
      )}
    </div>
  );
}
