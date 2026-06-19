"use client";

import React from "react";
import { CircleNotch } from "@phosphor-icons/react";

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
  sm: "h-[32px] px-3.5 text-[12px] gap-1.5",
  md: "h-[38px] px-[18px] text-[13px] gap-2",
};

/**
 * Aqua-style button with gel/secondary/ghost/danger variants.
 * Pill radius for gel, 8px for secondary/danger, none for ghost.
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
      "inline-flex items-center justify-center font-sans font-bold border-none cursor-pointer transition-[transform,filter] duration-100 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

    const active = "active:translate-y-px";

    const variantCls: Record<ButtonVariant, string> = {
      gel: "gel text-white rounded-full",
      secondary: [
        "text-[var(--text)] rounded-[8px]",
        "bg-gradient-to-b from-[var(--chrome-top)] to-[var(--chrome-bot)]",
        "shadow-[inset_0_1px_0_var(--gloss),0_1px_3px_var(--shadow)]",
        "border border-[var(--border)]",
        "hover:brightness-105",
      ].join(" "),
      ghost: "text-[var(--accent)] bg-transparent rounded-[8px] hover:bg-[var(--accent)]/10",
      danger: [
        "rounded-[8px] text-white",
        "bg-gradient-to-b from-[color-mix(in_srgb,var(--status-danger)_86%,white)] to-[var(--status-danger)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_3px_var(--shadow)]",
        "[text-shadow:0_-1px_0_rgba(0,0,0,.2)]",
      ].join(" "),
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
          isDisabled ? disabledCls : active,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {loading ? (
          <CircleNotch
            size={size === "sm" ? 14 : 16}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : leftIcon ? (
          <span className="shrink-0 flex items-center">{leftIcon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
