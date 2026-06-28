"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Television as Tv, Radio, Flame, Clock, Medal as Award, ArrowSquareOut as ExternalLink, ArrowLeft } from "@phosphor-icons/react";
import { FractalAvatar } from "../../../../components/FractalAvatar";
import { API_URL, apiFetch } from "../../../../lib/api";
import { Window, Card } from "../../../../components/ui/Window";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { EmptyState } from "../../../../components/ui/EmptyState";

export default function TournamentScoreboardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pinnedMatchId, setPinnedMatchId] = useState<string | null>(null);

  const [tournament, setTournament] = useState<any>(null);
  const [disciplineName, setDisciplineName] = useState<string>("");
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
        try {
          const dRes = await apiFetch("/tournaments/disciplines");
          if (dRes.ok) {
            const discs = await dRes.json();
            const disc = discs.find((d: any) => d.id === data.tournament.disciplineId);
            if (disc) setDisciplineName(disc.name);
          }
        } catch {}
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
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">
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

  const pinnedMatch = pinnedMatchId ? matches.find((m) => m.id === pinnedMatchId) : null;
  const featuredMatch = pinnedMatch
    ?? (activeMatches.length > 0 ? activeMatches[0] : completedMatches[0] ?? null);
  const isPinned = !!pinnedMatch;

  return (
    <div className="min-h-screen pb-16 relative overflow-x-hidden">
      {/* Header */}
      <header className="relative z-10 border-b border-[var(--border)] brushed">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/tournaments/${params.id}`)}
            leftIcon={<ArrowLeft size={14} />}
          >
            Назад к сетке
          </Button>

          <div className="flex items-center gap-2">
            <Radio size={16} className="text-[var(--status-danger)] animate-pulse motion-reduce:animate-none" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
              Эфирное табло результатов
            </span>
          </div>

          <Badge tone="live" dot>{tournament?.bracketType}</Badge>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-10">

        {/* Tournament Name Banner */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-extrabold uppercase tracking-wider text-[var(--text)]">
            {tournament?.name}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-2 font-mono uppercase tracking-widest">
            Дисциплина: {disciplineName || "—"} / Режим трансляции в реальном времени
          </p>
        </div>

        {/* FEATURED MATCH BOARD */}
        {featuredMatch && (
          <div className="mb-12">
            <div className="text-center mb-3 flex items-center justify-center gap-3">
              <Badge tone={isPinned ? "accent" : activeMatches.length > 0 ? "live" : "done"} dot>
                <Flame size={12} />
                {isPinned ? "ЗАКРЕПЛЁН ВРУЧНУЮ" : activeMatches.length > 0 ? "ГЛАВНЫЙ МАТЧ ЭФИРА" : "ПОСЛЕДНИЙ ЗАВЕРШЕННЫЙ МАТЧ"}
              </Badge>
              {isPinned && (
                <button
                  onClick={() => setPinnedMatchId(null)}
                  className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text)] underline underline-offset-2"
                >
                  сбросить
                </button>
              )}
            </div>

            <Window
              title={`Раунд ${featuredMatch.round} / Пара ${featuredMatch.position + 1}`}
              status={activeMatches.length > 0 ? "live" : "done"}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative">

                {/* Participant 1 */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="border-2 border-[var(--border)] rounded-card mb-4 overflow-hidden">
                    <FractalAvatar seed={featuredMatch.participant1Id || "wait1"} size={90} />
                  </div>
                  <span className="font-bold text-lg md:text-xl text-[var(--text)] uppercase tracking-wide truncate max-w-[240px]">
                    {getParticipantName(featuredMatch.participant1Id)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono mt-1">Участник 1</span>
                </div>

                {/* DIGITS SCORE BOARD */}
                <div className="flex flex-col items-center justify-center px-6">
                  <div className="flex items-center justify-center gap-6 font-display">
                    <span className="text-7xl md:text-9xl font-score font-bold text-[var(--text)]">
                      {featuredMatch.score1 !== null ? featuredMatch.score1 : "0"}
                    </span>
                    <span className="text-5xl md:text-7xl text-[var(--text-muted)] animate-pulse motion-reduce:animate-none">:</span>
                    <span className="text-7xl md:text-9xl font-score font-bold text-[var(--text)]">
                      {featuredMatch.score2 !== null ? featuredMatch.score2 : "0"}
                    </span>
                  </div>

                  {/* Technical Defeat label */}
                  {featuredMatch.isTechDefeat && (
                    <Badge tone="danger" dot className="mt-3">
                      Техническое поражение
                    </Badge>
                  )}

                  <span className="text-[10px] text-[var(--text-muted)] font-mono mt-4 uppercase tracking-widest">
                    Раунд {featuredMatch.round} / Пара {featuredMatch.position + 1}
                  </span>
                </div>

                {/* Participant 2 */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="border-2 border-[var(--border)] rounded-card mb-4 overflow-hidden">
                    <FractalAvatar seed={featuredMatch.participant2Id || "wait2"} size={90} />
                  </div>
                  <span className="font-bold text-lg md:text-xl text-[var(--text)] uppercase tracking-wide truncate max-w-[240px]">
                    {getParticipantName(featuredMatch.participant2Id)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono mt-1">Участник 2</span>
                </div>

              </div>

              {/* Match Custom Metadata (Stream URLs, chess invite codes) */}
              {(featuredMatch.customFieldsData?.stream_url || featuredMatch.customFieldsData?.invite_link) && (
                <div className="mt-8 pt-6 border-t border-[var(--hairline)] flex flex-wrap gap-4 justify-center text-xs font-mono">
                  {featuredMatch.customFieldsData.stream_url && (
                    <a
                      href={featuredMatch.customFieldsData.stream_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-ctl bg-[var(--panel-sunken)] border border-[var(--border)] hover:border-[var(--status-danger)] text-[var(--text)] hover:text-[var(--status-danger)] flex items-center gap-2 transition"
                    >
                      <Tv size={14} className="text-[var(--status-danger)]" />
                      <span>Смотреть трансляцию матча</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {featuredMatch.customFieldsData.invite_link && (
                    <a
                      href={featuredMatch.customFieldsData.invite_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-ctl bg-[var(--panel-sunken)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text)] hover:text-[var(--accent)] flex items-center gap-2 transition"
                    >
                      <Clock size={14} className="text-[var(--accent)]" />
                      <span>Присоединиться к комнате (Chess / Lobbies)</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
            </Window>
          </div>
        )}

        {/* SUB-SECTION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Active Matches Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Radio size={14} className="text-[var(--status-danger)] animate-pulse motion-reduce:animate-none" />
              <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">
                Другие параллельные матчи ({activeMatches.length > 0 ? activeMatches.length : 0})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMatches.map((m) => {
                if (featuredMatch && m.id === featuredMatch.id) return null;
                const isThisPinned = pinnedMatchId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setPinnedMatchId(isThisPinned ? null : m.id)}
                    className="cursor-pointer"
                  >
                  <Window title={`Раунд ${m.round} / Пара ${m.position + 1}`} status={isThisPinned ? "done" : "live"}>
                    <div className="flex justify-between items-center text-[9px] font-mono text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--hairline)]">
                      <span>РАУНД {m.round} / ПАРА {m.position + 1}</span>
                      {isThisPinned
                        ? <Badge tone="accent">НА ЭКРАНЕ</Badge>
                        : <Badge tone="live" dot>LIVE — нажми чтобы показать</Badge>}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[var(--text)] truncate max-w-[140px]">
                          {getParticipantName(m.participant1Id)}
                        </span>
                        <span className="font-display text-base font-mono bg-[var(--panel-sunken)] px-2 py-0.5 rounded-ctl border border-[var(--hairline)] text-[var(--text)]">
                          {m.score1 !== null ? m.score1 : "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[var(--text)] truncate max-w-[140px]">
                          {getParticipantName(m.participant2Id)}
                        </span>
                        <span className="font-display text-base font-mono bg-[var(--panel-sunken)] px-2 py-0.5 rounded-ctl border border-[var(--hairline)] text-[var(--text)]">
                          {m.score2 !== null ? m.score2 : "0"}
                        </span>
                      </div>
                    </div>

                    {/* Metadata indicators */}
                    {(m.customFieldsData?.stream_url || m.customFieldsData?.invite_link) && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--hairline)]">
                        {m.customFieldsData.stream_url && (
                          <a
                            href={m.customFieldsData.stream_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-ctl bg-[var(--panel-sunken)] border border-[var(--hairline)] text-[8px] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 transition"
                          >
                            <Tv size={10} className="text-[var(--status-danger)]" />
                            <span>Стрим</span>
                          </a>
                        )}
                        {m.customFieldsData.invite_link && (
                          <a
                            href={m.customFieldsData.invite_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-ctl bg-[var(--panel-sunken)] border border-[var(--hairline)] text-[8px] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 transition"
                          >
                            <Clock size={10} className="text-[var(--accent)]" />
                            <span>Комната</span>
                          </a>
                        )}
                      </div>
                    )}
                  </Window>
                  </div>
                );
              })}

              {activeMatches.length === 0 && (
                <div className="col-span-full">
                  <EmptyState
                    title="Нет активных матчей"
                    hint="В данный момент нет активных матчей."
                    seed="scoreboard-empty"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Recently Completed Matches Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Award size={14} className="text-[var(--status-done)]" />
              <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">
                Последние результаты ({completedMatches.length})
              </span>
            </div>

            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
              {completedMatches.map((m) => {
                if (featuredMatch && m.id === featuredMatch.id) return null;

                const name1 = getParticipantName(m.participant1Id);
                const name2 = getParticipantName(m.participant2Id);

                const winnerId = m.winnerId;
                const isWinner1 = winnerId === m.participant1Id;
                const isWinner2 = winnerId === m.participant2Id;
                const isThisPinned = pinnedMatchId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setPinnedMatchId(isThisPinned ? null : m.id)}
                    className="cursor-pointer"
                    title="Нажми чтобы показать на главном экране"
                  >
                  <Card>
                    <div className="flex justify-between items-center text-[8px] font-mono text-[var(--text-muted)] mb-2">
                      <span>РАУНД {m.round} / ПАРА {m.position + 1}</span>
                      <Badge tone="done">ЗАВЕРШЕН</Badge>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className={`truncate max-w-[130px] ${isWinner1 ? "text-[var(--status-win)] font-bold" : "text-[var(--text-muted)]"}`}>
                          {name1}
                        </span>
                        <span className="font-display text-base font-mono text-[var(--text)]">{m.score1}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`truncate max-w-[130px] ${isWinner2 ? "text-[var(--status-win)] font-bold" : "text-[var(--text-muted)]"}`}>
                          {name2}
                        </span>
                        <span className="font-display text-base font-mono text-[var(--text)]">{m.score2}</span>
                      </div>
                    </div>
                  </Card>
                  </div>
                );
              })}

              {completedMatches.length === 0 && (
                <EmptyState
                  title="Нет результатов"
                  hint="Матчи еще не проводились."
                  seed="results-empty"
                />
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
