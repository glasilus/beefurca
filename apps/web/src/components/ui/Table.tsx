"use client";

import React from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  /** Right-align (for numeric data, renders font-mono). */
  numeric?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey?: (row: T, index: number) => string | number;
  className?: string;
}

/**
 * Aqua-style data table. Headers in font-cond uppercase,
 * numeric cells in font-mono, hairline zebra + hover.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  className,
}: TableProps<T>) {
  return (
    <table
      className={[
        "w-full border-collapse",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={[
                "font-cond font-semibold uppercase tracking-[.06em] text-[11px] text-[var(--text-muted)] text-left py-2 px-3 border-b border-[var(--border)]",
                col.numeric ? "text-right" : "",
              ].join(" ")}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={rowKey ? rowKey(row, i) : i}
            className="hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors"
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={[
                  "py-2.5 px-3 border-b border-[var(--hairline)] text-[13px]",
                  col.numeric ? "font-mono text-right" : "",
                ].join(" ")}
              >
                {col.render
                  ? col.render(row, i)
                  : (row as Record<string, unknown>)[col.key] as React.ReactNode}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
