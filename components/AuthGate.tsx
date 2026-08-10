"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";

type Phase = "checking" | "out" | "sent" | "in";

/* Holds the app back until there is a session. One user, magic link only —
   no password to choose, forget or leak. */
export function AuthGate({ children }: { children: (session: Session) => React.ReactNode }) {
  /* Whether the keys are present is known at build time, so it is a starting
     state rather than something an effect has to correct afterwards. */
  const [phase, setPhase] = useState<Phase>(supabaseConfigured ? "checking" : "out");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    supabaseConfigured
      ? null
      : "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload."
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const db = getSupabase();
    let alive = true;

    db.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!alive) return;
      setSession(data.session);
      setPhase(data.session ? "in" : "out");
    });

    /* Covers the magic link landing back on the page, and the session being
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

  const send = async () => {
    const address = email.trim();
    if (!address) return;
    setSending(true);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (err) setError(err.message);
    else setPhase("sent");
  };

  if (phase === "checking") {
    return (
      <div className="wp-root wp-boot" data-mode="light">
        <span className="wp-mono wp-muted">Checking your session…</span>
      </div>
    );
  }

  if (phase === "in" && session) return <>{children(session)}</>;

  return (
    <div className="wp-root wp-signin" data-mode="light">
      <div className="wp-card wp-signin-card">
        <div className="wp-brand wp-signin-brand">
          <span className="wp-logo" aria-hidden="true" />
          <h1>Waypoint</h1>
        </div>

        {phase === "sent" ? (
          <>
            <p className="wp-note">Check your email. The link signs you straight in.</p>
            <p className="wp-empty">
              Sent to {email.trim()}. It is good for one use — open it on the device you want
              to be signed in on.
            </p>
            <button className="wp-btn" onClick={() => setPhase("out")}>
              Use a different address
            </button>
          </>
        ) : (
          <>
            <p className="wp-note">
              Your courses are waiting. Sign in and they follow you to any device.
            </p>
            <label className="wp-field">
              <span className="wp-eyebrow wp-mono">Email</span>
              <input
                className="wp-input"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sending && void send()}
              />
            </label>
            {error && <p className="wp-signin-error">{error}</p>}
            <button
              className="wp-btn wp-btn-solid"
              onClick={() => void send()}
              disabled={sending || !email.trim()}
            >
              {sending ? "Sending…" : "Send me a link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
