"use client";

import React from "react";
import { PixelAvatar } from "./PixelAvatar";

/* ----------------------------------------------------------------
   Упрощённая версия: бывшие фрактальные компоненты теперь рендерят
   детерминированный пиксельный идентикон (PixelAvatar). Имена и пропсы
   сохранены ради обратной совместимости со страницами.
   ---------------------------------------------------------------- */

interface FractalProps {
  seed?: string;
  size?: number;
  className?: string;
  opts?: unknown; // игнорируется (наследие фрактального API)
}

export const Fractal: React.FC<FractalProps> = ({
  seed = "beefurca",
  size = 64,
  className,
}) => {
  return <PixelAvatar seed={seed} size={size} className={className} />;
};

interface FractalMedallionProps {
  seed?: string;
  size?: number;
  shape?: "circle" | "rounded";
  className?: string;
  opts?: unknown;
}

/** Пиксельный аватар в чанковой бевел-рамке PC-98. */
export const FractalMedallion: React.FC<FractalMedallionProps> = ({
  seed = "beefurca",
  size = 64,
  className,
}) => {
  return (
    <span
      className={`panel-98 inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size, padding: 2 }}
    >
      <PixelAvatar seed={seed} size={size - 4} />
    </span>
  );
};
