"use client";

import React from "react";

/* ----------------------------------------------------------------
   Traffic-light dots — the matching one lights per status
   ---------------------------------------------------------------- */
type WindowStatus = "live" | "done" | "draft" | null;

interface LightProps {
  color: "r" | "y" | "g";
  on: boolean;
}

const LIGHT_ON: Record<string, string> = {
  r: "bg-gradient-radial from-[#ff9a93] to-[var(--status-danger)]",
  y: "bg-gradient-radial from-[#ffd98a] to-[var(--status-live)]",
  g: "bg-gradient-radial from-[#87f0a0] to-[var(--status-win)]",
};

function Light({ color, on }: LightProps) {
  const base =
    "w-3 h-3 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,.7),inset_0_-1px_1px_rgba(0,0,0,.25)]";
  if (!on)
    return (
      <i
        className={`${base} bg-[var(--border)] shadow-[inset_0_1px_1px_rgba(255,255,255,.3)]`}
      />
    );

  // Use inline style for radial gradient since Tailwind doesn't do radial-gradient natively
  const colors: Record<string, [string, string]> = {
    r: ["#ff9a93", "var(--status-danger)"],
    y: ["#ffd98a", "var(--status-live)"],
    g: ["#87f0a0", "var(--status-win)"],
  };
  const [from, to] = colors[color];
  return (
    <i
      className={base}
      style={{
        background: `radial-gradient(circle at 35% 30%, ${from}, ${to})`,
      }}
    />
  );
}

function statusLights(status: WindowStatus): [boolean, boolean, boolean] {
  switch (status) {
    case "live":
      return [false, true, false]; // amber
    case "done":
      return [false, false, true]; // green
    case "draft":
      return [false, false, false]; // all off (grey)
    default:
      return [true, true, true]; // decorative — all on
  }
}

/* ----------------------------------------------------------------
   <Window>
   ---------------------------------------------------------------- */
export interface WindowProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  status?: WindowStatus;
  lights?: boolean;
  frosted?: boolean;
  /** Если задан — красный «светофор» становится кнопкой закрытия (× при наведении). */
  onClose?: () => void;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({
  title,
  status = null,
  lights = true,
  frosted = true,
  onClose,
  children,
  className,
  ...rest
}) => {
  const [r, y, g] = statusLights(status);

  return (
    <div
      className={[
        "window-shell",
        frosted ? "frost" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {(title || lights) && (
        <div className="titlebar brushed">
          {lights && (
            <div className="flex gap-[7px] group">
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть — на главную"
                  title="На главную"
                  className="relative w-3 h-3 rounded-full grid place-items-center cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,.7),inset_0_-1px_1px_rgba(0,0,0,.25)]"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, #ff9a93, var(--status-danger))",
                  }}
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] leading-none font-bold text-[rgba(80,0,0,.75)]">
                    ×
                  </span>
                </button>
              ) : (
                <Light color="r" on={r} />
              )}
              <Light color="y" on={y} />
              <Light color="g" on={g} />
            </div>
          )}
          {title && (
            <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">
              {title}
            </span>
          )}
        </div>
      )}
      <div className="p-[18px]">{children}</div>
    </div>
  );
};

/* ----------------------------------------------------------------
   <Card> — no titlebar, frosted, shadow
   ---------------------------------------------------------------- */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...rest }) => (
  <div
    className={[
      "frost border border-[var(--border)] rounded-card p-4",
      "shadow-[inset_0_1px_0_var(--gloss),0_4px_16px_var(--shadow)]",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...rest}
  >
    {children}
  </div>
);
