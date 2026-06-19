import React, { useMemo } from "react";
import { Window } from "./ui/Window";

interface EloHistoryItem {
  oldElo: number;
  newElo: number;
  recordedAt: string;
  tournamentName: string;
}

interface EloChartProps {
  history: EloHistoryItem[];
  width?: number;
  height?: number;
}

/**
 * Procedural SVG Line Chart for ELO History.
 * Renders a glowing, animated line chart with fill gradients.
 * Colors: accent line, done dots, hairline grid.
 */
export const EloChart: React.FC<EloChartProps> = ({ history, width = 600, height = 250 }) => {
  const chartData = useMemo(() => {
    if (history.length === 0) return null;

    // Map history to sequential points
    // Let's include the starting ELO of 1000 if not empty
    const pointsList = [1000, ...history.map((h) => h.newElo)];
    const labels = ["Регистрация", ...history.map((h) => h.tournamentName)];

    const minElo = Math.min(...pointsList) - 50;
    const maxElo = Math.max(...pointsList) + 50;
    const eloRange = maxElo - minElo;

    const paddingX = 40;
    const paddingY = 30;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const coordinates = pointsList.map((elo, index) => {
      const x = paddingX + (index / (pointsList.length - 1 || 1)) * chartWidth;
      // SVG Y is inverted
      const y = paddingY + chartHeight - ((elo - minElo) / eloRange) * chartHeight;
      return { x, y, elo, label: labels[index] };
    });

    // Build SVG Path string
    let pathD = "";
    if (coordinates.length > 0) {
      pathD = `M ${coordinates[0].x} ${coordinates[0].y}`;
      for (let i = 1; i < coordinates.length; i++) {
        pathD += ` L ${coordinates[i].x} ${coordinates[i].y}`;
      }
    }

    // Build Area Path string for gradient fill below line
    let areaD = "";
    if (coordinates.length > 0) {
      areaD = `${pathD} L ${coordinates[coordinates.length - 1].x} ${height - paddingY} L ${coordinates[0].x} ${height - paddingY} Z`;
    }

    return { coordinates, pathD, areaD, minElo, maxElo };
  }, [history, width, height]);

  if (!chartData) {
    return (
      <Window title="Динамика ELO">
        <div className="flex items-center justify-center h-[200px]">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-mono">
            Нет записей ELO рейтинга
          </span>
        </div>
      </Window>
    );
  }

  const { coordinates, pathD, areaD } = chartData;

  return (
    <Window title="Динамика ELO" status="done">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[var(--status-done)] animate-ping motion-reduce:animate-none" />
        <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Динамика изменения рейтинга ELO</span>
      </div>

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          {/* Glowing Line filter */}
          <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Area Fill Gradient — accent tokens */}
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-lo)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines — hairline token */}
        <line x1="40" y1={height - 30} x2={width - 40} y2={height - 30} stroke="var(--hairline)" strokeWidth="1" />
        <line x1="40" y1="30" x2={width - 40} y2="30" stroke="var(--hairline)" strokeWidth="0.5" />

        {/* Area Gradient Fill */}
        {areaD && <path d={areaD} fill="url(#area-grad)" />}

        {/* ELO Trend Line — accent token */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#line-glow)"
          />
        )}

        {/* Point Dots — done token */}
        {coordinates.map((pt, idx) => (
          <g key={idx} className="group cursor-pointer">
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="var(--panel)"
              stroke="var(--status-done)"
              strokeWidth="2"
            />
            {/* Tooltip on hover */}
            <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <rect
                x={pt.x - 60}
                y={pt.y - 40}
                width="120"
                height="32"
                rx="4"
                fill="var(--panel)"
                stroke="var(--hairline)"
                strokeWidth="1"
              />
              <text
                x={pt.x}
                y={pt.y - 28}
                fill="var(--text)"
                fontSize="8"
                fontFamily="var(--font-mono), monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                {pt.elo} ELO
              </text>
              <text
                x={pt.x}
                y={pt.y - 15}
                fill="var(--text-muted)"
                fontSize="6"
                fontFamily="var(--font-sans), sans-serif"
                textAnchor="middle"
              >
                {pt.label.length > 20 ? `${pt.label.slice(0, 18)}...` : pt.label}
              </text>
            </g>
          </g>
        ))}
      </svg>
    </Window>
  );
};
