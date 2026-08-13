import { getSupabaseAdmin, type StravaTokensRow } from "@/components/supabase-admin";

/* The two Strava token grants and the row they are stored in. Shared by the
   callback (first grant) and the webhook (refresh before every read). */

export const AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const TOKEN_URL = "https://www.strava.com/oauth/token";
export const API = "https://www.strava.com/api/v3";

export type TokenRow = StravaTokensRow;

interface TokenGrant {
  access_token: string;
  refresh_token: string;
  /* Unix seconds */
  expires_at: number;
  athlete?: { id: number };
}

async function grant(body: Record<string, string>): Promise<TokenGrant> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Strava token request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export function exchangeCode(code: string) {
  return grant({ code, grant_type: "authorization_code" });
}

/* Strava's expiry is a Unix second count and the column is a timestamptz —
   both are genuine instants, so toISOString is right here. It is not right
   for `activities.date`, which is a plain local day; see the webhook. */
export const expiryToIso = (seconds: number) => new Date(seconds * 1000).toISOString();

/* Refreshed a few minutes early: a token that expires mid-request is the same
   failure as one that expired an hour ago, and the round trip is cheap. */
const SKEW_MS = 5 * 60 * 1000;

export async function freshAccessToken(row: TokenRow): Promise<string> {
  if (new Date(row.expires_at).getTime() - SKEW_MS > Date.now()) return row.access_token;

  const next = await grant({ refresh_token: row.refresh_token, grant_type: "refresh_token" });
  const { error } = await getSupabaseAdmin()
    .from("strava_tokens")
    .update({
      access_token: next.access_token,
      refresh_token: next.refresh_token,
      expires_at: expiryToIso(next.expires_at),
    })
    .eq("user_id", row.user_id);
  if (error) throw new Error(`Could not store the refreshed Strava token: ${error.message}`);

  return next.access_token;
}
