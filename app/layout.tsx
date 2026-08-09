import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waypoint",
  description: "A personal goal planner — projects are courses, waypoints the checkpoints, the calendar the log.",
  appleWebApp: { capable: true, title: "Waypoint", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F1F5" },
    { media: "(prefers-color-scheme: dark)", color: "#17131D" },
  ],
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
