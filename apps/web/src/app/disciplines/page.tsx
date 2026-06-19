"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Pulse as Activity, Medal as Award, ArrowRight } from "@phosphor-icons/react";
import { apiFetch, fetchProfile, setSession } from "../../lib/api";
import { Nav } from "../../components/Nav";

export default function DisciplinesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const prof = await fetchProfile();
      if (!prof) {
        router.push("/login");
        return;
      }
      setProfile(prof);
      setSession(prof);
      await loadDisciplines();
      setLoading(false);
    })();
  }, []);

  const loadDisciplines = async () => {
    try {
      const res = await apiFetch("/tournaments/disciplines");
      if (res.ok) {
        const data = await res.json();
        setDisciplines(data);
        if (data.length > 0) selectDiscipline(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectDiscipline = async (disc: any) => {
    setSelectedDiscipline(disc);
    setLeaderboardLoading(true);
    setTournamentsLoading(true);
    try {
      const res = await apiFetch(`/users/disciplines/${disc.id}/leaderboard`);
      if (res.ok) setLeaderboard((await res.json()) || []);

      const tourRes = await apiFetch("/tournaments");
      if (tourRes.ok) {
        const tourData = await tourRes.json();
        setTournaments(tourData.filter((t: any) => t.disciplineName === disc.name));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLeaderboardLoading(false);
      setTournamentsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-base flex items-center justify-center text-white">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">Загрузка дисциплин...</span>
      </div>
    );
  }

  const renderTournamentCard = (t: any, accent: string) => (
    <div key={t.id} className={`component-card-dark p-4 flex flex-col justify-between min-h-[130px] border ${accent}`}>
      <div>
        <span className="text-[7px] bg-slate-800 border border-slate-700 px-1 py-0.5 rounded font-mono text-slate-400 font-bold uppercase mb-2 inline-block">{t.tournamentType}</span>
        <h5 className="font-bold text-xs text-slate-200 line-clamp-2">{t.name}</h5>
      </div>
      <div className="mt-4 pt-3 border-t border-obsidian-border/50 flex items-center justify-between">
        <span className="text-[8px] text-slate-500 font-mono">{new Date(t.startDate).toLocaleDateString("ru-RU")}</span>
        <button onClick={() => router.push(`/tournaments/${t.id}`)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[9px] font-bold uppercase text-slate-300 hover:text-white transition flex items-center gap-1">
          <span>Открыть</span><ArrowRight size={10} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-obsidian-base text-white pb-16 relative">
      <div className="absolute inset-0 dither-overlay z-0" />
      <Nav active="disciplines" profile={profile} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div>
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-activeGrad-start" />
              Список дисциплин
            </h3>
            <div className="flex flex-col gap-3">
              {disciplines.map((disc) => (
                <div key={disc.id} onClick={() => selectDiscipline(disc)} className={`component-card-dark p-4 cursor-pointer border transition-all ${selectedDiscipline?.id === disc.id ? "border-activeGrad-start bg-activeGrad-start/5" : "border-obsidian-border hover:border-slate-700"}`}>
                  <h4 className="font-bold text-sm text-slate-200">{disc.name}</h4>
                  <div className="flex justify-between items-center mt-2.5 text-[9px] text-slate-500 font-mono">
                    <span>{disc.gameType === "TEAM" ? "Командная" : "Одиночная"}</span>
                  </div>
                </div>
              ))}
              {disciplines.length === 0 && (
                <div className="component-card-dark p-6 text-center text-slate-500 text-xs font-mono">Дисциплины пока не зарегистрированы.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          {selectedDiscipline && (
            <>
              <div className="component-card-dark p-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 uppercase font-mono text-slate-400">
                    {selectedDiscipline.gameType === "TEAM" ? "Командный формат" : "Одиночный формат"}
                  </span>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase font-mono ${
                    selectedDiscipline.isOfficial
                      ? "border-completeGrad-start/30 bg-completeGrad-start/10 text-completeGrad-mid"
                      : "border-slate-700 bg-slate-800 text-slate-400"
                  }`}>
                    {selectedDiscipline.isOfficial ? "★ Официальная" : "Пользовательская"}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100">{selectedDiscipline.name}</h3>
                {selectedDiscipline.rules && (
                  <div className="mt-4 pt-4 border-t border-obsidian-border text-xs text-slate-400 leading-relaxed">
                    <h5 className="font-bold font-mono text-slate-300 mb-2 uppercase text-[9px]">Правила и регламент:</h5>
                    <p>{selectedDiscipline.rules}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Award size={16} className="text-completeGrad-mid" />
                  Рейтинг игроков в дисциплине
                </h3>
                <div className="component-card-dark overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-obsidian-border text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                      <tr>
                        <th className="p-3.5 text-center w-16">Место</th>
                        <th className="p-3.5">Никнейм</th>
                        <th className="p-3.5 text-right pr-6">Рейтинг ELO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-obsidian-border">
                      {leaderboardLoading ? (
                        <tr><td colSpan={3} className="p-8 text-center text-slate-500 font-mono italic">Загрузка...</td></tr>
                      ) : leaderboard.map((row, index) => (
                        <tr key={row.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3.5 text-center font-mono font-bold text-slate-400">{index + 1}</td>
                          <td className="p-3.5 font-semibold text-slate-200">{row.nickname}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-completeGrad-mid pr-6">{row.elo}</td>
                        </tr>
                      ))}
                      {!leaderboardLoading && leaderboard.length === 0 && (
                        <tr><td colSpan={3} className="p-8 text-center text-slate-500 font-mono italic">В этой дисциплине пока нет рейтинговых игроков.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 border-t border-obsidian-border/50 pt-8">
                <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-activeGrad-start" />
                  Турниры дисциплины
                </h3>
                {tournamentsLoading ? (
                  <div className="component-card-dark p-8 text-center text-slate-500 font-mono italic text-xs">Загрузка турниров...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs uppercase font-mono tracking-wider text-green-400 font-bold border-b border-green-900/40 pb-2">
                        Запланированные ({tournaments.filter((t) => !t.isStarted && !t.isCompleted).length})
                      </h4>
                      <div className="flex flex-col gap-3">
                        {tournaments.filter((t) => !t.isStarted && !t.isCompleted).map((t) => renderTournamentCard(t, "border-obsidian-border bg-obsidian-panel/20"))}
                        {tournaments.filter((t) => !t.isStarted && !t.isCompleted).length === 0 && (<div className="text-[10px] text-slate-600 italic font-mono py-2 text-center">Нет запланированных</div>)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs uppercase font-mono tracking-wider text-activeGrad-start font-bold border-b border-activeGrad-start/40 pb-2">
                        Идут сейчас ({tournaments.filter((t) => t.isStarted && !t.isCompleted).length})
                      </h4>
                      <div className="flex flex-col gap-3">
                        {tournaments.filter((t) => t.isStarted && !t.isCompleted).map((t) => renderTournamentCard(t, "border-activeGrad-start bg-activeGrad-start/5"))}
                        {tournaments.filter((t) => t.isStarted && !t.isCompleted).length === 0 && (<div className="text-[10px] text-slate-600 italic font-mono py-2 text-center">Нет активных</div>)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-2">
                        Завершённые ({tournaments.filter((t) => t.isCompleted).length})
                      </h4>
                      <div className="flex flex-col gap-3">
                        {tournaments.filter((t) => t.isCompleted).map((t) => renderTournamentCard(t, "border-slate-800 bg-slate-900/20 opacity-75 hover:opacity-100 transition-opacity"))}
                        {tournaments.filter((t) => t.isCompleted).length === 0 && (<div className="text-[10px] text-slate-600 italic font-mono py-2 text-center">Нет завершённых</div>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
