"use client";

import React, { useEffect, useRef, useCallback } from "react";

export interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Fluted-glass modal overlay. Esc closes; focuses first focusable element on mount.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  footer,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element
    const el = panelRef.current;
    if (el) {
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="fluted-glass w-full max-w-md"
      >
        {title && (
          <h3 className="font-bold text-[17px] text-[var(--text)] mb-1.5">
            {title}
          </h3>
        )}
        <div className="text-[13px] text-[var(--text-muted)] leading-relaxed">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2.5 mt-5">{footer}</div>
        )}
      </div>
    </div>
  );
};
