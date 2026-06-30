"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BracketCanvas } from "../components/BracketCanvas";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { Window } from "../components/ui/Window";
import { Sprite } from "../components/Sprite";

export default function Home() {
  const router = useRouter();
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setHeaderVisible(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const demoMatches = [
    {
      id: "m1", round: 1, position: 0,
      participant1Id: "p1", participant2Id: "p2",
      score1: 3, score2: 1, winnerId: "p1",
      isTechDefeat: false, nextMatchId: "m3", nextMatchIsP1: true,
    },
    {
      id: "m2", round: 1, position: 1,
      participant1Id: "p3", participant2Id: "p4",
      score1: 0, score2: 2, winnerId: "p4",
      isTechDefeat: false, nextMatchId: "m3", nextMatchIsP1: false,
    },
    {
      id: "m3", round: 2, position: 0,
      participant1Id: "p1", participant2Id: "p4",
      score1: null, score2: null, winnerId: null,
      isTechDefeat: false, nextMatchId: null,
    },
  ];

  const demoParticipants = [
    { id: "p1", nicknameSnapshot: "Cyber_Dragon",     teamSnapshot: null },
    { id: "p2", nicknameSnapshot: "Shadow_Wolf",      teamSnapshot: null },
    { id: "p3", nicknameSnapshot: "Speedy_Gonzales",  teamSnapshot: null },
    { id: "p4", nicknameSnapshot: "Iron_Valkyrie",    teamSnapshot: null },
  ];

  return (
    <div className="min-h-screen text-[var(--text)]">

      {/* ── Скролл-хедер: скрыт наверху, появляется при прокрутке ── */}
      <header
        className={`app-header fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[62px] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <span className="font-score text-[20px] tracking-[.06em]">BEEFURCA</span>
          </div>
          <Button variant="gel" size="sm" onClick={() => router.push("/login")}>
            Войти
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Общая обёртка: спрайты позиционируются здесь ── */}
        <div className="relative">

          {/* Спрайты: z-[2] - за текстом hero (z-10), впереди демо (z-0) */}
          <div className="hidden md:block absolute top-0 left-0 z-[2] pointer-events-none select-none leading-none">
            <Sprite src="/sprites/raver-lord.png" alt="" height={460} />
          </div>
          <div className="hidden md:block absolute top-0 right-0 z-[2] pointer-events-none select-none leading-none">
            <Sprite src="/sprites/kobold.png" alt="" height={460} flip />
          </div>

          {/* ── Hero ── */}
          <section className="border-b-2 border-[var(--border)] pt-20 pb-16">
            {/* Центральный контент: z-10 выше спрайтов */}
            <div className="relative z-10 text-center max-w-sm mx-auto">
              <div className="flex justify-center mb-6">
                <Logo size={80} />
              </div>
              <h1 className="font-score text-[clamp(36px,7vw,68px)] tracking-[.12em] mb-4">
                BEEFURCA
              </h1>
              <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">
                Независимый турнирный движок - для любой дисциплины и любого масштаба.
              </p>
              <Button variant="gel" onClick={() => router.push("/login")}>
                Войти в систему
              </Button>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
                <span>Стандартный</span>
                <span className="opacity-30">·</span>
                <span>Sandbox</span>
                <span className="opacity-30">·</span>
                <span>ELO-рейтинг</span>
                <span className="opacity-30">·</span>
                <span>Реальное время</span>
              </div>
            </div>
          </section>

          {/* ── Bracket demo: z-0 - спрайты частично заходят сверху ── */}
          <section className="py-12">
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">
              Интерактивная турнирная сетка
            </p>
            <BracketCanvas matches={demoMatches} participants={demoParticipants} />
          </section>

        </div>

        {/* ── Как устроена система ── */}
        <section className="pb-16 border-t-2 border-[var(--border)] pt-12">
          <Window title="Как устроена система">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
                  Роли
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    ["Администратор", "Управляет системой - создаёт дисциплины, назначает роли пользователям."],
                    ["Организатор",   "Создаёт турниры, принимает заявки, строит сетку, назначает судей."],
                    ["Игрок",         "Подаёт заявки на участие, отслеживает сетку и свой ELO-рейтинг."],
                    ["Судья",         "Вводит результаты закреплённых за ним матчей."],
                  ].map(([role, desc]) => (
                    <div key={role} className="panel-98-sunken px-3 py-2">
                      <span className="text-xs font-bold text-[var(--accent)]">{role}</span>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
                  Как провести турнир
                </p>
                <ol className="flex flex-col gap-3">
                  {[
                    "Администратор создаёт дисциплину.",
                    "Организатор создаёт турнир - стандартный или sandbox.",
                    "Игроки регистрируются и подают заявки.",
                    "Организатор принимает заявки и строит сетку.",
                    "Назначаются судьи для каждого матча.",
                    "Судьи вводят результаты - сетка обновляется в реальном времени.",
                    "В стандартном режиме ELO пересчитывается автоматически.",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 items-start text-[11px] text-[var(--text-muted)] leading-relaxed">
                      <span className="font-mono text-[var(--accent)] shrink-0 w-4 text-right">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Window>
        </section>

      </div>

      {/* ── Подвал ── */}
      <footer className="border-t-2 border-[var(--border)] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
          <span>Beefurca - ИС организации соревнований</span>
          <span>Петунов Н.О. · Курсовой проект · 2026</span>
        </div>
      </footer>
    </div>
  );
}
