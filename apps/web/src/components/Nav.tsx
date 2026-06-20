"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SignOut as LogOut, Plus } from "@phosphor-icons/react";
import { logout as apiLogout } from "../lib/api";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Button } from "./ui/Button";

type NavKey = "dashboard" | "tournaments" | "disciplines" | "create" | "admin";

interface NavProps {
  active?: NavKey;
  profile?: { role?: string } | null;
}

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
    <header className="app-header sticky top-0 z-50">
      <div className="max-w-[1120px] mx-auto px-6 h-[62px] flex justify-between items-center">
        {/* Logo + nav links */}
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => router.push("/dashboard")}
          >
            <Logo size={34} />
            <span className="font-score text-[22px] tracking-[.04em] text-[var(--text)]">
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
