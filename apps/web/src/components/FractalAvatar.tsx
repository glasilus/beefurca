import React, { useMemo } from "react";

interface FractalAvatarProps {
  seed: string; // The UUID string from postgres
  size?: number;
}

/**
 * Procedural Fractal Avatar Generator.
 * Transforms a seed (UUID) into a unique, mathematical, vector geometric pattern
 * using simplified Julia Set iterations.
 */
export const FractalAvatar: React.FC<FractalAvatarProps> = ({ seed, size = 64 }) => {
  const svgContent = useMemo(() => {
    // Generate numeric hash from UUID
    let hash = 0;
    const cleanSeed = seed || "default_seed";
    for (let i = 0; i < cleanSeed.length; i++) {
      hash = cleanSeed.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Derive Julia Set parameters c_real and c_imag from hash
    const cr = -0.7 + (Math.abs(hash % 100) / 100) * 0.3; // -0.7 to -0.4
    const ci = 0.27015 + (Math.abs((hash >> 4) % 100) / 100) * 0.1; // 0.27 to 0.37

    const points: { x: number; y: number; r: number; color: string }[] = [];
    const colors = [
      "stroke-activeGrad-start",
      "stroke-activeGrad-mid",
      "stroke-activeGrad-end",
      "stroke-completeGrad-start",
      "stroke-completeGrad-mid",
    ];

    // Compute 8 points using Julia sequence: z = z^2 + c
    // We start with 8 initial angles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      let zr = Math.cos(angle) * 0.8;
      let zi = Math.sin(angle) * 0.8;

      for (let step = 0; step < 4; step++) {
        // z^2 = (zr^2 - zi^2) + 2*zr*zi * i
        const nextZr = zr * zr - zi * zi + cr;
        const nextZi = 2 * zr * zi + ci;

        zr = nextZr;
        zi = nextZi;

        // Map to SVG coordinate space (-1..1 -> 10..90)
        const x = 50 + zr * 40;
        const y = 50 + zi * 40;
        const r = 2 + step * 4;

        // Pick color deterministically
        const colorIdx = Math.abs((hash + step + i) % colors.length);

        points.push({
          x,
          y,
          r,
          color: colors[colorIdx],
        });
      }
    }

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="bg-obsidian-panel rounded border border-obsidian-border"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Procedural background lines */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />

        {/* Generated fractal shapes */}
        {points.map((p, index) => (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill="none"
            className={`${p.color} opacity-80`}
            strokeWidth="1.2"
            filter="url(#glow)"
          />
        ))}

        {/* Central core */}
        <circle cx="50" cy="50" r="3" className="fill-activeGrad-start animate-pulse" />
      </svg>
    );
  }, [seed, size]);

  return svgContent;
};
