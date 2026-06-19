"use client";

import React from "react";
import { useFractal } from "../lib/fractalClient";
import type { FractalOpts } from "../lib/fractal";

/* ----------------------------------------------------------------
   <Fractal> — renders a fractal as an <img> with lazy loading
   ---------------------------------------------------------------- */

interface FractalProps {
  seed?: string;
  size?: number;
  className?: string;
  opts?: Omit<FractalOpts, "seed">;
}

/** Max raster size for performance; CSS scales up beyond this. */
const MAX_RASTER = 160;

export const Fractal: React.FC<FractalProps> = ({
  seed = "beefurca",
  size = 64,
  className,
  opts,
}) => {
  const rasterSize = Math.min(size, MAX_RASTER);
  const mergedOpts: FractalOpts = { seed, ...opts };
  const { ref, dataUrl } = useFractal(mergedOpts, rasterSize);

  return (
    <span
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "inherit",
        overflow: "hidden",
      }}
    >
      {dataUrl ? (
        <img
          alt=""
          src={dataUrl}
          width={size}
          height={size}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      ) : (
        <span
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            background: "var(--panel-sunken)",
            borderRadius: "inherit",
          }}
        />
      )}
    </span>
  );
};

/* ----------------------------------------------------------------
   <FractalMedallion> — gel-lens wrapper around <Fractal>
   ---------------------------------------------------------------- */

interface FractalMedallionProps {
  seed?: string;
  size?: number;
  shape?: "circle" | "rounded";
  className?: string;
  opts?: Omit<FractalOpts, "seed">;
}

export const FractalMedallion: React.FC<FractalMedallionProps> = ({
  seed = "beefurca",
  size = 64,
  shape = "circle",
  className,
  opts,
}) => {
  const medallionClass =
    shape === "rounded"
      ? `medallion medallion-rounded ${className ?? ""}`
      : `medallion ${className ?? ""}`;

  return (
    <span className={medallionClass} style={{ width: size, height: size }}>
      <Fractal seed={seed} size={size} opts={opts} />
    </span>
  );
};
