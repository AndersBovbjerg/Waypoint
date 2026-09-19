import type { Metadata, Viewport } from "next";
import { Work_Sans } from "next/font/google";
import { PreloadResources } from "@/components/PreloadResources";
import "./globals.css";

/* Work Sans, én variabel fil fra 100 til 900, hentet og self-hostet af
   next/font/google ved build — ingen forespørgsel til Google fra brugerens
   browser, og ingen binær i repoet.

   Hvorfor skiftet: Schibsted Grotesk var ikke forkert, den var bare uden
   mening. Den holdt sin neutralitet så godt, at appen ikke lød af noget.

   Hvorfor netop denne: Work Sans er tegnet af Wei Huang til præcis det
   bånd, appen lever i — skærmtekst mellem 14 og 48 px — og den stammer fra
   de tidlige groteske, altså skriftslægten fra skiltning, køreplaner og
   regnskabsbøger. Det er bogstaveligt talt Waypoints egen metafor: en rute,
   et checkpunkt, en log. Den har ægte tabulartal (målt, ikke antaget), et
   smallere sæt der giver flere tegn på en 375 px skærm, og — vigtigst —
   en vægtakse der starter ved 100. Schibsted-filen gik kun fra 400, så det
   spring mellem let og fed, som systemet hele tiden har påstået at leve af,
   var der aldrig rigtig. Nu er det der.

   Begge CSS-variabler --display og --body peger stadig på samme familie, så
   reglerne i globals.css ikke skulle skrives om. Kontrasten kommer fra vægt
   og størrelse, ikke fra en skrift nummer to. */
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  /* Ingen egen fallback-liste her: next/font/google laver selv en
     metrisk justeret fallback og hænger den på --font-sans, og globals.css
     tilføjer allerede system-ui bagefter. En liste mere gav bare
     system-ui, sans-serif to gange i den beregnede font-family. */
  display: "swap",
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
    <html lang="en" className={workSans.variable}>
      <body>
        <PreloadResources />
        {children}
      </body>
    </html>
  );
}
