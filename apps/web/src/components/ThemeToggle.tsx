"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "./ui/Button";

/* SVG icons from design-preview.html */
const SunIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 6.5 6.5 0 0 0 21 12.5z" />
  </svg>
);

/**
 * Theme toggle button. Shows sun in dark mode and moon in light mode.
 * Renders a placeholder before client mount to avoid hydration mismatch.
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <span
        className={["inline-flex w-8 h-8", className].filter(Boolean).join(" ")}
        aria-hidden
      />
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      className={className}
      style={{ width: 32, height: 32, padding: 0 }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
};
