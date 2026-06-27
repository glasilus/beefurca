"use client";

import React, { useMemo } from "react";
import { Window } from "./ui/Window";

interface DisciplineStat {
  disciplineId: string;
  disciplineName: string;
  matchesCount: number;
  winsCount: number;
  eloDelta: number;
}

interface StatsChartsProps {
  disciplineStats: DisciplineStat[];
}

/* ----------------------------------------------------------------
   Polar/Spider chart for discipline win rates
   ---------------------------------------------------------------- */
function RadarChart({ stats }: { stats: DisciplineStat[] }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const n = stats.length;

  const points = stats.map((s, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const wr = s.matchesCount > 0 ? s.winsCount / s.matchesCount : 0;
    return {
      x: cx + r * wr * Math.cos(angle),
      y: cy + r * wr * Math.sin(angle),
      lx: cx + (r + 22) * Math.cos(angle),
      ly: cy + (r + 22) * Math.sin(angle),
      gx: cx + r * Math.cos(angle),
      gy: cy + r * Math.sin(angle),
      label: s.disciplineName,
      wr,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const outerRing = points.map((p) => `${p.gx},${p.gy}`).join(" ");

  // Grid rings at 25%, 50%, 75%, 100%
  const gridRings = [0.25, 0.5, 0.75, 1.0].map((frac) =>
    stats.map((_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return `${cx + r * frac * Math.cos(angle)},${cy + r * frac * Math.sin(angle)}`;
    }).join(" ")
  );

  if (n === 0) return null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible mx-auto">
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent-lo)" stopOpacity="0.12" />
        </radialGradient>
      </defs>

      {/* Grid rings */}
      {gridRings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="var(--hairline)" strokeWidth="1" />
      ))}

      {/* Spoke lines */}
      {points.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.gx} y2={p.gy} stroke="var(--hairline)" strokeWidth="1" />
      ))}

      {/* Outer reference polygon */}
      <polygon points={outerRing} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />

      {/* Data polygon */}
      {n >= 3 && (
        <>
          <polygon points={polygon} fill="url(#radar-fill)" stroke="var(--accent)" strokeWidth="1.5" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--panel)" stroke="var(--accent)" strokeWidth="1.5" />
          ))}
        </>
      )}
      {n < 3 && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--accent)" opacity="0.7" />
      ))}

      {/* Labels */}
      {points.map((p, i) => {
        const ta = Math.abs(p.lx - cx) < 8 ? "middle" : p.lx > cx ? "start" : "end";
        const wr = Math.round(p.wr * 100);
        return (
          <g key={i}>
            <text
              x={p.lx}
              y={p.ly - 4}
              textAnchor={ta}
              fontSize="7"
              fontFamily="var(--font-cond), sans-serif"
              fill="var(--text-muted)"
              fontWeight="600"
            >
              {p.label.length > 12 ? p.label.slice(0, 10) + "…" : p.label}
            </text>
            <text
              x={p.lx}
              y={p.ly + 6}
              textAnchor={ta}
              fontSize="8"
              fontFamily="var(--font-mono), monospace"
              fill="var(--accent)"
              fontWeight="600"
            >
              {wr}%
            </text>
          </g>
        );
      })}

      {/* Center label */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fontFamily="var(--font-cond)" fill="var(--text-muted)" fontWeight="600">WR</text>
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--text-muted)">RADAR</text>
    </svg>
  );
}

/* ----------------------------------------------------------------
   Horizontal ELO bar chart per discipline
   ---------------------------------------------------------------- */
function EloBarChart({ stats }: { stats: DisciplineStat[] }) {
  const bars = stats.map((s) => ({
    name: s.disciplineName,
    elo: 1000 + s.eloDelta,
    delta: s.eloDelta,
  }));

  const maxElo = Math.max(...bars.map((b) => b.elo), 1100);
  const minElo = Math.min(...bars.map((b) => b.elo), 900);
  const base = Math.min(minElo - 50, 950);
  const range = maxElo - base + 50;

  const barH = 22;
  const gap = 8;
  const labelW = 100;
  const chartW = 220;
  const totalH = bars.length * (barH + gap);

  if (bars.length === 0) return null;

  return (
    <svg width={labelW + chartW + 60} height={totalH + 10} viewBox={`0 0 ${labelW + chartW + 60} ${totalH + 10}`} className="overflow-visible mx-auto max-w-full">
      <defs>
        <linearGradient id="bar-grad-pos" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent-hi)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id="bar-grad-neg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--status-danger)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--status-danger)" />
        </linearGradient>
      </defs>

      {bars.map((b, i) => {
        const y = i * (barH + gap) + 4;
        const eloW = ((b.elo - base) / range) * chartW;
        const isPos = b.delta >= 0;
        return (
          <g key={i}>
            {/* Label */}
            <text
              x={labelW - 6}
              y={y + barH / 2 + 4}
              textAnchor="end"
              fontSize="8"
              fontFamily="var(--font-cond), sans-serif"
              fill="var(--text-muted)"
              fontWeight="600"
            >
              {b.name.length > 12 ? b.name.slice(0, 11) + "…" : b.name}
            </text>

            {/* Bar bg */}
            <rect x={labelW} y={y} width={chartW} height={barH} rx="4" fill="var(--panel-sunken)" />

            {/* Bar fill */}
            <rect
              x={labelW}
              y={y}
              width={Math.max(eloW, 4)}
              height={barH}
              rx="4"
              fill={isPos ? "url(#bar-grad-pos)" : "url(#bar-grad-neg)"}
              opacity="0.85"
            />

            {/* ELO value */}
            <text
              x={labelW + eloW + 5}
              y={y + barH / 2 + 4}
              fontSize="9"
              fontFamily="var(--font-mono), monospace"
              fill={isPos ? "var(--accent)" : "var(--status-danger)"}
              fontWeight="600"
            >
              {b.elo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ----------------------------------------------------------------
   Match outcomes rose (win/loss donut segments per discipline)
   ---------------------------------------------------------------- */
function MatchRose({ stats }: { stats: DisciplineStat[] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 42;

  const total = stats.reduce((a, s) => a + s.matchesCount, 0);
  // With 0 or 1 discipline an arc spanning 2π has coincident start/end points
  // and is dropped by SVG — render a simple fallback instead.
  if (total === 0 || stats.length === 0) return null;
  if (stats.length === 1) {
    const s = stats[0];
    const wr = s.matchesCount > 0 ? Math.round((s.winsCount / s.matchesCount) * 100) : 0;
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-3xl font-mono font-bold text-[var(--text)]">{s.matchesCount}</div>
        <div className="text-[10px] font-cond uppercase text-[var(--text-muted)]">матчей</div>
        <div className="text-xl font-mono font-bold text-[var(--status-win)]">{wr}%</div>
        <div className="text-[10px] font-cond uppercase text-[var(--text-muted)]">винрейт</div>
      </div>
    );
  }

  const COLORS = [
    "var(--accent)",
    "var(--status-done)",
    "var(--status-win)",
    "var(--status-live)",
    "var(--accent-hi)",
    "var(--accent-lo)",
  ];

  let curAngle = -Math.PI / 2;
  const segments = stats.map((s, i) => {
    const slice = (s.matchesCount / total) * 2 * Math.PI;
    const winFrac = s.matchesCount > 0 ? s.winsCount / s.matchesCount : 0;
    const r = innerR + (outerR - innerR) * winFrac;
    const startA = curAngle;
    curAngle += slice;
    const endA = curAngle;
    const color = COLORS[i % COLORS.length];

    const x1o = cx + outerR * Math.cos(startA);
    const y1o = cy + outerR * Math.sin(startA);
    const x2o = cx + outerR * Math.cos(endA);
    const y2o = cy + outerR * Math.sin(endA);
    const x1i = cx + innerR * Math.cos(startA);
    const y1i = cy + innerR * Math.sin(startA);
    const x2i = cx + innerR * Math.cos(endA);
    const y2i = cy + innerR * Math.sin(endA);

    const xWo = cx + r * Math.cos(startA);
    const yWo = cy + r * Math.sin(startA);
    const xW2o = cx + r * Math.cos(endA);
    const yW2o = cy + r * Math.sin(endA);

    const large = slice > Math.PI ? 1 : 0;

    const path = [
      `M ${x1i} ${y1i}`,
      `L ${xWo} ${yWo}`,
      `A ${r} ${r} 0 ${large} 1 ${xW2o} ${yW2o}`,
      `L ${x2i} ${y2i}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${x1i} ${y1i}`,
      "Z",
    ].join(" ");

    const midA = startA + slice / 2;
    const lx = cx + (outerR + 12) * Math.cos(midA);
    const ly = cy + (outerR + 12) * Math.sin(midA);

    return { path, color, label: s.disciplineName, lx, ly, midA, slice };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible mx-auto">
      {segments.map((seg, i) => (
        <path key={i} d={seg.path} fill={seg.color} opacity="0.82" stroke="var(--panel)" strokeWidth="1.5" />
      ))}
      {/* Center stats */}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="14" fontFamily="var(--font-mono)" fill="var(--text)" fontWeight="600">
        {total}
      </text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fontFamily="var(--font-cond)" fill="var(--text-muted)" fontWeight="600">
        МАТЧЕЙ
      </text>
    </svg>
  );
}

/* ----------------------------------------------------------------
   Main export
   ---------------------------------------------------------------- */
export const StatsCharts: React.FC<StatsChartsProps> = ({ disciplineStats }) => {
  const hasData = disciplineStats.length > 0;
  const hasTwoPlus = disciplineStats.length >= 2;

  const avgElo = useMemo(() => {
    if (disciplineStats.length === 0) return null;
    const sum = disciplineStats.reduce((a, s) => a + 1000 + s.eloDelta, 0);
    return Math.round(sum / disciplineStats.length);
  }, [disciplineStats]);

  if (!hasData) return null;

  return (
    <Window title="Аналитика" status="done">
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">
          Визуальная аналитика по дисциплинам
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Radar winrate */}
        {hasTwoPlus && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-cond font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Винрейт по дисциплинам
            </span>
            <RadarChart stats={disciplineStats} />
          </div>
        )}

        {/* Розетка матчей */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-cond font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Распределение матчей
          </span>
          <MatchRose stats={disciplineStats} />
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
            {disciplineStats.map((s, i) => {
              const COLORS = ["var(--accent)", "var(--status-done)", "var(--status-win)", "var(--status-live)", "var(--accent-hi)", "var(--accent-lo)"];
              return (
                <div key={i} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[9px] text-[var(--text-muted)] font-cond">
                    {s.disciplineName.length > 10 ? s.disciplineName.slice(0, 9) + "…" : s.disciplineName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ELO bar */}
        <div className="flex flex-col items-center gap-2 sm:col-span-2 lg:col-span-1">
          <span className="text-[10px] font-cond font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            ELO по дисциплинам
          </span>
          <EloBarChart stats={disciplineStats} />
          {avgElo && (
            <div className="text-center mt-1">
              <span className="text-[9px] text-[var(--text-muted)] font-cond uppercase">Среднее ELO</span>
              <div className="text-base font-mono font-bold text-[var(--status-done)]">{avgElo}</div>
            </div>
          )}
        </div>
      </div>
    </Window>
  );
};
