import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Draw } from '../draws/aggregator';
import { fmt, formatDate } from './format';

const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
const HEIGHT = 240;

/** CRS cutoff over time for one draw category, with the candidate's score as a reference line. */
export function TrendChart({ draws, score, label }: { draws: Draw[]; score: number | null; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo(() => [...draws].reverse(), [draws]); // oldest → newest
  const { x, y, ticks } = useMemo(() => {
    const times = points.map((d) => Date.parse(d.date));
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const values = points.map((d) => d.crs).concat(score != null && score <= 900 ? [score] : []);
    let lo = Math.floor((Math.min(...values) - 15) / 25) * 25;
    let hi = Math.ceil((Math.max(...values) + 15) / 25) * 25;
    if (hi - lo < 50) { lo -= 25; hi += 25; }
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const step = Math.max(25, Math.ceil((hi - lo) / 5 / 25) * 25);
    const ticks: number[] = [];
    for (let v = lo; v <= hi; v += step) ticks.push(v);
    return {
      x: (iso: string) => PAD.left + (t1 === t0 ? innerW / 2 : ((Date.parse(iso) - t0) / (t1 - t0)) * innerW),
      y: (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH,
      ticks,
    };
  }, [points, score, width]);

  if (!points.length) return null;

  const path = points.map((d, i) => `${i ? 'L' : 'M'}${x(d.date).toFixed(1)},${y(d.crs).toFixed(1)}`).join('');
  const showScore = score != null && score >= ticks[0] && score <= ticks[ticks.length - 1];
  const years = [...new Set(points.map((d) => d.date.slice(0, 4)))];
  const active = hover != null ? points[hover] : null;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left + PAD.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((d, i) => {
      const dist = Math.abs(x(d.date) - px);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    setHover(best);
  };

  return (
    <div className="chart" ref={wrap}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${label}: CRS cutoff for ${points.length} draws, latest ${points[points.length - 1].crs}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
            <text x={PAD.left - 8} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">{t}</text>
          </g>
        ))}
        {years.map((yr) => {
          const first = points.find((d) => d.date.startsWith(yr))!;
          const px = x(first.date);
          return (
            <text key={yr} x={px} y={HEIGHT - 8} className="axis" textAnchor={px < PAD.left + 20 ? 'start' : 'middle'}>
              {yr}
            </text>
          );
        })}
        {showScore && (
          <g className="you-line">
            <line x1={PAD.left} x2={width - PAD.right} y1={y(score!)} y2={y(score!)} />
            <text x={width - PAD.right} y={y(score!) - 6} textAnchor="end">You · {score}</text>
          </g>
        )}
        <path d={path} className="series" fill="none" />
        {points.length <= 60 &&
          points.map((d, i) => (
            <circle key={d.number} cx={x(d.date)} cy={y(d.crs)} r={i === hover ? 5 : 3} className="dot" />
          ))}
        {active && (
          <g>
            <line x1={x(active.date)} x2={x(active.date)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="crosshair" />
            <circle cx={x(active.date)} cy={y(active.crs)} r={5} className="dot active" />
          </g>
        )}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={Math.max(0, width - PAD.left - PAD.right)}
          height={HEIGHT - PAD.top - PAD.bottom}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {active && (
        <div
          className="tooltip"
          style={{
            left: Math.min(Math.max(x(active.date), 80), width - 80),
            top: Math.max(0, y(active.crs) - 72),
          }}
        >
          <strong>{active.crs}</strong>
          <span>{formatDate(active.date)} · #{active.number}</span>
          <span>{fmt(active.size)} invited</span>
        </div>
      )}
    </div>
  );
}
