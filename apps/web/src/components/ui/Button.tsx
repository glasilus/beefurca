"use client";

import React from "react";

export type ButtonVariant = "gel" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

const SIZE_CLS: Record<ButtonSize, string> = {
  sm: "h-[30px] px-3 text-[12px] gap-1.5",
  md: "h-[38px] px-4 text-[13px] gap-2",
};

/**
 * Кнопка в стиле PC-98: плоский бевел, инверсия рамки при нажатии.
 * Имена вариантов сохранены (gel = основная), но глянец/гель убраны.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "gel",
      size = "md",
      loading = false,
      disabled = false,
      leftIcon,
      children,
      className,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const base =
      "inline-flex items-center justify-center font-bold uppercase tracking-wide cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

    const variantCls: Record<ButtonVariant, string> = {
      gel: "btn-98 btn-98-primary",
      secondary: "btn-98",
      ghost: "text-[var(--accent)] bg-transparent hover:underline border-2 border-transparent",
      danger: "btn-98 btn-98-danger",
    };

    const disabledCls = "opacity-50 cursor-not-allowed pointer-events-none";

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={[
          base,
          SIZE_CLS[size],
          variantCls[variant],
          isDisabled ? disabledCls : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {loading ? (
          <span className="blink-98" aria-label="Загрузка">
            ▮
          </span>
        ) : leftIcon ? (
          <span className="shrink-0 flex items-center">{leftIcon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
