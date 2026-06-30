"use client";

import React from "react";

/**
 * PixelAvatar - детерминированный пиксельный идентикон вместо фрактального аватара.
 * Из хеша строки (ник) генерируется симметричная 5×5 сетка в одном из цветов
 * палитры на тёмном фоне с дизер-точками. Без canvas/worker - чистый инлайн-SVG.
 */

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Приглушённая палитра в духе PC-98.
const PALETTE = [
  "#e0865a", // амбер-коралл
  "#f2c14e", // амбер
  "#6fb3c0", // циан
  "#8fbf6f", // зелёный
  "#b88fd9", // лиловый
  "#d96c6c", // красный
  "#5a86e0", // синий
];

export function PixelAvatar({
  seed,
  size = 48,
  className = "",
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  const h = hashString(seed || "?");
  const fg = PALETTE[h % PALETTE.length];

  // Линейный конгруэнтный генератор, засеянный хешем - детерминированная сетка.
  let rnd = h;
  const nextBit = () => {
    rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0;
    return (rnd >>> 16) & 1;
  };

  const grid = 5;
  const half = Math.ceil(grid / 2); // 3 левых столбца, остальные - зеркало
  const left: number[][] = [];
  for (let y = 0; y < grid; y++) {
    left[y] = [];
    for (let x = 0; x < half; x++) left[y][x] = nextBit();
  }

  const rects: React.ReactElement[] = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const sx = x < half ? x : grid - 1 - x;
      if (left[y][sx]) {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fg} />);
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: "pixelated", backgroundColor: "var(--panel-sunken)" }}
      role="img"
      aria-label={`Аватар ${seed}`}
    >
      {rects}
    </svg>
  );
}
