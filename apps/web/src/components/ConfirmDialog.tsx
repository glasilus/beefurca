"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" colors the confirm button red (irreversible actions). */
  tone?: "default" | "danger";
}

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based replacement for window.confirm():
 *   const confirm = useConfirm();
 *   if (await confirm("Delete?")) { ... }
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
      <Modal
        open={!!state}
        title={state?.title}
        onClose={() => close(false)}
        footer={
          state ? (
            <>
              <Button variant="secondary" onClick={() => close(false)}>
                {state.cancelLabel || "Отмена"}
              </Button>
              <Button
                variant={state.tone === "danger" ? "danger" : "gel"}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmLabel || "Подтвердить"}
              </Button>
            </>
          ) : null
        }
      >
        {state?.message && (
          <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
            {state.message}
          </p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}
