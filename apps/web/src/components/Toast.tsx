"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CheckCircle,
  WarningCircle,
  Info,
  XCircle,
  X,
} from "@phosphor-icons/react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  /** Длительность показа в мс. 0 — не закрывать автоматически. По умолчанию 4000. */
  duration?: number;
  /** Заголовок над текстом (опционально). */
  title?: string;
}

interface ToastItem extends Required<Pick<ToastOptions, "duration">> {
  id: number;
  message: string;
  variant: ToastVariant;
  title?: string;
}

interface ToastApi {
  show: (message: string, variant?: ToastVariant, opts?: ToastOptions) => number;
  success: (message: string, opts?: ToastOptions) => number;
  error: (message: string, opts?: ToastOptions) => number;
  info: (message: string, opts?: ToastOptions) => number;
  warning: (message: string, opts?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const VARIANT_META: Record<
  ToastVariant,
  { icon: React.ReactNode; accent: string; role: "status" | "alert" }
> = {
  success: { icon: <CheckCircle size={18} weight="fill" />, accent: "text-green-400", role: "status" },
  error: { icon: <XCircle size={18} weight="fill" />, accent: "text-red-400", role: "alert" },
  info: { icon: <Info size={18} weight="fill" />, accent: "text-completeGrad-mid", role: "status" },
  warning: { icon: <WarningCircle size={18} weight="fill" />, accent: "text-yellow-400", role: "alert" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info", opts: ToastOptions = {}) => {
      const id = ++idRef.current;
      const duration = opts.duration ?? 4000;
      setToasts((prev) => [...prev, { id, message, variant, duration, title: opts.title }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  // Чистим таймеры при размонтировании
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api: ToastApi = {
    show,
    success: (m, o) => show(m, "success", o),
    error: (m, o) => show(m, "error", o),
    info: (m, o) => show(m, "info", o),
    warning: (m, o) => show(m, "warning", o),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Контейнер тостов */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const meta = VARIANT_META[t.variant];
          return (
            <div
              key={t.id}
              role={meta.role}
              className="pointer-events-auto component-card-dark p-3.5 flex items-start gap-3 shadow-xl animate-toast-in"
            >
              <span className={`shrink-0 mt-0.5 ${meta.accent}`}>{meta.icon}</span>
              <div className="min-w-0 flex-1">
                {t.title && (
                  <p className="text-xs font-bold text-[var(--text-core)] mb-0.5">{t.title}</p>
                )}
                <p className="text-xs text-[var(--text-muted)] leading-snug break-words">{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-core)] transition p-0.5 rounded"
                aria-label="Закрыть уведомление"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
