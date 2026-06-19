"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SignOut as LogOut } from "@phosphor-icons/react";
import { logout as apiLogout } from "../lib/api";
import { ThemeToggle } from "./ThemeToggle";

type NavKey = "dashboard" | "tournaments" | "disciplines" | "create" | "admin";

interface NavProps {
  active?: NavKey;
  profile?: { role?: string } | null;
}

/**
 * Единая шапка-навигация для всех внутренних страниц.
 * Создавать турниры может любой залогиненный (AMATEUR/SANDBOX); PRO ограничен
 * на самой форме. Ссылка на админ-панель видна только администратору.
 */
export const Nav: React.FC<NavProps> = ({ active, profile }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await apiLogout();
    router.push("/login");
  };

  const linkCls = (key: NavKey) =>
    `transition ${active === key ? "text-white" : "text-slate-400 hover:text-white"}`;

  return (
    <header className="relative z-10 border-b border-obsidian-border bg-obsidian-panel/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            <div className="w-8 h-8 rounded bg-gradient-to-br from-activeGrad-start to-activeGrad-end flex items-center justify-center font-bold text-white shadow-md">
              B
            </div>
            <span className="font-pixel text-2xl tracking-widest uppercase">
              BEEFURCA
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-4 text-xs font-semibold">
            <button onClick={() => router.push("/dashboard")} className={linkCls("dashboard")}>
              Кабинет
            </button>
            <button onClick={() => router.push("/tournaments")} className={linkCls("tournaments")}>
              Турниры
            </button>
            <button onClick={() => router.push("/disciplines")} className={linkCls("disciplines")}>
              Дисциплины
            </button>
            <button
              onClick={() => router.push("/tournaments/create")}
              className={`px-2.5 py-1 rounded border transition ${
                active === "create"
                  ? "bg-activeGrad-start text-white border-activeGrad-start"
                  : "bg-activeGrad-start/20 border-activeGrad-start/40 text-activeGrad-start hover:bg-activeGrad-start hover:text-white"
              }`}
            >
              + Создать турнир
            </button>
            {profile?.role === "Admin" && (
              <button
                onClick={() => router.push("/admin")}
                className={`px-2.5 py-1 rounded border transition ${
                  active === "admin"
                    ? "bg-purple-500 text-white border-purple-500"
                    : "bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500 hover:text-white"
                }`}
              >
                Админ-панель
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <LogOut size={14} />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
};
