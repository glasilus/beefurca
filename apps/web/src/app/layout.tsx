import type { Metadata } from "next";
import {
  Unbounded,
  Fira_Sans,
  Fira_Sans_Condensed,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import { Aurora } from "../components/Aurora";

const display = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});
const sans = Fira_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});
const cond = Fira_Sans_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  variable: "--font-cond",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beefurca | Tournament Hub",
  description: "Universal tournament organization and ELO rating platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning — next-themes выставляет класс темы до гидрации,
  // что иначе вызывало бы предупреждение о несовпадении разметки.
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${cond.variable} ${mono.variable}`}
    >
      <body className="antialiased relative min-h-screen">
        <Aurora />
        <Providers>
          <main className="relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
