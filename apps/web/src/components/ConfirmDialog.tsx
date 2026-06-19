"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" красит кнопку подтверждения в красный (необратимые действия). */
  tone?: "default" | "danger";
}

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Промис-ориентированная замена window.confirm():
 *   const confirm = useConfirm();
 *   if (await confirm("Удалить?")) { ... }
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized: ConfirmOptions =
      typeof opts === "string" ? { message: opts } : opts;
    setState(normalized);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === "Escape") close(false);
            if (e.key === "Enter") close(true);
          }}
        >
          <div className="w-full max-w-sm component-card-dark p-6">
            {state.title && (
              <h4 className="font-bold text-sm text-[var(--text-core)] mb-2 uppercase tracking-wider">
                {state.title}
              </h4>
            )}
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
              {state.message}
            </p>
            <div className="flex gap-3">
              <button
                autoFocus
                onClick={() => close(false)}
                className="h-10 flex-1 border border-obsidian-border hover:bg-white/5 rounded text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] transition"
              >
                {state.cancelLabel || "Отмена"}
              </button>
              <button
                onClick={() => close(true)}
                className={`h-10 flex-1 rounded text-xs font-bold uppercase tracking-wider text-white shadow-lg transition ${
                  state.tone === "danger"
                    ? "bg-red-700 hover:bg-red-600"
                    : "bg-activeGrad-start hover:bg-red-600"
                }`}
              >
                {state.confirmLabel || "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
