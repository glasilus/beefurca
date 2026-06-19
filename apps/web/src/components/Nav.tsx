"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SignOut as LogOut, Plus } from "@phosphor-icons/react";
import { logout as apiLogout } from "../lib/api";
import { ThemeToggle } from "./ThemeToggle";
import { FractalMedallion } from "./Fractal";
import { Button } from "./ui/Button";

type NavKey = "dashboard" | "tournaments" | "disciplines" | "create" | "admin";

interface NavProps {
  active?: NavKey;
  profile?: { role?: string } | null;
}

const LOGO_OPTS = { cre: 0.285, cim: 0.01, hue: 0, span: 360, lift: 0.4 } as const;

/**
 * Top navigation bar in Aqua style: brushed + pinstripe, opaque header,
 * fractal medallion logo, semantic token links.
 */
export const Nav: React.FC<NavProps> = ({ active, profile }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await apiLogout();
    router.push("/login");
  };

  const linkCls = (key: NavKey) =>
    [
      "text-[13px] font-semibold transition-colors",
      active === key
        ? "text-[var(--text)]"
        : "text-[var(--text-muted)] hover:text-[var(--text)]",
    ].join(" ");

  return (
    <header
      className="sticky top-0 z-50 brushed pinstripe border-b border-[var(--border)]"
      style={{
        boxShadow:
          "0 1px 0 var(--gloss) inset, 0 4px 18px var(--shadow)",
      }}
    >
      <div className="max-w-[1120px] mx-auto px-6 h-[62px] flex justify-between items-center">
        {/* Logo + nav links */}
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => router.push("/dashboard")}
          >
            {/* Fractal medallion logo with "B" overlay */}
            <span className="relative w-8 h-8 rounded-[9px] overflow-hidden flex-none shadow-[inset_0_1px_0_rgba(255,255,255,.85),0_1px_3px_var(--shadow)]">
              <FractalMedallion
                seed="beefurca"
                size={32}
                shape="rounded"
                opts={LOGO_OPTS}
              />
              <span className="absolute inset-0 grid place-items-center font-bold text-white text-[17px] [text-shadow:0_1px_3px_rgba(0,0,0,.7),0_0_1px_rgba(0,0,0,.9)] z-10">
                B
              </span>
              {/* Gel gloss */}
              <span className="absolute left-[8%] right-[8%] top-[4%] h-[42%] rounded-[9px] bg-gradient-to-b from-white/55 to-transparent pointer-events-none z-20" />
            </span>
            <span className="font-display font-extrabold text-[22px] tracking-[.02em] text-[var(--text)]">
              BEEFURCA
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className={linkCls("dashboard")}
            >
              Кабинет
            </button>
            <button
              onClick={() => router.push("/tournaments")}
              className={linkCls("tournaments")}
            >
              Турниры
            </button>
            <button
              onClick={() => router.push("/disciplines")}
              className={linkCls("disciplines")}
            >
              Дисциплины
            </button>

            <Button
              variant="gel"
              size="sm"
              leftIcon={<Plus size={14} weight="bold" />}
              onClick={() => router.push("/tournaments/create")}
            >
              Создать турнир
            </Button>

            {profile?.role === "Admin" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push("/admin")}
              >
                Админ-панель
              </Button>
            )}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <LogOut size={14} />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
};
