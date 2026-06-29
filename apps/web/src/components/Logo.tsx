"use client";

import React from "react";

/**
 * Бренд-знак Beefurca — пиксельная турнирная «вилка» (furca = развилка/сетка):
 * четыре участника слева сходятся к чемпиону справа. Чистый crispEdges-SVG,
 * цвета берутся из токенов палитры.
 */
export const BeefurcaMark: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    shapeRendering="crispEdges"
    className={className}
    role="img"
    aria-label="Beefurca"
  >
    <g fill="var(--accent)">
      {/* верхняя пара → верхний полуфинал */}
      <rect x="1" y="3" width="4" height="1" />
      <rect x="1" y="6" width="4" height="1" />
      <rect x="4" y="3" width="1" height="4" />
      <rect x="4" y="4" width="4" height="1" />
      {/* нижняя пара → нижний полуфинал */}
      <rect x="1" y="9" width="4" height="1" />
      <rect x="1" y="12" width="4" height="1" />
      <rect x="4" y="9" width="1" height="4" />
      <rect x="4" y="11" width="4" height="1" />
      {/* центральная ось → финал */}
      <rect x="8" y="4" width="1" height="8" />
      <rect x="8" y="7" width="4" height="1" />
    </g>
    {/* чемпион */}
    <rect x="12" y="6" width="3" height="3" fill="var(--accent-hi)" />
  </svg>
);

interface LogoProps {
  size?: number;
  letter?: boolean; // наследие API, игнорируется
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 34, className }) => (
  <span
    className={`panel-98-sunken inline-flex items-center justify-center ${className ?? ""}`}
    style={{ width: size, height: size, padding: Math.max(2, Math.round(size * 0.12)) }}
  >
    <BeefurcaMark size={Math.round(size * 0.74)} />
  </span>
);
