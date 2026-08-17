import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waypoint",
  description: "A personal goal planner — projects are courses, waypoints the checkpoints, the calendar the log.",
  appleWebApp: { capable: true, title: "Waypoint", statusBarStyle: "default" },
  /* This Next version's `appleWebApp.capable` only emits the newer, unprefixed
     `mobile-web-app-capable` — Safari didn't honour that name until iOS 17.4,
     so on anything older, "Add to Home Screen" opens as a normal browser tab
     with the address bar and toolbar still showing, not as a standalone app.
     The legacy `apple-` prefixed tag is what every iOS version actually
     checks; `other` is the escape hatch for a tag the typed API doesn't emit. */
  other: { "apple-mobile-web-app-capable": "yes" },
  /* iOS home screen icons come from this link tag, never from the web app
     manifest — Android/Chrome read the manifest's icons array, iOS doesn't. */
  icons: { apple: "/icon-192.png" },
};

/* No themeColor here on purpose. The app's mode is a toggle, not the operating
   system's preference, so the colour is set at runtime from the one meta tag
   the app owns — see Waypoint.tsx. Rendering a second pair here would leave the
   browser choosing between two answers by media query, and the wrong one wins. */
export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
