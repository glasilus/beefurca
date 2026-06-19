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
        // Семантические поверхности через CSS-переменные — автоматически
        // переключаются между тёмной (.dark) и светлой темами. Имя `obsidian`
        // сохранено ради совместимости с существующей разметкой.
        obsidian: {
          base: "var(--bg-base)",
          panel: "var(--bg-panel)",
          border: "var(--border-color)",
          input: "var(--bg-input)",
        },
        // Прямые значения светлой палитры (на случай явного использования).
        clinical: {
          base: "#FFFFFF",
          panel: "#F4F7FA",
          border: "#D9E2EC",
          input: "#E1E8ED",
        },
        activeGrad: {
          start: "#FF1F44", // Neon Red
          mid: "#4D00FF",   // Purple
          end: "#FFDE00",   // Yellow
        },
        completeGrad: {
          start: "#004BFF", // Cobalt Blue
          mid: "#00E5FF",   // Electric Cyan
          end: "#E0E0E0",   // Silver
        },
      },
      fontFamily: {
        sans: ["Grafmassa", "sans-serif"],
        mono: ["Unifix SP", "monospace"],
        pixel: ["Beast", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
