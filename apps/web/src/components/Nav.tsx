"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignOut as LogOut, Plus, List as Menu, X } from "./ui/icons";
import { logout as apiLogout } from "../lib/api";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Button } from "./ui/Button";

type NavKey = "dashboard" | "tournaments" | "disciplines" | "create" | "admin";

interface NavProps {
  active?: NavKey;
  profile?: { role?: string } | null;
}

export const Nav: React.FC<NavProps> = ({ active, profile }) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

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

  const mobileLinkCls = (key: NavKey) =>
    [
      "w-full text-left px-4 py-3 text-[15px] font-semibold transition-colors rounded-lg",
      active === key
        ? "text-[var(--text)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
        : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--panel-sunken)]",
    ].join(" ");

  const navItems: { key: NavKey; label: string; path: string }[] = [
    { key: "dashboard", label: "Кабинет", path: "/dashboard" },
    { key: "tournaments", label: "Турниры", path: "/tournaments" },
    { key: "disciplines", label: "Дисциплины", path: "/disciplines" },
  ];

  return (
    <>
      <header className="app-header sticky top-0 z-50">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-[62px] flex justify-between items-center">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => router.push("/dashboard")}
          >
            <Logo size={34} />
            <span className="font-score text-[22px] tracking-[.04em] text-[var(--text)]">
              BEEFURCA
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            {navItems.map((item) => (
              <button key={item.key} onClick={() => router.push(item.path)} className={linkCls(item.key)}>
                {item.label}
              </button>
            ))}

            <Button
              variant="gel"
              size="sm"
              leftIcon={<Plus size={14} weight="bold" />}
              onClick={() => router.push("/tournaments/create")}
            >
              Создать турнир
            </Button>

            {profile?.role === "Admin" && (
              <Button variant="secondary" size="sm" onClick={() => router.push("/admin")}>
                Админ
              </Button>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <LogOut size={14} />
              <span>Выйти</span>
            </button>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--panel-sunken)] transition-colors"
              aria-label="Меню"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute top-[62px] left-0 right-0 frost border-b border-[var(--border)] shadow-[0_8px_32px_var(--shadow)] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { router.push(item.path); setMenuOpen(false); }}
                  className={mobileLinkCls(item.key)}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { router.push("/tournaments/create"); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-[15px] font-semibold text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] rounded-lg transition-colors"
              >
                + Создать турнир
              </button>
              {profile?.role === "Admin" && (
                <button
                  onClick={() => { router.push("/admin"); setMenuOpen(false); }}
                  className={mobileLinkCls("admin")}
                >
                  Админ-панель
                </button>
              )}
            </nav>
            <div className="border-t border-[var(--hairline)] mt-2 pt-2">
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-[13px] font-semibold text-[var(--status-danger)] hover:bg-[color-mix(in_srgb,var(--status-danger)_8%,transparent)] rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Выйти из системы
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
