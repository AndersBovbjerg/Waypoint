"use client";

import { AuthGate } from "./AuthGate";
import Waypoint from "./Waypoint";
import { getSupabase } from "./supabase";

/* The client boundary. page.tsx stays a server component and renders this,
   because the gate hands the session down through a function and a function
   cannot cross from server to client. */
export default function App() {
  return (
    <AuthGate>
      {(session) => (
        <Waypoint
          userId={session.user.id}
          /* Kept on the auth user rather than in a profiles table of its own:
             it is one string, it is only ever read whole, and a new table
             would need a migration, a policy and a join for a greeting. */
          initialName={(session.user.user_metadata as { name?: string } | null)?.name ?? ""}
          onSignOut={() => void getSupabase().auth.signOut()}
        />
      )}
    </AuthGate>
  );
}
