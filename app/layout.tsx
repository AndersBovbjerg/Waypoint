import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PreloadResources } from "@/components/PreloadResources";
import "./globals.css";

/* Gambetta (display) and Switzer (body), both from Fontshare / Indian Type
   Foundry, self-hosted from app/fonts.

   Why not the previous pair: Fraunces and Karla are good faces that have
   been used into the ground — Fraunces is the house serif of a whole era of
   indie-SaaS landing pages, and Impeccable's own detector flags it as an
   overused font. The problem was never that they looked bad, it was that
   they looked like everyone else, which is the same disease the old purple
   palette had.

   Why these two: Gambetta is an old-style text serif, so it keeps its
   character at 20px, which is where this app's display face actually lives
   (every card title) rather than at poster sizes. Its warmth and angled
   stress sit with the paper-and-brass palette and with a product whose
   nouns are courses, waypoints and a log. Switzer is a neutral grotesque
   with the clean, even numerals this app leans on constantly.

   Local rather than next/font/google: neither is on Google Fonts. ITF's
   Free Font License explicitly permits and recommends self-hosting. It
   treats subsetting as a derivative work, so these are the official files
   shipped untouched — `adjustFontFallback` still gives us a metric-matched
   fallback so nothing reflows as they swap in. Only the weights the
   stylesheet asks for are here: display 500/700, body 400/500/700. */
const gambetta = localFont({
  src: [
    { path: "./fonts/Gambetta-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Gambetta-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

const switzer = localFont({
  src: [
    { path: "./fonts/Switzer-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Switzer-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Switzer-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
});

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
  /* Without this, iOS treats the safe areas (the notch/Dynamic Island strip
     up top, the home-indicator strip at the bottom) as outside the page
     entirely and paints them itself — a plain white band, regardless of the
     app's own light/dark background. "cover" hands that whole area to the
     page instead, so html/body's own background (already theme-aware, see
     globals.css) reaches the true edge of the screen and the strip reads as
     part of the app rather than a seam around it. The bottom tab bar's own
     safe-area padding (Waypoint.tsx / globals.css) is what keeps its buttons
     clear of the home indicator once the page owns that space. */
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${gambetta.variable} ${switzer.variable}`}>
      <body>
        <PreloadResources />
        {children}
      </body>
    </html>
  );
}
