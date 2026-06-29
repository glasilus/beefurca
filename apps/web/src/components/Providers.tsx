"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "./Toast";
import { ConfirmProvider } from "./ConfirmDialog";

/** Глобальные клиентские провайдеры приложения: тосты, подтверждения.
 *  Переключение тем убрано — единая тёмная PC-98 палитра. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
