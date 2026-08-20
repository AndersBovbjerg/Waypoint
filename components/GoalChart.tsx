import { useId, useMemo, useRef, useState } from "react";
import type { Goal, GoalEntry } from "./types";
import { formatGoalValue } from "./goal";
import { fmtShort } from "./helpers";

/* One series (the readings, anchored at the goal's starting value on the day
   the project was created) plus a dashed reference line for the target —
   same interaction model as EffortChart, but the y-axis isn't zero-based:
   a race time or a revenue goal both live in a narrow band nowhere near 0,
   so the domain is fit to the data (and the target) instead. */
export function GoalChart({
  goal,
  entries,
  createdDate,
  color,
  height = 200,
}: {
  goal: Goal;
  entries: GoalEntry[];
  createdDate: string;
  color: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradId = useId();

  const width = 640;
  const padL = 46;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const points = useMemo(() => {
    const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const withoutOpeningDupe = sorted.filter((e) => e.date !== createdDate);
    return [{ date: createdDate, value: goal.start }, ...withoutOpeningDupe];
  }, [entries, createdDate, goal.start]);

  const n = points.length;

  const values = points.map((p) => p.value).concat(goal.target);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.12;
  const max = rawMax + span * 0.12;

  const xAt = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

  const linePath = useMemo(() => {
    if (n === 0) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(p.value)}`).join(" ");
  }, [points, min, max, n]); // eslint-disable-line react-hooks/exhaustive-deps

  const areaPath = useMemo(() => {
    if (n === 0) return "";
    return `${linePath} L${xAt(n - 1)},${yAt(min)} L${xAt(0)},${yAt(min)} Z`;
  }, [linePath, n, min]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * width;
    const frac = n <= 1 ? 0 : (x - padL) / innerW;
    const i = Math.round(Math.min(1, Math.max(0, frac)) * (n - 1));
    setHover(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (n === 0) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHover((i) => Math.max(0, (i ?? n - 1) - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setHover((i) => Math.min(n - 1, (i ?? -1) + 1));
    } else if (e.key === "Escape") {
      setHover(null);
    }
  };

  if (n < 2) {
    return <p className="wp-empty">Log a reading to start seeing it move.</p>;
  }

  const shown = hover ?? n - 1;
  const point = points[shown];
  const tipLeft = shown / (n - 1) > 0.7;

  return (
    <div className="wp-effort">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="wp-effort-svg"
        role="img"
        aria-label={`${goal.label} at ${formatGoalValue(points[n - 1].value, goal.unit)}, started at ${formatGoalValue(
          goal.start,
          goal.unit
        )}, target ${formatGoalValue(goal.target, goal.unit)}`}
        tabIndex={0}
        onPointerMove={(e) => move(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((i) => i ?? n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={onKeyDown}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line x1={padL} x2={width - padR} y1={yAt(v)} y2={yAt(v)} className="wp-effort-grid" />
            <text x={padL - 8} y={yAt(v)} className="wp-effort-ytick" textAnchor="end" dominantBaseline="middle">
              {formatGoalValue(v, goal.unit)}
            </text>
          </g>
        ))}

        <line
          x1={padL}
          x2={width - padR}
          y1={yAt(goal.target)}
          y2={yAt(goal.target)}
          className="wp-goalchart-target"
        />

        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path d={linePath} className="wp-effort-line" stroke={color} fill="none" />

        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={padT}
            y2={padT + innerH}
            className="wp-effort-crosshair"
          />
        )}

        <circle cx={xAt(shown)} cy={yAt(point.value)} r="4" className="wp-effort-dot" style={{ fill: color }} />

        <text x={xAt(0)} y={height - 6} className="wp-effort-xtick" textAnchor="start">
          {fmtShort(points[0].date).toUpperCase()}
        </text>
        <text x={xAt(n - 1)} y={height - 6} className="wp-effort-xtick" textAnchor="end">
          {fmtShort(points[n - 1].date).toUpperCase()}
        </text>
      </svg>

      <div
        className={`wp-effort-tip${tipLeft ? " is-left" : ""}`}
        style={{ left: `${(xAt(shown) / width) * 100}%` }}
        aria-hidden="true"
      >
        <span className="wp-effort-tip-val">{formatGoalValue(point.value, goal.unit)}</span>
        <span className="wp-mono wp-muted wp-effort-tip-date">{fmtShort(point.date).toUpperCase()}</span>
      </div>

      <table className="wp-visually-hidden">
        <caption>{goal.label} by day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{formatGoalValue(p.value, goal.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
