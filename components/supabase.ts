import { createBrowserClient } from "@supabase/ssr";

/* Waypoint runs entirely in the browser — there is no server-rendered data and
   no server action, so a browser client is all that is needed. The anon key is
   meant to be public; row level security on every table is what actually keeps
   one user's rows to themselves. */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/* Missing configuration is a deployment mistake, not a user error, so say
   exactly what is wrong and where to fix it rather than failing at the first
   query with something cryptic. */
export const supabaseConfigured = Boolean(url && anonKey);

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY — in .env.local locally, and in the " +
        "Vercel project settings for the deployed app."
    );
  }
  client = client ?? createBrowserClient(url!, anonKey!);
  return client;
}
