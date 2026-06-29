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
        <Aurora />
        <Providers>
          <main className="relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
