import { useId, useMemo, useRef, useState } from "react";
import type { EffortPoint, EffortSeries } from "./effort";
import { niceCeil } from "./effort";
import { fmtShort } from "./helpers";

/* A cumulative line — the running total of everything logged, since it never
   has a ceiling to plot against. One series, so no legend box: the card
   title already says what is plotted. Colour is the app's existing accent,
   the same hue the goal meter and every progress bar already carry — a
   trend line is a sequential/single-hue job, and contrast against both
   surfaces checks out (>=3:1) with the validator; the categorical checks
   it also runs (chroma floor, lightness band) are for telling several
   series apart and do not apply to a lone line. */
export function EffortChart({ series, height = 200 }: { series: EffortSeries; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradId = useId();

  const width = 640;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const max = useMemo(() => niceCeil(Math.max(...series.points.map((p) => p.total), 1)), [series]);
  const n = series.points.length;

  const xAt = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;

  const linePath = useMemo(() => {
    if (n === 0) return "";
    return series.points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(p.total)}`).join(" ");
  }, [series, max, n]); // eslint-disable-line react-hooks/exhaustive-deps

  const areaPath = useMemo(() => {
    if (n === 0) return "";
    return `${linePath} L${xAt(n - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`;
  }, [linePath, n]); // eslint-disable-line react-hooks/exhaustive-deps

  const yTicks = [0, max / 2, max].map((v) => Math.round(v));

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
    return (
      <p className="wp-empty">
        Not enough history yet — clear something, reach a waypoint, or log a focus block, and
        it starts climbing.
      </p>
    );
  }

  const shown = hover ?? n - 1;
  const point = series.points[shown];
  const tipLeft = shown / (n - 1) > 0.7;

  return (
    <div className="wp-effort">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="wp-effort-svg"
        role="img"
        aria-label={`Effort score climbing from ${series.points[0].total} to ${series.total} points since ${fmtShort(series.firstDate!)}`}
        tabIndex={0}
        onPointerMove={(e) => move(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((i) => i ?? n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={onKeyDown}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={width - padR} y1={yAt(v)} y2={yAt(v)} className="wp-effort-grid" />
            <text x={padL - 8} y={yAt(v)} className="wp-effort-ytick" textAnchor="end" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path d={linePath} className="wp-effort-line" fill="none" />

        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={padT}
            y2={padT + innerH}
            className="wp-effort-crosshair"
          />
        )}

        <circle cx={xAt(shown)} cy={yAt(point.total)} r="4" className="wp-effort-dot" />

        <text x={xAt(0)} y={height - 6} className="wp-effort-xtick" textAnchor="start">
          {fmtShort(series.points[0].date).toUpperCase()}
        </text>
        <text x={xAt(n - 1)} y={height - 6} className="wp-effort-xtick" textAnchor="end">
          {fmtShort(series.points[n - 1].date).toUpperCase()}
        </text>
      </svg>

      <div
        className={`wp-effort-tip${tipLeft ? " is-left" : ""}`}
        style={{ left: `${(xAt(shown) / width) * 100}%` }}
        aria-hidden="true"
      >
        <span className="wp-effort-tip-val">{point.total} pts</span>
        <span className="wp-mono wp-muted wp-effort-tip-date">{fmtShort(point.date).toUpperCase()}</span>
      </div>

      {/* every value on the line, reachable without hovering */}
      <table className="wp-visually-hidden">
        <caption>Effort score by day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Cumulative points</th>
          </tr>
        </thead>
        <tbody>
          {series.points.map((p: EffortPoint) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
