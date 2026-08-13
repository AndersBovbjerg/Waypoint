import { AUTHORIZE_URL } from "../tokens";

/* Step one of the connect flow: hand the browser to Strava.

   `state` is the Supabase user id, read client-side before navigating here and
   handed back untouched by Strava in the callback. On an app with public
   sign-up that would be a way to write a token row against someone else's
   account; here sign-up is disabled and there is one user, so it is a
   deliberate simplification rather than an oversight. */

export async function GET(request: Request) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return new Response(
      "Strava is not configured. Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET — " +
        "in .env.local locally, and in the Vercel project settings for the deployed app.",
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }

  const { origin, searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  if (!state) {
    return new Response("Missing state. Open this from the Strava card in Statistics.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const authorize = new URL(AUTHORIZE_URL);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", `${origin}/api/strava/callback`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("approval_prompt", "auto");
  authorize.searchParams.set("scope", "activity:read_all");
  authorize.searchParams.set("state", state);

  return Response.redirect(authorize.toString(), 302);
}
