import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../components/Providers";

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
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased relative min-h-screen">
        {/* Grain overlay */}
        <div className="absolute inset-0 dither-overlay z-50 pointer-events-none" />
        <Providers>
          <main className="relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
