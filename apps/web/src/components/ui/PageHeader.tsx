import React from "react";

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header - title in font-display, optional eyebrow + actions slot.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  eyebrow,
  actions,
  className,
}) => (
  <div
    className={[
      "flex flex-wrap items-start justify-between gap-4 mb-6",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <div>
      {eyebrow && (
        <span className="block font-cond uppercase tracking-[.14em] text-[12px] text-[var(--accent)] font-semibold mb-1">
          {eyebrow}
        </span>
      )}
      <h1 className="font-display font-bold text-[clamp(22px,4vw,32px)] text-[var(--text)] leading-tight">
        {title}
      </h1>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
