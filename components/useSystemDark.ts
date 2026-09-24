import { useSyncExternalStore } from "react";

/* Whether the device itself is in dark mode right now. Only read when the
   user picked "System" in Settings, and followed live: a phone set to
   switch automatically flips at sunset while the app is open, and the app
   should flip with it rather than on the next reload. */
const QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useSystemDark() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
