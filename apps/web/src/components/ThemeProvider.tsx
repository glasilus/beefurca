"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Обёртка next-themes. attribute="class" → ставит class="dark" на <html>,
 * что соответствует darkMode:"class" в tailwind.config и .dark в globals.css.
 * enableSystem — уважает системную тему по умолчанию; disableTransitionOnChange
 * убирает мерцание переходов в момент переключения.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
