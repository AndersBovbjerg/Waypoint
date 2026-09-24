/* The five tab icons, drawn from lucide's own paths (v1.31, ISC) rather than
   imported, because each one moves in its own way when tapped and that
   needs a handle on the parts: the compass needle swings and settles, the
   layers lift apart and land, the calendar's rings hop, the review's tick
   draws itself, the stats' columns grow. Nothing moves on first paint — only
   a tap plays it, which is what the `play` key is for. */
export type TabIconName = "today" | "projects" | "calendar" | "review" | "stats";

export function TabIcon({ name, play }: { name: TabIconName; play: number }) {
  return (
    <svg
      /* a new key remounts the svg, which is what restarts its animation */
      key={play}
      className={`wp-tabicon wp-tabicon-${name}${play ? " is-play" : ""}`}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "today" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path
            className="wp-ti-needle"
            d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"
          />
        </>
      )}
      {name === "projects" && (
        <>
          <path
            className="wp-ti-top"
            d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
          />
          <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
          <path
            className="wp-ti-bottom"
            d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
          />
        </>
      )}
      {(name === "calendar" || name === "review") && (
        <>
          <path className="wp-ti-ring" d="M8 2v3" />
          <path className="wp-ti-ring wp-ti-ring2" d="M16 2v3" />
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          {name === "review" && <path className="wp-ti-tick" d="m9 15 2 2 4-4" />}
        </>
      )}
      {name === "stats" && (
        <>
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path className="wp-ti-bar wp-ti-bar3" d="M18 17V9" />
          <path className="wp-ti-bar wp-ti-bar2" d="M13 17V5" />
          <path className="wp-ti-bar" d="M8 17v-3" />
        </>
      )}
    </svg>
  );
}
