"use client";

import React from "react";
import { Fractal } from "./Fractal";

interface FractalSealProps {
  hash: string;
  size?: number;
}

/**
 * Referee Seal (Sudeyskaya plomba).
 * Fractal center with concentric status-colored rings.
 * Spin animation respects prefers-reduced-motion via CSS.
 */
export const FractalSeal: React.FC<FractalSealProps> = ({
  hash,
  size = 120,
}) => {
  const rotAngle = hash ? hash.charCodeAt(hash.length - 1) * 3 : 45;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow halo -- accent / done */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl motion-safe:animate-pulse"
        style={{ backgroundColor: "var(--status-done)" }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        className="relative motion-safe:animate-spin"
        style={{ animationDuration: "12s" }}
      >
        <defs>
          <filter
            id={`seal-glow-${hash?.slice(0, 6)}`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
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
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="4, 4"
          filter={`url(#seal-glow-${hash?.slice(0, 6)})`}
        />

        {/* Inner Octagram */}
        <polygon
          points="50,15 62,38 85,38 73,61 75,85 50,73 25,85 27,61 15,38 38,38"
          fill="none"
          stroke="var(--status-done)"
          strokeWidth="1"
          transform={`rotate(${rotAngle} 50 50)`}
          filter={`url(#seal-glow-${hash?.slice(0, 6)})`}
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
              stroke="var(--accent)"
              strokeWidth="2"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        </g>

        {/* Inner core ring */}
        <circle
          cx="50"
          cy="50"
          r="25"
          fill="none"
          stroke="var(--hairline)"
          strokeWidth="0.8"
        />

        {/* Checkmark in center */}
        <path
          d="M40,51 L47,58 L60,42"
          fill="none"
          stroke="var(--text)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#seal-glow-${hash?.slice(0, 6)})`}
        />
      </svg>

      {/* Fractal center overlay */}
      <span
        className="absolute"
        style={{
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: "50%",
          overflow: "hidden",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Fractal seed={hash || "seal"} size={Math.round(size * 0.38)} />
      </span>

      {/* Static text seal info */}
      <span className="absolute bottom-[-24px] text-[9px] font-mono tracking-widest text-text-muted opacity-80 uppercase">
        VERIFIED {hash ? hash.slice(0, 8) : "00000000"}
      </span>
    </div>
  );
};
