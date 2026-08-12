import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waypoint",
  description: "A personal goal planner — projects are courses, waypoints the checkpoints, the calendar the log.",
  appleWebApp: { capable: true, title: "Waypoint", statusBarStyle: "default" },
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
