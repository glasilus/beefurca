"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "@phosphor-icons/react";

/**
 * Переключатель тёмной/светлой темы. До монтирования рендерим плейсхолдер,
 * т.к. реальная тема известна только на клиенте (иначе hydration mismatch).
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  const base =
    "flex items-center justify-center w-8 h-8 rounded border border-obsidian-border text-[var(--text-muted)] hover:text-[var(--text-core)] hover:bg-white/5 transition";

  if (!mounted) {
    return <div className={`${base} ${className || ""}`} aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`${base} ${className || ""}`}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};
