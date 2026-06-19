"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./Toast";
import { ConfirmProvider } from "./ConfirmDialog";

/** Глобальные клиентские провайдеры приложения: тема, тосты, подтверждения. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
