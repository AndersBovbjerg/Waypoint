import { createClient } from "@supabase/supabase-js";

/* The service-role client, for the Strava routes only.

   Everything else in this app talks to Supabase as the signed-in user, with
   row level security doing the work. A webhook has no session — Strava calls
   it, not the browser — so those routes need a client that can find the token
   row by athlete id and write an activity on the user's behalf.

   The service role key bypasses row level security entirely, so it must never
   reach the browser: no NEXT_PUBLIC_ prefix, and this file is only ever
   imported from app/api/strava/**, which Next.js keeps on the server. */

export type StravaTokensRow = {
  user_id: string;
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  sync_project_id: string | null;
};

/* sync_project_id is optional on the way in: reconnecting deliberately omits
   it so the course already chosen for synced runs is left alone. */
type StravaTokensInsert = Omit<StravaTokensRow, "sync_project_id"> & {
  sync_project_id?: string | null;
};

/* Only the columns the webhook writes. The table has more; the client does not
   need to know about them, and listing only these keeps the write honest. */
type ActivitiesInsert = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  date: string;
  done: boolean;
  done_at: string | null;
  source: string;
  external_id: string;
  distance_m: number | null;
  moving_time_s: number | null;
  elapsed_time_s: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  activity_type: string | null;
}

/* The shape supabase-js wants for a typed client. Declared here rather than
   generated, because these routes only ever touch two tables and a generated
   file would be one more thing to keep in step with the migrations. */
type AdminSchema = {
  public: {
    Tables: {
      strava_tokens: {
        Row: StravaTokensRow;
        Insert: StravaTokensInsert;
        Update: Partial<StravaTokensRow>;
        Relationships: [];
      };
      activities: {
        Row: ActivitiesInsert;
        Insert: ActivitiesInsert;
        Update: Partial<ActivitiesInsert>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const adminConfigured = Boolean(url && serviceKey);

let client: ReturnType<typeof createClient<AdminSchema>> | null = null;

export function getSupabaseAdmin() {
  if (!adminConfigured) {
    throw new Error(
      "Supabase admin is not configured. Set SUPABASE_SERVICE_ROLE_KEY — in " +
        ".env.local locally, and in the Vercel project settings for the " +
        "deployed app. It must not have the NEXT_PUBLIC_ prefix."
    );
  }
  client =
    client ??
    createClient<AdminSchema>(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  return client;
}
