import { useEffect, useState } from "react";
import { msUntilMidnight, todayKey } from "./helpers";

/* The day key, kept honest while the app sits open.
   Computing it once per render is fine for a page you reload daily, but this
   app is meant to stay open — without this, a window left running overnight
   still shows yesterday's list in the morning. We re-arm a timeout for each
   midnight, and also re-check whenever the window regains focus, because a
   sleeping machine does not fire pending timeouts on schedule. */
export function useToday() {
  const [today, setToday] = useState(todayKey);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const sync = () => setToday((prev) => {
      const now = todayKey();
      return now === prev ? prev : now;
    });

    const arm = () => {
      clearTimeout(timeout);
      /* a second of slack so the timeout never lands just shy of midnight */
      timeout = setTimeout(() => {
        sync();
        arm();
      }, msUntilMidnight() + 1000);
    };

    const onWake = () => {
      sync();
      arm();
    };

    arm();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  return today;
}

/* Anything that reads the clock rather than the calendar goes stale the same
   way: the greeting, and the Sunday-at-nine review moment. A minute tick is
   cheap and keeps both honest, and we re-check on wake too, because a laptop
   that slept through nine o'clock fires no intervals in the meantime. */
export function useMinuteTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const id = setInterval(bump, 60_000);
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
    };
  }, []);
  return tick;
}
