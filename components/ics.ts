/* ------------------------------------------------------------------
   The Apple Calendar feed, as text.

   Everything is an all-day event: activities carry a day, never a time,
   and that is how they are meant to be read. Dates stay plain
   YYYYMMDD — a floating date, with no zone — so a Thursday in Waypoint is
   a Thursday in Calendar wherever the phone is, the same local-date rule
   the rest of the app keeps.

   An item not yet done carries one alert at 08:00 that morning: an all-day
   event starts at local midnight, so eight hours after its start is eight
   in the morning wherever you are. Done items carry none, and say so with
   a tick in the title, so the calendar reads as a log once the day is over.
   ------------------------------------------------------------------ */

export interface FeedRow {
  kind: "activity" | "waypoint";
  id: string;
  title: string;
  course: string;
  /* YYYY-MM-DD */
  day: string;
  done: boolean;
}

/* RFC 5545 text: backslash, semicolon and comma escaped, newlines as \n. */
export const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/* Lines longer than 75 octets are folded: CRLF plus one space. Counted in
   bytes, not characters — æ, ø and å are two each — and never split inside
   a character. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines lose one to the leading space
    if (size + n > limit) {
      out.push(cur);
      cur = "";
      size = 0;
    }
    cur += ch;
    size += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const compact = (day: string) => day.replace(/-/g, "");

/* The day after, as YYYYMMDD. Built from the calendar date's own parts,
   in UTC, so no zone can move it. */
function nextDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, "0")}${String(t.getUTCDate()).padStart(2, "0")}`;
}

const stamp = (now: Date) => now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/* `alarmsFrom` (YYYY-MM-DD): no alert on anything dated before it. An alert
   for a day already gone can only arrive late or all at once, the moment
   the calendar is first subscribed to. */
export function buildCalendar(rows: FeedRow[], now: Date = new Date(), alarmsFrom = ""): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Waypoint//Calendar feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Waypoint",
    "X-WR-CALDESC:Activities and waypoint deadlines from Waypoint",
    /* a hint, which Calendar weighs against its own schedule */
    "X-PUBLISHED-TTL:PT15M",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
  ];

  for (const r of rows) {
    const mark = r.done ? "✓ " : r.kind === "waypoint" ? "⚑ " : "";
    const summary = `${mark}${r.title}`;
    const description = r.kind === "waypoint" ? `Waypoint on ${r.course}` : r.course;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.kind}-${r.id}@waypoint`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${compact(r.day)}`,
      `DTEND;VALUE=DATE:${nextDay(r.day)}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`,
      /* all-day items should not block the day as busy */
      "TRANSP:TRANSPARENT"
    );
    if (!r.done && r.day >= alarmsFrom) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(summary)}`,
        "TRIGGER;RELATED=START:PT8H",
        "END:VALARM"
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
