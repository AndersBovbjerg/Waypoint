"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";
import { Door, DoorPanel, ROUTE_RUNNING, Spinner, useDoorMode } from "./Door";

type Phase = "checking" | "out" | "sent" | "in";
type Method = "password" | "link";

/* Holds the app back until there is a session.
   Password is the way in, because the magic link depends on Supabase's built-in
   mail sender, which allows only a handful of messages an hour and is meant for
   testing rather than daily use. The link stays as a second route, for a device
   where typing a password is awkward — but it is no longer the only door. */
export function AuthGate({ children }: { children: (session: Session) => React.ReactNode }) {
  /* Whether the keys are present is known at build time, so it is a starting
     state rather than something an effect has to correct afterwards. */
  const [phase, setPhase] = useState<Phase>(supabaseConfigured ? "checking" : "out");
  const [session, setSession] = useState<Session | null>(null);
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    supabaseConfigured
      ? null
      : "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload."
  );
  const [busy, setBusy] = useState(false);
  /* No account yet, so no stored preference to honour — the door follows the
     operating system until there is one. Once there is a session the app owns
     the theme, so the door stops writing it; see useDoorMode. */
  const mode = useDoorMode(undefined, phase !== "in");

  useEffect(() => {
    if (!supabaseConfigured) return;
    const db = getSupabase();
    let alive = true;

    db.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!alive) return;
      setSession(data.session);
      setPhase(data.session ? "in" : "out");
    });

    /* Covers a magic link landing back on the page, and the session being
       refreshed or expiring while the window sits open all day. */
    const { data: sub } = db.auth.onAuthStateChange((_event: string, next: Session | null) => {
      if (!alive) return;
      setSession(next);
      setPhase(next ? "in" : "out");
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    const address = email.trim();
    if (!address || !password) return;
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({
      email: address,
      password,
    });
    setBusy(false);
    /* On success the auth listener flips the phase, so there is nothing to do
       here but clear the field. */
    if (err) setError(err.message);
    else setPassword("");
  };

  const sendLink = async () => {
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setPhase("sent");
  };

  /* One real <form> around the fields, rather than buttons wired to onClick.
     That is what makes the browser offer to save the password, what makes
     Enter submit from either field without a keydown handler of its own, and
     what lets iOS show "Go" on the keyboard instead of a newline. */
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (method === "password") void signIn();
    else void sendLink();
  };

  if (phase === "checking") {
    return (
      <div className="wp-root wp-boot" data-mode={mode}>
        <span className="wp-mono wp-muted">Checking your session…</span>
      </div>
    );
  }

  if (phase === "in" && session) return <>{children(session)}</>;

  /* The panel never carries a number about this person — there is no session
     yet, so any figure on it would be invented. It carries the idea instead. */
  const panel = (
    <DoorPanel
      eyebrow={phase === "sent" ? "Check your email" : "The log"}
      nodes={ROUTE_RUNNING}
      reached={phase === "sent" ? 4 : 3}
      quote={
        phase === "sent"
          ? "Good for one use, for the next hour."
          : "A goal is a course. Waypoints are how you know you’re on it."
      }
      stat={
        phase === "sent"
          ? "Open it on the device you want signed in."
          : "Plot the route, then log where you actually went."
      }
    />
  );

  if (phase === "sent") {
    return (
      <Door mode={mode} panel={panel}>
        <div className="wp-door-seal">
          <MailCheck size={22} aria-hidden="true" />
        </div>
        <h1 className="wp-door-title">Check your email</h1>
        <p className="wp-door-sub">
          Sent to {email.trim()}. It’s good for one use and lasts an hour, so open it on the
          device you want signed in.
        </p>
        <div className="wp-door-actions">
          <button className="wp-btn" onClick={() => setPhase("out")}>
            Back to sign in
          </button>
        </div>
      </Door>
    );
  }

  const linkOnly = method === "link";
  const ready = linkOnly ? Boolean(email.trim()) : Boolean(email.trim() && password);

  return (
    <Door mode={mode} panel={panel}>
      <div className="wp-door-brand">
        <span className="wp-logo" aria-hidden="true" />
        <h1>Waypoint</h1>
      </div>

      <h2 className="wp-door-title">Pick up where the route left off.</h2>
      <p className="wp-door-sub">
        {linkOnly
          ? "We’ll email you a link that signs you in. No password to type."
          : "Your courses are waiting. Sign in and they follow you to any device."}
      </p>

      <form onSubmit={submit} noValidate>
        <label className="wp-field">
          <span className="wp-eyebrow">Email</span>
          <input
            className={`wp-input${error ? " is-error" : ""}`}
            aria-invalid={error ? true : undefined}
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        {!linkOnly && (
          <label className="wp-field">
            <span className="wp-eyebrow">Password</span>
            <input
              className={`wp-input${error ? " is-error" : ""}`}
              aria-invalid={error ? true : undefined}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        {error && (
          <p className="wp-door-error" role="alert">
            {error}
          </p>
        )}

        <div className="wp-door-actions">
          <button className="wp-btn wp-btn-solid wp-btn-grow" type="submit" disabled={busy || !ready}>
            {busy && <Spinner />}
            {busy
              ? linkOnly
                ? "Sending…"
                : "Signing in…"
              : linkOnly
                ? "Send me a link"
                : "Sign in"}
          </button>
        </div>
      </form>

      <p className="wp-door-note">
        <button
          className="wp-btn wp-btn-ghost"
          style={{ padding: 0, minHeight: 0 }}
          onClick={() => {
            setMethod(linkOnly ? "password" : "link");
            setError(null);
          }}
        >
          {linkOnly ? "Use a password instead" : "Email me a link instead"}
        </button>
      </p>
    </Door>
  );
}
