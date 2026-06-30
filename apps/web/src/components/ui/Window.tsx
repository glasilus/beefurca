"use client";

import React from "react";

/* ----------------------------------------------------------------
   <Window> - окно PC-98: чанковая бевел-рамка, дизер-титлбар, [X].
   ---------------------------------------------------------------- */
type WindowStatus = "live" | "done" | "draft" | null;

const STATUS_COLOR: Record<string, string> = {
  live: "var(--status-live)",
  done: "var(--status-done)",
  draft: "var(--text-muted)",
};

export interface WindowProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  status?: WindowStatus;
  lights?: boolean;
  frosted?: boolean;
  /** Если задан - в титлбаре появляется кнопка закрытия [X]. */
  onClose?: () => void;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({
  title,
  status = null,
  // lights/frosted - наследие старого API, игнорируются
  lights,
  frosted,
  onClose,
  children,
  className,
  ...rest
}) => {
  return (
    <div className={["panel-98", className].filter(Boolean).join(" ")} {...rest}>
      {(title || onClose) && (
        <div className="dither flex items-center gap-2 px-2 py-1.5 border-b-2 border-[var(--border)]">
          {status && (
            <span
              className="inline-block w-2.5 h-2.5"
              style={{ backgroundColor: STATUS_COLOR[status] }}
              aria-hidden
            />
          )}
          <span className="font-bold uppercase tracking-widest text-[12px] text-[var(--accent)] flex-1 min-w-0 truncate">
            {title}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть - на главную"
              title="На главную"
              className="btn-98 w-5 h-5 grid place-items-center text-[11px] font-bold leading-none"
            >
              ×
            </button>
          )}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};

/* ----------------------------------------------------------------
   <Card> - панель без титлбара
   ---------------------------------------------------------------- */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...rest }) => (
  <div className={["panel-98 p-4", className].filter(Boolean).join(" ")} {...rest}>
    {children}
  </div>
);
