"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Pulse as Activity, Medal as Award, ArrowRight, Star, SealCheck } from "@phosphor-icons/react";
import { apiFetch, fetchProfile, setSession } from "../../lib/api";
import { Nav } from "../../components/Nav";
import { Window, Card } from "../../components/ui/Window";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Table } from "../../components/ui/Table";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { FractalMedallion } from "../../components/Fractal";
import type { TableColumn } from "../../components/ui/Table";

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
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">Загрузка дисциплин...</span>
      </div>
    );
  }

  const leaderboardColumns: TableColumn<any>[] = [
    {
      key: "rank",
      header: "Место",
      numeric: true,
      render: (_row, index) => <span className="font-mono font-bold text-[var(--text-muted)]">{index + 1}</span>,
    },
    {
      key: "nickname",
      header: "Никнейм",
      render: (row) => <span className="font-semibold text-[var(--text)] block max-w-[180px] truncate" title={row.nickname}>{row.nickname}</span>,
    },
    {
      key: "elo",
      header: "Рейтинг ELO",
      numeric: true,
      render: (row) => <span className="font-mono font-bold text-[var(--status-done)]">{row.elo}</span>,
    },
  ];

  const planned = tournaments.filter((t) => !t.isStarted && !t.isCompleted);
  const active = tournaments.filter((t) => t.isStarted && !t.isCompleted);
  const completed = tournaments.filter((t) => t.isCompleted);

  const renderTournamentCard = (t: any) => (
    <Card key={t.id}>
      <div className="flex flex-col justify-between min-h-[110px]">
        <div>
          <Badge tone="draft" className="mb-2">{t.tournamentType}</Badge>
          <h5 className="font-bold text-xs text-[var(--text)] line-clamp-2">{t.name}</h5>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--hairline)] flex items-center justify-between">
          <span className="text-[9px] text-[var(--text-muted)] font-mono">{new Date(t.startDate).toLocaleDateString("ru-RU")}</span>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/tournaments/${t.id}`)}>
            <span>Открыть</span><ArrowRight size={10} />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen pb-16 relative">
      <Nav active="disciplines" profile={profile} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="lg:col-span-12">
          <PageHeader
            title="Дисциплины"
            eyebrow="Каталог"
          />
        </div>

        <div className="lg:col-span-4 min-w-0 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-[var(--accent)]" />
              <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">Выберите дисциплину</span>
            </div>
            <div className="flex flex-col gap-3">
              {disciplines.map((disc) => (
                <Card
                  key={disc.id}
                  onClick={() => selectDiscipline(disc)}
                  className={`cursor-pointer transition-all ${selectedDiscipline?.id === disc.id ? "!border-[var(--accent)] ring-1 ring-[var(--accent)]" : "hover:border-[var(--text-muted)]"}`}
                >
                  <div className="flex items-center gap-3">
                    <FractalMedallion seed={disc.name} size={40} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-[var(--text)]">{disc.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {disc.gameType === "TEAM" ? "Командная" : "Одиночная"}
                        </span>
                        {disc.isOfficial ? (
                          <Badge tone="done"><Star size={9} weight="fill" /> Официальная</Badge>
                        ) : (
                          <Badge tone="draft">Пользовательская</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {disciplines.length === 0 && (
                <EmptyState title="Нет дисциплин" hint="Дисциплины пока не зарегистрированы." seed="disc-empty" />
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 min-w-0 flex flex-col gap-8">
          {selectedDiscipline && (
            <>
              <Window title={selectedDiscipline.name} status={selectedDiscipline.isOfficial ? "done" : "draft"}>
                <div className="flex items-center gap-2.5 mb-3">
                  <Badge tone="draft">
                    {selectedDiscipline.gameType === "TEAM" ? "Командный формат" : "Одиночный формат"}
                  </Badge>
                  {selectedDiscipline.isOfficial ? (
                    <Badge tone="done"><SealCheck size={10} weight="fill" /> Официальная</Badge>
                  ) : (
                    <Badge tone="draft">Пользовательская</Badge>
                  )}
                </div>
                <h3 className="text-xl font-display font-bold text-[var(--text)]">{selectedDiscipline.name}</h3>
                {selectedDiscipline.rules && (
                  <div className="mt-4 pt-4 border-t border-[var(--hairline)] text-xs text-[var(--text-muted)] leading-relaxed">
                    <h5 className="font-bold font-cond text-[var(--text)] mb-2 uppercase text-[10px]">Правила и регламент:</h5>
                    <p>{selectedDiscipline.rules}</p>
                  </div>
                )}
              </Window>

              <Window title="Рейтинг игроков в дисциплине">
                <div className="flex items-center gap-2 mb-4">
                  <Award size={16} className="text-[var(--status-done)]" />
                  <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Рейтинг ELO</span>
                </div>
                {leaderboardLoading ? (
                  <span className="text-xs text-[var(--text-muted)] font-mono italic">Загрузка...</span>
                ) : leaderboard.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table
                      columns={leaderboardColumns}
                      rows={leaderboard}
                      rowKey={(row) => row.id}
                    />
                  </div>
                ) : (
                  <EmptyState
                    title="Нет рейтинговых игроков"
                    hint="В этой дисциплине пока нет рейтинговых игроков."
                    seed="leaderboard-empty"
                  />
                )}
              </Window>

              <div className="border-t border-[var(--hairline)] pt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-[var(--accent)]" />
                  <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">
                    Турниры дисциплины
                  </span>
                </div>
                {tournamentsLoading ? (
                  <span className="text-xs text-[var(--text-muted)] font-mono italic">Загрузка турниров...</span>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs uppercase font-cond tracking-[.06em] text-[var(--status-win)] font-bold border-b border-[color-mix(in_srgb,var(--status-win)_30%,transparent)] pb-2">
                        Запланированные ({planned.length})
                      </h4>
                      <div className="flex flex-col gap-3">
                        {planned.map((t) => renderTournamentCard(t))}
                        {planned.length === 0 && (<span className="text-[10px] text-[var(--text-muted)] italic font-mono py-2 text-center">Нет запланированных</span>)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs uppercase font-cond tracking-[.06em] text-[var(--status-live)] font-bold border-b border-[color-mix(in_srgb,var(--status-live)_30%,transparent)] pb-2">
                        Идут сейчас ({active.length})
                      </h4>
                      <div className="flex flex-col gap-3">
                        {active.map((t) => renderTournamentCard(t))}
                        {active.length === 0 && (<span className="text-[10px] text-[var(--text-muted)] italic font-mono py-2 text-center">Нет активных</span>)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs uppercase font-cond tracking-[.06em] text-[var(--text-muted)] font-bold border-b border-[var(--hairline)] pb-2">
                        Завершённые ({completed.length})
                      </h4>
                      <div className="flex flex-col gap-3">
                        {completed.map((t) => renderTournamentCard(t))}
                        {completed.length === 0 && (<span className="text-[10px] text-[var(--text-muted)] italic font-mono py-2 text-center">Нет завершённых</span>)}
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
