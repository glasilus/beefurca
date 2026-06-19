import React, { useMemo } from "react";

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
      <div className="flex items-center justify-center border border-obsidian-border bg-obsidian-panel/30 h-[200px] rounded p-6">
        <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">
          Нет записей ELO рейтинга
        </span>
      </div>
    );
  }

  const { coordinates, pathD, areaD } = chartData;

  return (
    <div className="w-full component-card-dark p-6">
      <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-completeGrad-mid animate-ping" />
        Динамика изменения рейтинга ELO
      </h4>

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

          {/* Area Fill Gradient */}
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#004BFF" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1="40" y1={height - 30} x2={width - 40} y2={height - 30} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="40" y1="30" x2={width - 40} y2="30" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />

        {/* Area Gradient Fill */}
        {areaD && <path d={areaD} fill="url(#area-grad)" />}

        {/* ELO Trend Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#line-glow)"
          />
        )}

        {/* Point Dots */}
        {coordinates.map((pt, idx) => (
          <g key={idx} className="group cursor-pointer">
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="#FFFFFF"
              stroke="#004BFF"
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
                fill="#11161B"
                stroke="#1B232D"
                strokeWidth="1"
              />
              <text
                x={pt.x}
                y={pt.y - 28}
                fill="#FFFFFF"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                {pt.elo} ELO
              </text>
              <text
                x={pt.x}
                y={pt.y - 15}
                fill="#64748B"
                fontSize="6"
                fontFamily="sans-serif"
                textAnchor="middle"
              >
                {pt.label.length > 20 ? `${pt.label.slice(0, 18)}...` : pt.label}
              </text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
};
