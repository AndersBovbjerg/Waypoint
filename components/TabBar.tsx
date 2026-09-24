import { useLayoutEffect, useRef, useState } from "react";
import { TabIcon, type TabIconName } from "./TabIcon";

export interface Tab {
  key: TabIconName;
  label: string;
}

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* The bottom bar on a phone. The active tab is marked by one small dot under
   its label — the filled node of the Waypoint mark — which slides to the tab
   you tap and stretches a little on the way, the way a drop of ink would.
   The tapped icon plays its own short move; see TabIcon. On Settings, which
   is not a tab, the dot fades out rather than pointing at the wrong place. */
export function TabBar({
  tabs,
  active,
  onGo,
}: {
  tabs: Tab[];
  active: TabIconName | null;
  onGo: (k: TabIconName) => void;
}) {
  const [played, setPlayed] = useState<{ key: TabIconName | null; n: number }>({ key: null, n: 0 });
  const pip = useRef<HTMLSpanElement>(null);
  const index = active ? tabs.findIndex((t) => t.key === active) : -1;
  const last = useRef(index);

  /* The stretch is a one-off on a change of tab, not a resting state, so it
     is played imperatively rather than held in a class. The slide itself is
     a plain CSS transition on the slot. */
  useLayoutEffect(() => {
    const from = last.current;
    last.current = index;
    if (from < 0 || index < 0 || from === index || !pip.current || reduced()) return;
    const stretch = Math.min(4, 1 + Math.abs(index - from) * 1.2);
    pip.current.animate(
      [
        { transform: "scaleX(1)" },
        { transform: `scaleX(${stretch})`, offset: 0.42 },
        { transform: "scaleX(1)" },
      ],
      { duration: 440, easing: "cubic-bezier(.3,1.15,.45,1)" }
    );
  }, [index]);

  return (
    <nav className="wp-tabbar" aria-label="Sections">
      <span
        className={`wp-tabbar-slot${index < 0 ? " is-hidden" : ""}`}
        style={{ "--i": Math.max(0, index), "--n": tabs.length } as React.CSSProperties}
        aria-hidden="true"
      >
        <span ref={pip} className="wp-tabbar-pip" />
      </span>
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`wp-tabbar-btn${active === t.key ? " is-on" : ""}`}
          onClick={() => {
            setPlayed((p) => ({ key: t.key, n: p.n + 1 }));
            onGo(t.key);
          }}
          aria-current={active === t.key ? "page" : undefined}
        >
          <TabIcon name={t.key} play={played.key === t.key ? played.n : 0} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

/* The same tabs across the top on a wide screen. One underline for the
   whole row that slides to the chosen tab, instead of five that switch on
   and off — the tabs are different widths, so it is measured, not computed. */
export function TopNav({
  tabs,
  active,
  onGo,
}: {
  tabs: Tab[];
  active: TabIconName | null;
  onGo: (k: TabIconName) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  /* the underline only starts sliding once it has been placed, so it lands
     under the first tab on load instead of gliding in from the left edge */
  const [live, setLive] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const el = active ? refs.current[active] : null;
      setBar(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    const frame = requestAnimationFrame(() => setLive(true));
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  return (
    <nav className="wp-nav" aria-label="Sections">
      {tabs.map((t) => (
        <button
          key={t.key}
          ref={(el) => {
            refs.current[t.key] = el;
          }}
          className={`wp-tab${active === t.key ? " is-on" : ""}`}
          onClick={() => onGo(t.key)}
          aria-current={active === t.key ? "page" : undefined}
        >
          {t.label}
        </button>
      ))}
      <span
        className={`wp-nav-bar${bar ? "" : " is-hidden"}${live ? " is-live" : ""}`}
        style={bar ? { transform: `translateX(${bar.x}px)`, width: bar.w } : undefined}
        aria-hidden="true"
      />
    </nav>
  );
}
