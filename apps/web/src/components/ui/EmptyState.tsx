import React from "react";
import { Fractal } from "../Fractal";

export interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  seed?: string;
  className?: string;
}

/**
 * Empty-state illustration with a background fractal, title, hint, and optional action.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  hint,
  action,
  seed = "empty",
  className,
}) => (
  <div
    className={[
      "relative w-full flex flex-col items-center justify-center py-16 px-6 text-center overflow-hidden rounded-card",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {/* mix-blend-mode: screen — dark pixels vanish on light bg, colorful ring glows on dark bg */}
    <div className="absolute inset-0 flex items-center justify-center opacity-50 mix-blend-screen pointer-events-none select-none">
      <Fractal seed={seed} size={160} />
    </div>

    <h3 className="relative font-display font-bold text-[18px] text-[var(--text)] mb-2">
      {title}
    </h3>
    {hint && (
      <p className="relative text-[13px] text-[var(--text-muted)] max-w-sm mb-4">
        {hint}
      </p>
    )}
    {action && <div className="relative">{action}</div>}
  </div>
);
