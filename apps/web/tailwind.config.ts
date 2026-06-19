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
        panel: "var(--panel-solid)",
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

        /* ── Temporary aliases (old tokens still referenced in pages) ──
           Remove in Task 22 after all pages are migrated. */
        obsidian: {
          base: "var(--surface)",
          panel: "var(--panel-solid)",
          border: "var(--border)",
          input: "var(--panel-sunken)",
        },
        clinical: {
          base: "#FFFFFF",
          panel: "#F4F7FA",
          border: "#D9E2EC",
          input: "#E1E8ED",
        },
        activeGrad: {
          start: "#FF1F44",
          mid: "#4D00FF",
          end: "#FFDE00",
        },
        completeGrad: {
          start: "#004BFF",
          mid: "#00E5FF",
          end: "#E0E0E0",
        },
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
