import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import { Aurora } from "../components/Aurora";

// Единый точечно-матричный шрифт (PC-98 / RPG-вайб), поддерживает кириллицу.
// Все шрифтовые токены указывают на него, поэтому существующие классы font-*
// продолжают работать без правок по всем страницам.
const dot = DotGothic16({
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beefurca | Турнирная консоль",
  description: "ИС организации и учёта соревнований по любым дисциплинам",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Единая тёмная PC-98 палитра — класс dark зафиксирован (переключения тем нет).
  return (
    <html lang="ru" className={`dark ${dot.variable}`}>
      <body className="antialiased relative min-h-screen">
        {/* SVG-фильтр color-key: убирает чёрный фон у спрайтов на уровне пикселей.
            A_out = 30R + 30G + 30B − 0.5 → чистый #000 становится alpha=0. */}
        <svg aria-hidden="true" style={{ display: "none" }}>
          <defs>
            <filter id="sprite-key" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                30 30 30 0 -0.5
              " />
            </filter>
          </defs>
        </svg>
        <Aurora />
        <Providers>
          <main className="relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
