import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ── Semantic design tokens (Aqua x Fractal) ── */
        surface: "var(--surface)",
        panel: "var(--panel)",
        "panel-sunken": "var(--panel-sunken)",
        "chrome-top": "var(--chrome-top)",
        "chrome-bot": "var(--chrome-bot)",
        border: "var(--border)",
        hairline: "var(--hairline)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-hi": "var(--accent-hi)",
        "accent-lo": "var(--accent-lo)",
        live: "var(--status-live)",
        done: "var(--status-done)",
        win: "var(--status-win)",
        danger: "var(--status-danger)",

      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        cond: ["var(--font-cond)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        ctl: "6px",
        card: "10px",
        win: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
