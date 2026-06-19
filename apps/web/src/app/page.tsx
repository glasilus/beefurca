"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FractalAvatar } from "../components/FractalAvatar";
import { FractalSeal } from "../components/FractalSeal";
import { BracketCanvas } from "../components/BracketCanvas";
import { ThemeToggle } from "../components/ThemeToggle";
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

  return (
    <div className="min-h-screen bg-obsidian-base text-white transition-colors duration-300">
      {/* Navbar */}
      <header className="border-b border-obsidian-border bg-obsidian-panel/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-activeGrad-start via-activeGrad-mid to-activeGrad-end flex items-center justify-center font-bold text-white shadow-lg">
              B
            </div>
            <span className="font-pixel text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              BEEFURCA
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button onClick={() => router.push("/login")} className="text-xs font-bold uppercase tracking-wider bg-activeGrad-start hover:bg-red-600 text-white px-4 py-2 rounded shadow-md transition">
              Войти / Регистрация
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-300 to-slate-500">
            Экосистема турниров нового поколения
          </h1>
          <p className="max-w-2xl mx-auto text-slate-400 text-base md:text-lg mb-8">
            Отказ от бумажных АРМ. Самообслуживание игроков, строгий судейский надзор и сквозной ELO-рейтинг для любых соревновательных дисциплин.
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={() => router.push("/login")} className="px-6 py-3 bg-activeGrad-start hover:bg-red-600 rounded text-sm font-bold uppercase tracking-wider transition shadow-lg">
              Начать — войти
            </button>
            <button onClick={() => router.push("/login")} className="px-6 py-3 border border-obsidian-border hover:bg-white/5 rounded text-sm font-bold uppercase tracking-wider transition">
              Создать аккаунт
            </button>
          </div>
          <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mt-6">
            Разделы ниже — демонстрация интерфейса
          </p>
        </section>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="component-card-dark p-6">
            <div className="w-10 h-10 rounded bg-activeGrad-start/20 text-activeGrad-start flex items-center justify-center mb-4">
              <Trophy size={20} />
            </div>
            <h3 className="font-bold text-base mb-2">Три уровня лиг</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Официальные PRO лиги с жестким начислением ELO, Amateur турниры игроков и Sandbox «песочницы» для быстрого учета участников без регистрации.
            </p>
          </div>

          <div className="component-card-dark p-6">
            <div className="w-10 h-10 rounded bg-completeGrad-mid/20 text-completeGrad-mid flex items-center justify-center mb-4">
              <Shield size={20} />
            </div>
            <h3 className="font-bold text-base mb-2">Контекстное судейство</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ввод счета и кастомных полей доступен исключительно назначенным верифицированным судьям. Полная защита от несанкционированных изменений.
            </p>
          </div>

          <div className="component-card-dark p-6">
            <div className="w-10 h-10 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-base mb-2">Кастомные поля матчей</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Динамический конфигуратор метаданных позволяет добавлять специфичные поля (карты, столы, спектаторские пароли) под любую дисциплину.
            </p>
          </div>
        </section>

        {/* Interactive Bracket Demo */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Activity className="text-activeGrad-start" size={18} />
              <h2 className="text-xl font-bold uppercase tracking-wider">Интерактивный холст сетки</h2>
            </div>
            <span className="text-[10px] uppercase font-mono bg-obsidian-panel border border-obsidian-border px-2.5 py-1 rounded text-slate-400">
              Live Demo
            </span>
          </div>
          <BracketCanvas matches={demoMatches} participants={demoParticipants} />
        </section>

        {/* Tournaments and Leaderboard Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tournament List with Fractal Avatars */}
          <section className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-completeGrad-mid" size={18} />
              <h2 className="text-xl font-bold uppercase tracking-wider">Активные соревнования</h2>
            </div>
            <div className="flex flex-col gap-4">
              {mockTournaments.map((t) => (
                <div key={t.id} className="component-card-dark p-4 flex gap-4 items-center">
                  <FractalAvatar seed={t.id} size={54} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                        t.type === "PRO" 
                          ? "bg-activeGrad-start/20 text-activeGrad-start border-activeGrad-start" 
                          : t.type === "AMATEUR"
                          ? "bg-completeGrad-start/20 text-completeGrad-mid border-completeGrad-start"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        {t.type}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{t.discipline}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-100 truncate">{t.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Начало: {t.date} • Приз: {t.prize}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Leaderboard and Cryptographic Seal Demo */}
          <section className="lg:col-span-5 flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Users className="text-purple-400" size={18} />
                <h2 className="text-xl font-bold uppercase tracking-wider">Глобальный рейтинг ELO</h2>
              </div>
              <div className="component-card-dark overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-obsidian-border text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3 text-center">Rank</th>
                      <th className="p-3">Player</th>
                      <th className="p-3 text-right">ELO</th>
                      <th className="p-3 text-right">Winrate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-obsidian-border">
                    {mockLeaderboard.map((row) => (
                      <tr key={row.rank} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-bold font-mono text-slate-400">{row.rank}</td>
                        <td className="p-3 font-semibold text-slate-200">{row.name}</td>
                        <td className="p-3 text-right font-mono font-bold text-completeGrad-mid">{row.elo}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{row.winrate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cryptographic Referee Seal Demo */}
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                <Shield className="text-activeGrad-start" size={18} />
                Судейская пломба (Seal)
              </h2>
              <div className="component-card-dark p-6 flex flex-col items-center justify-center min-h-[200px]">
                <FractalSeal hash="d3b07384d113edec49eaa6238ad5ff00" size={100} />
                <p className="text-[10px] text-center text-slate-400 max-w-xs mt-8 leading-relaxed">
                  Процедурный фрактал верифицирует неизменяемость спортивных результатов и автоматически генерируется при отправке транзакции на сервер.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
