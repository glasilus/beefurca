"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FractalAvatar } from "../components/FractalAvatar";
import { FractalSeal } from "../components/FractalSeal";
import { BracketCanvas } from "../components/BracketCanvas";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/Button";
import { Window, Card } from "../components/ui/Window";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Trophy, Shield, Users, Stack as Layers, Pulse as Activity, Calendar } from "@phosphor-icons/react";

export default function Home() {
  const router = useRouter();


  // Mock data for the demonstration
  const mockTournaments = [
    {
      id: "7b8f9e2d-3a4b-5c6d-7e8f-9a0b1c2d3e4f",
      name: "Championship of the Cosmos 2026",
      discipline: "Шахматы",
      type: "PRO",
      prize: "50 000 руб + Кубок",
      date: "15.06.2026",
    },
    {
      id: "1c2d3e4f-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
      name: "CS 1.6 Retro Cup Round 3",
      discipline: "Counter-Strike 1.6",
      type: "AMATEUR",
      prize: "15 000 руб",
      date: "18.06.2026",
    },
    {
      id: "9f0e1d2c-3b4a-5c6d-7e8f-9a0b1c2d3e4f",
      name: "Ping Pong Sandbox Sandbox-A",
      discipline: "Настольный теннис",
      type: "SANDBOX",
      prize: "Слава и почет",
      date: "20.06.2026",
    },
  ];

  const mockLeaderboard = [
    { rank: 1, name: "Alexander_Great", elo: 1824, winrate: "76%" },
    { rank: 2, name: "Ref_Overlord", elo: 1712, winrate: "68%" },
    { rank: 3, name: "Dmitry_G", elo: 1650, winrate: "64%" },
    { rank: 4, name: "Maya_Che", elo: 1580, winrate: "60%" },
  ];

  const demoMatches = [
    {
      id: "m1",
      round: 1,
      position: 0,
      participant1Id: "p1",
      participant2Id: "p2",
      score1: 3,
      score2: 1,
      winnerId: "p1",
      isTechDefeat: false,
      nextMatchId: "m3",
      nextMatchIsP1: true,
    },
    {
      id: "m2",
      round: 1,
      position: 1,
      participant1Id: "p3",
      participant2Id: "p4",
      score1: 0,
      score2: 2,
      winnerId: "p4",
      isTechDefeat: false,
      nextMatchId: "m3",
      nextMatchIsP1: false,
    },
    {
      id: "m3",
      round: 2,
      position: 0,
      participant1Id: "p1", // Winner of m1
      participant2Id: "p4", // Winner of m2
      score1: null,
      score2: null,
      winnerId: null,
      isTechDefeat: false,
      nextMatchId: null,
    },
  ];

  const demoParticipants = [
    { id: "p1", nicknameSnapshot: "Cyber_Dragon", teamSnapshot: null },
    { id: "p2", nicknameSnapshot: "Shadow_Wolf", teamSnapshot: null },
    { id: "p3", nicknameSnapshot: "Speedy_Gonzales", teamSnapshot: null },
    { id: "p4", nicknameSnapshot: "Iron_Valkyrie", teamSnapshot: null },
  ];

  const leaderboardColumns = [
    { key: "rank", header: "Rank", numeric: true, render: (row: typeof mockLeaderboard[number]) => <span className="font-bold">{row.rank}</span> },
    { key: "name", header: "Player", render: (row: typeof mockLeaderboard[number]) => <span className="font-semibold">{row.name}</span> },
    { key: "elo", header: "ELO", numeric: true, render: (row: typeof mockLeaderboard[number]) => <span className="font-bold text-[var(--status-done)]">{row.elo}</span> },
    { key: "winrate", header: "Winrate", numeric: true },
  ];

  const typeTone = (type: string) => {
    if (type === "PRO") return "danger" as const;
    if (type === "AMATEUR") return "accent" as const;
    return "draft" as const;
  };

  return (
    <div className="min-h-screen text-[var(--text)] transition-colors duration-300">
      {/* Navbar */}
      <header className="app-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[62px] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size={34} />
            <span className="font-score text-[22px] tracking-[.04em] text-[var(--text)]">
              BEEFURCA
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="gel" size="sm" onClick={() => router.push("/login")}>
              Войти / Регистрация
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <section className="text-center mb-10 sm:mb-16">
          <div className="flex justify-center mb-4 sm:mb-6">
            <Logo size={72} />
          </div>
          <h1 className="font-display font-extrabold text-[clamp(24px,5vw,48px)] tracking-tight mb-4 text-[var(--text)]">
            Экосистема турниров нового поколения
          </h1>
          <p className="max-w-2xl mx-auto text-[var(--text-muted)] text-sm sm:text-base md:text-lg mb-6 sm:mb-8 px-2">
            Отказ от бумажных АРМ. Самообслуживание игроков, строгий судейский надзор и сквозной ELO-рейтинг для любых соревновательных дисциплин.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button variant="gel" onClick={() => router.push("/login")}>
              Начать — войти
            </Button>
            <Button variant="secondary" onClick={() => router.push("/login")}>
              Создать аккаунт
            </Button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-6">
            Разделы ниже — демонстрация интерфейса
          </p>
        </section>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card>
            <div className="w-10 h-10 rounded-ctl bg-[color-mix(in_srgb,var(--status-danger)_14%,transparent)] text-[var(--status-danger)] flex items-center justify-center mb-4">
              <Trophy size={20} />
            </div>
            <h3 className="font-bold text-base mb-2 text-[var(--text)]">Три уровня лиг</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Официальные PRO лиги с жестким начислением ELO, Amateur турниры игроков и Sandbox "песочницы" для быстрого учета участников без регистрации.
            </p>
          </Card>

          <Card>
            <div className="w-10 h-10 rounded-ctl bg-[color-mix(in_srgb,var(--status-done)_14%,transparent)] text-[var(--status-done)] flex items-center justify-center mb-4">
              <Shield size={20} />
            </div>
            <h3 className="font-bold text-base mb-2 text-[var(--text)]">Контекстное судейство</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Ввод счета и кастомных полей доступен исключительно назначенным верифицированным судьям. Полная защита от несанкционированных изменений.
            </p>
          </Card>

          <Card>
            <div className="w-10 h-10 rounded-ctl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] flex items-center justify-center mb-4">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-base mb-2 text-[var(--text)]">Кастомные поля матчей</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Динамический конфигуратор метаданных позволяет добавлять специфичные поля (карты, столы, спектаторские пароли) под любую дисциплину.
            </p>
          </Card>
        </section>

        {/* Interactive Bracket Demo */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Activity className="text-[var(--accent)]" size={18} />
              <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[var(--text)]">Интерактивный холст сетки</h2>
            </div>
            <Badge tone="live" dot>Live Demo</Badge>
          </div>
          <BracketCanvas matches={demoMatches} participants={demoParticipants} />
        </section>

        {/* Tournaments and Leaderboard Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tournament List with Fractal Avatars */}
          <section className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-[var(--status-done)]" size={18} />
              <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[var(--text)]">Активные соревнования</h2>
            </div>
            <div className="flex flex-col gap-4">
              {mockTournaments.map((t) => (
                <Card key={t.id}>
                  <div className="flex gap-4 items-center">
                    <FractalAvatar seed={t.id} size={54} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <Badge tone={typeTone(t.type)}>{t.type}</Badge>
                        <span className="text-xs text-[var(--text-muted)] font-medium">{t.discipline}</span>
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text)] truncate">{t.name}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Начало: {t.date} | Приз: {t.prize}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Leaderboard and Cryptographic Seal Demo */}
          <section className="lg:col-span-5 flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Users className="text-[var(--accent)]" size={18} />
                <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[var(--text)]">Глобальный рейтинг ELO</h2>
              </div>
              <Window title="Рейтинг">
                <Table
                  columns={leaderboardColumns}
                  rows={mockLeaderboard}
                  rowKey={(row) => row.rank}
                />
              </Window>
            </div>

            {/* Cryptographic Referee Seal Demo */}
            <div>
              <h2 className="font-display font-bold text-xl uppercase tracking-wider mb-6 flex items-center gap-2 text-[var(--text)]">
                <Shield className="text-[var(--accent)]" size={18} />
                Судейская пломба (Seal)
              </h2>
              <Window title="Верификация">
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                  <FractalSeal hash="d3b07384d113edec49eaa6238ad5ff00" size={100} />
                  <p className="text-[10px] text-center text-[var(--text-muted)] max-w-xs mt-8 leading-relaxed">
                    Процедурный фрактал верифицирует неизменяемость спортивных результатов и автоматически генерируется при отправке транзакции на сервер.
                  </p>
                </div>
              </Window>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
