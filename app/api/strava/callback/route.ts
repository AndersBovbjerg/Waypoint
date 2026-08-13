import { getSupabaseAdmin } from "@/components/supabase-admin";
import { exchangeCode, expiryToIso } from "../tokens";

/* Step two: Strava sends the browser back here with a code. Every failure
   redirects into the app with a reason rather than rendering an error page —
   this is a browser redirect flow, and a raw 500 is a dead end for the person
   standing in it. */

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const back = (result: string) => Response.redirect(`${origin}/?strava=${result}`, 302);

  const state = searchParams.get("state");
  const code = searchParams.get("code");

  if (searchParams.get("error") || !code || !state) return back("denied");

  try {
    const token = await exchangeCode(code);
    if (!token.athlete?.id) return back("error");

    /* sync_project_id is left out on purpose: reconnecting should not clear
       the course the user already chose to file runs under. */
    const { error } = await getSupabaseAdmin().from("strava_tokens").upsert(
      {
        user_id: state,
        athlete_id: token.athlete.id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: expiryToIso(token.expires_at),
      },
      { onConflict: "user_id" }
    );
    if (error) throw new Error(error.message);

    return back("connected");
  } catch (e) {
    console.error("Strava callback failed:", e);
    return back("error");
  }
}
