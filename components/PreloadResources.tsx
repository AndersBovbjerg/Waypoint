"use client";

import { preconnect } from "react-dom";

/* Everything this app shows comes from one origin, and nothing can paint
   until it answers: hydration runs, the session check goes out, then seven
   parallel queries, and only then is there a course to look at. All of that
   waits on a cold DNS + TCP + TLS handshake that only starts once the
   JavaScript is already parsed. This hint moves the handshake to the very
   start of the page load instead, so it overlaps the bundle download rather
   than following it.

   `crossOrigin: "anonymous"` matches how supabase-js actually fetches (CORS,
   no cookies) — a mismatch here opens a second connection that the real
   requests can't reuse, which is worse than no hint at all.

   Metadata can't express a resource hint in this Next version; react-dom's
   float methods from a client component are the documented route, and the
   tag still lands in the prerendered HTML. */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function PreloadResources() {
  if (SUPABASE_URL) preconnect(SUPABASE_URL, { crossOrigin: "anonymous" });
  return null;
}
