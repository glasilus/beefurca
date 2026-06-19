"use client";

import React from "react";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Horizontal tab bar with underline indicator on the active tab.
 */
export const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  onChange,
  className,
}) => (
  <div
    className={[
      "flex gap-1 border-b border-[var(--hairline)]",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    role="tablist"
  >
    {items.map((item) => {
      const active = item.value === value;
      return (
        <button
          key={item.value}
          role="tab"
          type="button"
          aria-selected={active}
          onClick={() => onChange(item.value)}
          className={[
            "px-3 py-2 text-[13px] font-semibold transition-colors border-b-2 -mb-px",
            active
              ? "text-[var(--text)] border-[var(--accent)]"
              : "text-[var(--text-muted)] border-transparent hover:text-[var(--text)] hover:border-[var(--border)]",
          ].join(" ")}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);
