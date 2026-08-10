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
          onSignOut={() => void getSupabase().auth.signOut()}
        />
      )}
    </AuthGate>
  );
}
