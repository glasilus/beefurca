"use client";

import React from "react";

/* ----------------------------------------------------------------
   <Field> — wrapper with label + error
   ---------------------------------------------------------------- */
export interface FieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  error,
  children,
  className,
}) => (
  <div className={className}>
    {label && (
      <label className="block font-cond uppercase tracking-[.06em] text-[11px] text-[var(--text-muted)] mb-1.5">
        {label}
      </label>
    )}
    {children}
    {error && (
      <p className="mt-1 text-[11px] text-[var(--status-danger)]">{error}</p>
    )}
  </div>
);

/* ----------------------------------------------------------------
   <Input> — inset style
   ---------------------------------------------------------------- */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={[
        "w-full h-[38px] px-3 text-[14px] font-sans",
        "text-[var(--text)] bg-[var(--panel-sunken)]",
        "border border-[var(--border)] rounded-ctl",
        "shadow-[inset_0_2px_4px_rgba(0,0,0,.12)]",
        "outline-none",
        "focus:border-[var(--accent)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,.12),0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)]",
        "placeholder:text-[var(--text-muted)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  ),
);
Input.displayName = "Input";

/* ----------------------------------------------------------------
   <Select> — inset style, matching Input look
   ---------------------------------------------------------------- */
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={[
        "w-full h-[38px] px-3 text-[14px] font-sans appearance-none",
        "text-[var(--text)] bg-[var(--panel-sunken)]",
        "border border-[var(--border)] rounded-ctl",
        "shadow-[inset_0_2px_4px_rgba(0,0,0,.12)]",
        "outline-none",
        "focus:border-[var(--accent)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,.12),0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)]",
        "bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2354657A%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]",
        "bg-[length:12px] bg-[right_12px_center] bg-no-repeat",
        "pr-8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

/* ----------------------------------------------------------------
   <Checkbox> — with label
   ---------------------------------------------------------------- */
export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...rest }, ref) => (
    <label
      className={[
        "inline-flex items-center gap-2 cursor-pointer select-none text-[13px] text-[var(--text)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        ref={ref}
        type="checkbox"
        className="w-4 h-4 rounded-[4px] border border-[var(--border)] bg-[var(--panel-sunken)] text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 accent-[var(--accent)]"
        {...rest}
      />
      <span>{label}</span>
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
