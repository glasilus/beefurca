"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Television as Tv, Radio, Flame, Clock, Medal as Award, ArrowSquareOut as ExternalLink, ArrowLeft } from "@phosphor-icons/react";
import { FractalAvatar } from "../../../../components/FractalAvatar";
import { API_URL, apiFetch } from "../../../../lib/api";

export default function TournamentScoreboardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();

    // SSE Real-Time Updates (cookie-аутентификация)
    const sseUrl = `${API_URL}/tournaments/${params.id}/stream`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.addEventListener("update", (event: any) => {
      try {
        setMatches(JSON.parse(event.data));
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [params.id]);

  const loadInitialData = async () => {
    try {
      const res = await apiFetch(`/tournaments/${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setTournament(data.tournament);
        setParticipants(data.participants || []);
        setMatches(data.matches || []);
      } else {
        router.push(`/tournaments/${params.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-base flex items-center justify-center text-white">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">
          Загрузка табло трансляции...
        </span>
      </div>
    );
  }

  // Create participant mapping for quick lookup
  const participantMap = new Map<string, any>();
  participants.forEach((p) => participantMap.set(p.id, p));

  const getParticipantName = (id: string | null) => {
    if (!id) return "Ожидание";
    const p = participantMap.get(id);
    return p ? (p.teamSnapshot || p.nicknameSnapshot) : "Ожидание";
  };

  // Group matches
  const activeMatches = matches.filter((m) => !m.winnerId && m.participant1Id && m.participant2Id);
  const completedMatches = matches
    .filter((m) => m.winnerId)
    .sort((a, b) => new Date(b.playedAt || 0).getTime() - new Date(a.playedAt || 0).getTime());
  const pendingMatches = matches.filter((m) => !m.winnerId && (!m.participant1Id || !m.participant2Id));

  // Feature the first active match if any, otherwise the latest completed match
  const featuredMatch = activeMatches.length > 0 ? activeMatches[0] : (completedMatches.length > 0 ? completedMatches[0] : null);
  const otherActiveMatches = activeMatches.length > 1 ? activeMatches.slice(1) : [];

  return (
    <div className="min-h-screen bg-obsidian-base text-white pb-16 relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-activeGrad-start/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] rounded-full bg-completeGrad-start/5 blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 dither-overlay z-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-obsidian-border bg-obsidian-panel/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <button
            onClick={() => router.push(`/tournaments/${params.id}`)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={14} />
            <span>Назад к сетке</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-red-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Эфирное табло результатов
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-activeGrad-start bg-activeGrad-start/10 border border-activeGrad-start/20 px-2.5 py-0.5 rounded uppercase">
            {tournament?.bracketType}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-10">
        
        {/* Tournament Name Banner */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
            {tournament?.name}
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-widest">
            Дисциплина: {tournament?.disciplineName} • Режим трансляции в реальном времени
          </p>
        </div>

        {/* FEATURED MATCH BOARD */}
        {featuredMatch && (
          <div className="mb-12">
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-activeGrad-start/20 border border-activeGrad-start/30 text-[10px] font-bold uppercase tracking-widest text-activeGrad-start font-mono">
                <Flame size={12} className="animate-bounce" />
                {activeMatches.length > 0 ? "ГЛАВНЫЙ МАТЧ ЭФИРА" : "ПОСЛЕДНИЙ ЗАВЕРШЕННЫЙ МАТЧ"}
              </span>
            </div>

            <div className="component-card-dark p-8 md:p-12 border border-activeGrad-start/30 bg-activeGrad-start/5 shadow-2xl rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-activeGrad-start/10 rounded-bl-full flex items-center justify-center">
                <Tv size={28} className="text-activeGrad-start animate-pulse" />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
                
                {/* Participant 1 */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="border-2 border-slate-700 rounded mb-4 overflow-hidden">
                    <FractalAvatar seed={featuredMatch.participant1Id || "wait1"} size={90} />
                  </div>
                  <span className="font-bold text-lg md:text-xl text-slate-100 uppercase tracking-wide truncate max-w-[240px]">
                    {getParticipantName(featuredMatch.participant1Id)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">Участник 1</span>
                </div>

                {/* DIGITS SCORE BOARD */}
                <div className="flex flex-col items-center justify-center px-6">
                  <div className="flex items-center justify-center gap-6 font-pixel">
                    <span className="text-7xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-slate-100 to-slate-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      {featuredMatch.score1 !== null ? featuredMatch.score1 : "0"}
                    </span>
                    <span className="text-5xl md:text-7xl text-slate-600 animate-pulse">:</span>
                    <span className="text-7xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-slate-100 to-slate-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      {featuredMatch.score2 !== null ? featuredMatch.score2 : "0"}
                    </span>
                  </div>
                  
                  {/* Technical Defeat label */}
                  {featuredMatch.isTechDefeat && (
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-red-950/20 text-red-500 border border-red-900 font-bold mt-3 animate-pulse">
                      Техническое поражение
                    </span>
                  )}
                  
                  <span className="text-[10px] text-slate-400 font-mono mt-4 uppercase tracking-widest">
                    Раунд {featuredMatch.round} • Пара {featuredMatch.position + 1}
                  </span>
                </div>

                {/* Participant 2 */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="border-2 border-slate-700 rounded mb-4 overflow-hidden">
                    <FractalAvatar seed={featuredMatch.participant2Id || "wait2"} size={90} />
                  </div>
                  <span className="font-bold text-lg md:text-xl text-slate-100 uppercase tracking-wide truncate max-w-[240px]">
                    {getParticipantName(featuredMatch.participant2Id)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">Участник 2</span>
                </div>

              </div>

              {/* Match Custom Metadata (Stream URLs, chess invite codes) */}
              {(featuredMatch.customFieldsData?.stream_url || featuredMatch.customFieldsData?.invite_link) && (
                <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap gap-4 justify-center text-xs font-mono">
                  {featuredMatch.customFieldsData.stream_url && (
                    <a
                      href={featuredMatch.customFieldsData.stream_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded bg-slate-900 border border-slate-700 hover:border-red-500 text-slate-200 hover:text-white flex items-center gap-2 transition"
                    >
                      <Tv size={14} className="text-red-500" />
                      <span>Смотреть трансляцию матча</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {featuredMatch.customFieldsData.invite_link && (
                    <a
                      href={featuredMatch.customFieldsData.invite_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded bg-slate-900 border border-slate-700 hover:border-blue-500 text-slate-200 hover:text-white flex items-center gap-2 transition"
                    >
                      <Clock size={14} className="text-blue-500" />
                      <span>Присоединиться к комнате (Chess / Lobbies)</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-SECTION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Active Matches Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 flex items-center gap-2">
              <Radio size={14} className="text-red-500 animate-pulse" />
              Другие параллельные матчи ({activeMatches.length > 0 ? activeMatches.length : 0})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMatches.map((m) => {
                // If it's the featured match, skip showing it here
                if (featuredMatch && m.id === featuredMatch.id) return null;

                return (
                  <div key={m.id} className="component-card-dark p-5 border border-obsidian-border hover:border-activeGrad-start/50 bg-obsidian-panel/20 transition-all rounded-xl">
                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-3 pb-2 border-b border-obsidian-border/50">
                      <span>РАУНД {m.round} • ПАРА {m.position + 1}</span>
                      <span className="text-activeGrad-start font-bold uppercase animate-pulse">LIVE</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200 truncate max-w-[140px]">
                          {getParticipantName(m.participant1Id)}
                        </span>
                        <span className="font-pixel text-base bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-100">
                          {m.score1 !== null ? m.score1 : "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200 truncate max-w-[140px]">
                          {getParticipantName(m.participant2Id)}
                        </span>
                        <span className="font-pixel text-base bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-100">
                          {m.score2 !== null ? m.score2 : "0"}
                        </span>
                      </div>
                    </div>

                    {/* Metadata indicators */}
                    {(m.customFieldsData?.stream_url || m.customFieldsData?.invite_link) && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-obsidian-border/30">
                        {m.customFieldsData.stream_url && (
                          <a
                            href={m.customFieldsData.stream_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-[8px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                          >
                            <Tv size={10} className="text-red-500" />
                            <span>Стрим</span>
                          </a>
                        )}
                        {m.customFieldsData.invite_link && (
                          <a
                            href={m.customFieldsData.invite_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-[8px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                          >
                            <Clock size={10} className="text-blue-500" />
                            <span>Комната</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {activeMatches.length === 0 && (
                <div className="col-span-full component-card-dark p-8 text-center text-slate-500 text-xs font-mono italic">
                  В данный момент нет активных матчей.
                </div>
              )}
            </div>
          </div>

          {/* Recently Completed Matches Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 flex items-center gap-2">
              <Award size={14} className="text-completeGrad-mid" />
              Последние результаты ({completedMatches.length})
            </h3>

            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
              {completedMatches.map((m) => {
                // Skip if this is featured
                if (featuredMatch && m.id === featuredMatch.id) return null;

                const name1 = getParticipantName(m.participant1Id);
                const name2 = getParticipantName(m.participant2Id);

                const winnerId = m.winnerId;
                const isWinner1 = winnerId === m.participant1Id;
                const isWinner2 = winnerId === m.participant2Id;

                return (
                  <div key={m.id} className="p-3 bg-obsidian-panel/20 border border-obsidian-border rounded-xl flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
                      <span>РАУНД {m.round} • ПАРА {m.position + 1}</span>
                      <span>ЗАВЕРШЕН</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className={`truncate max-w-[130px] ${isWinner1 ? "text-green-400 font-bold" : "text-slate-400"}`}>
                          {name1}
                        </span>
                        <span className="font-pixel text-base text-slate-200">{m.score1}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`truncate max-w-[130px] ${isWinner2 ? "text-green-400 font-bold" : "text-slate-400"}`}>
                          {name2}
                        </span>
                        <span className="font-pixel text-base text-slate-200">{m.score2}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {completedMatches.length === 0 && (
                <div className="component-card-dark p-8 text-center text-slate-500 text-xs font-mono italic">
                  Матчи еще не проводились.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
