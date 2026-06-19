"use client";

import React from "react";

export type BadgeTone = "live" | "done" | "win" | "danger" | "draft" | "accent";

export interface BadgeProps {
  tone: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const TONE_STYLES: Record<BadgeTone, string> = {
  live: "text-[var(--status-live)] border-[color-mix(in_srgb,var(--status-live)_50%,transparent)] bg-[color-mix(in_srgb,var(--status-live)_14%,transparent)]",
  done: "text-[var(--status-done)] border-[color-mix(in_srgb,var(--status-done)_50%,transparent)] bg-[color-mix(in_srgb,var(--status-done)_14%,transparent)]",
  win: "text-[var(--status-win)] border-[color-mix(in_srgb,var(--status-win)_50%,transparent)] bg-[color-mix(in_srgb,var(--status-win)_14%,transparent)]",
  danger: "text-[var(--status-danger)] border-[color-mix(in_srgb,var(--status-danger)_50%,transparent)] bg-[color-mix(in_srgb,var(--status-danger)_14%,transparent)]",
  draft: "text-[var(--text-muted)] border-[var(--border)] bg-[color-mix(in_srgb,var(--text-muted)_12%,transparent)]",
  accent: "text-[var(--accent)] border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]",
};

const DOT_COLORS: Record<BadgeTone, string> = {
  live: "var(--status-live)",
  done: "var(--status-done)",
  win: "var(--status-win)",
  danger: "var(--status-danger)",
  draft: "var(--text-muted)",
  accent: "var(--accent)",
};

export const Badge: React.FC<BadgeProps> = ({
  tone,
  dot = false,
  children,
  className,
}) => (
  <span
    className={[
      "inline-flex items-center gap-1.5 font-cond font-semibold uppercase tracking-[.05em] text-[11px] py-1 px-2.5 rounded-full border",
      TONE_STYLES[tone],
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {dot && (
      <span
        className={[
          "w-[7px] h-[7px] rounded-full",
          tone === "live"
            ? "animate-[pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          background: DOT_COLORS[tone],
          boxShadow:
            tone === "live" ? `0 0 6px ${DOT_COLORS[tone]}` : undefined,
        }}
      />
    )}
    {children}
  </span>
);

/**
 * Maps a tournament status string to a Badge tone.
 */
export function tournamentStatusTone(
  status: string,
): BadgeTone {
  switch (status.toLowerCase()) {
    case "active":
    case "live":
    case "in_progress":
      return "live";
    case "completed":
    case "done":
    case "finished":
      return "done";
    case "draft":
    case "planned":
      return "draft";
    case "cancelled":
    case "canceled":
      return "danger";
    default:
      return "accent";
  }
}
