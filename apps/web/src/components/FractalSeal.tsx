import React from "react";

interface FractalSealProps {
  hash: string; // The SHA/UUID signature of the match completion transaction
  size?: number;
}

/**
 * Referee Seal component (Судейская пломба).
 * Displays a spinning, glowing vector mandala representing a cryptographically
 * verified match result transaction.
 */
export const FractalSeal: React.FC<FractalSealProps> = ({ hash, size = 120 }) => {
  // Generate deterministic rotation and color from transaction hash
  const rotAngle = hash ? hash.charCodeAt(hash.length - 1) * 3 : 45;
  const isAltColor = hash ? hash.charCodeAt(0) % 2 === 0 : false;

  const sealColorClass = isAltColor 
    ? "stroke-completeGrad-mid" 
    : "stroke-activeGrad-start";

  const glowColor = isAltColor ? "#00E5FF" : "#FF1F44";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow shadow backdrop */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse"
        style={{ backgroundColor: glowColor }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        className="relative transform animate-spin"
        style={{ animationDuration: "12s" }}
      >
        <defs>
          <filter id="seal-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          className={sealColorClass}
          strokeWidth="1.5"
          strokeDasharray="4, 4"
          filter="url(#seal-glow)"
        />

        {/* Inner Octagram */}
        <polygon
          points="50,15 62,38 85,38 73,61 75,85 50,73 25,85 27,61 15,38 38,38"
          fill="none"
          className="stroke-completeGrad-start"
          strokeWidth="1"
          transform={`rotate(${rotAngle} 50 50)`}
          filter="url(#seal-glow)"
        />

        {/* Rotating gear spikes */}
        <g transform={`rotate(${-rotAngle * 1.5} 50 50)`}>
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="5"
              x2="50"
              y2="10"
              className={sealColorClass}
              strokeWidth="2"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        </g>

        {/* Inner core grid */}
        <circle
          cx="50"
          cy="50"
          r="25"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="0.8"
        />

        {/* Checkmark in center */}
        <path
          d="M40,51 L47,58 L60,42"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#seal-glow)"
        />
      </svg>
      
      {/* Static text seal info */}
      <span className="absolute bottom-[-24px] text-[9px] font-mono tracking-widest text-text-muted opacity-80 uppercase">
        VERIFIED {hash ? hash.slice(0, 8) : "00000000"}
      </span>
    </div>
  );
};
