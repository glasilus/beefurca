"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch, fetchProfile } from "../../../lib/api";
import { Nav } from "../../../components/Nav";
import { FractalAvatar } from "../../../components/FractalAvatar";
import { EloChart } from "../../../components/EloChart";
import { StatsCharts } from "../../../components/StatsCharts";
import { Window } from "../../../components/ui/Window";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Table } from "../../../components/ui/Table";
import { EmptyState } from "../../../components/ui/EmptyState";
import type { TableColumn } from "../../../components/ui/Table";
import {
  TrendUp as TrendingUp,
  ArrowLeft,
  Calendar,
} from "@phosphor-icons/react";

export default function PlayerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const playerId = params.id as string;

  const [myProfile, setMyProfile] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [eloHistory, setEloHistory] = useState<any[]>([]);
  const [disciplineStats, setDisciplineStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      try {
        // Публичный профиль — основной запрос без авторизации
        const pubRes = await apiFetch(`/users/${playerId}/public`, { signal } as any);
        if (signal.aborted) return;

        if (!pubRes.ok) {
          setNotFound(true);
          return;
        }

        const pubData = await pubRes.json();
        if (signal.aborted) return;
        setPlayer(pubData);

        // Опциональные данные — ошибки не показывают "не найден"
        await Promise.all([
          apiFetch(`/users/${playerId}/elo-history`, { signal } as any)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => { if (!signal.aborted) setEloHistory(data); })
            .catch(() => {}),
          apiFetch(`/users/${playerId}/discipline-stats`, { signal } as any)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => { if (!signal.aborted) setDisciplineStats(data); })
            .catch(() => {}),
          fetchProfile()
            .then((prof) => { if (!signal.aborted && prof) setMyProfile(prof); })
            .catch(() => {}),
        ]);
      } catch (err: any) {
        if (signal.aborted) return;
        setNotFound(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [playerId]);

  const avgElo = disciplineStats.length > 0
    ? Math.round(disciplineStats.reduce((a: number, s: any) => a + 1000 + s.eloDelta, 0) / disciplineStats.length)
    : null;

  const totalMatches = disciplineStats.reduce((a: number, s: any) => a + s.matchesCount, 0);
  const totalWins = disciplineStats.reduce((a: number, s: any) => a + s.winsCount, 0);
  const winrate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : null;

  const disciplineColumns: TableColumn<any>[] = [
    { key: "disciplineName", header: "Дисциплина", render: (row: any) => <span className="font-semibold">{row.disciplineName}</span> },
    { key: "elo", header: "ELO", numeric: true, render: (row: any) => <span className="font-bold font-mono text-[var(--status-done)]">{1000 + row.eloDelta}</span> },
    { key: "matchesCount", header: "Матчи", numeric: true },
    { key: "winsCount", header: "Победы", numeric: true, render: (row: any) => <span className="text-[var(--status-win)]">{row.winsCount}</span> },
    { key: "winrate", header: "WR%", numeric: true, render: (row: any) => <span>{row.matchesCount > 0 ? `${Math.round((row.winsCount / row.matchesCount) * 100)}%` : "—"}</span> },
    { key: "eloDelta", header: "Δ ELO", numeric: true, render: (row: any) => <span className={`font-bold ${row.eloDelta >= 0 ? "text-[var(--status-win)]" : "text-[var(--status-danger)]"}`}>{row.eloDelta >= 0 ? `+${row.eloDelta}` : row.eloDelta}</span> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">Загрузка профиля...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen pb-16 relative">
        <Nav profile={myProfile} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 mt-20 text-center">
          <EmptyState title="Игрок не найден" hint="Профиль не существует или был удалён." seed="notfound" />
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => router.back()} className="mt-6">
            Назад
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = myProfile?.id === playerId;

  return (
    <div className="min-h-screen pb-16 relative">
      <Nav active="tournaments" profile={myProfile} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => router.back()}
          className="mb-6"
        >
          Назад
        </Button>

        {/* Player hero */}
        <Window title={isOwnProfile ? "Мой профиль (публичный вид)" : "Профиль игрока"}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="shrink-0">
              <FractalAvatar seed={player.id} size={88} />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 mb-2 flex-wrap justify-center sm:justify-start">
                <h1 className="text-2xl font-bold font-display text-[var(--text)] min-w-0 break-words">{player.nickname}</h1>
                <Badge tone="draft">{player.role}</Badge>
                {isOwnProfile && <Badge tone="accent">Это вы</Badge>}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono justify-center sm:justify-start mb-4">
                <Calendar size={12} />
                <span>На платформе с {new Date(player.createdAt).toLocaleDateString("ru-RU")}</span>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[var(--panel-sunken)] rounded-lg px-3 py-2 text-center">
                  <div className="text-[10px] font-cond uppercase text-[var(--text-muted)] mb-0.5">Среднее ELO</div>
                  <div className="text-lg font-mono font-bold text-[var(--status-done)]">
                    {avgElo ?? "—"}
                  </div>
                </div>
                <div className="bg-[var(--panel-sunken)] rounded-lg px-3 py-2 text-center">
                  <div className="text-[10px] font-cond uppercase text-[var(--text-muted)] mb-0.5">Матчей</div>
                  <div className="text-lg font-mono font-bold text-[var(--text)]">{totalMatches}</div>
                </div>
                <div className="bg-[var(--panel-sunken)] rounded-lg px-3 py-2 text-center">
                  <div className="text-[10px] font-cond uppercase text-[var(--text-muted)] mb-0.5">Побед</div>
                  <div className="text-lg font-mono font-bold text-[var(--status-win)]">{totalWins}</div>
                </div>
                <div className="bg-[var(--panel-sunken)] rounded-lg px-3 py-2 text-center">
                  <div className="text-[10px] font-cond uppercase text-[var(--text-muted)] mb-0.5">Винрейт</div>
                  <div className="text-lg font-mono font-bold text-[var(--accent)]">
                    {winrate !== null ? `${winrate}%` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Window>

        {disciplineStats.length > 0 && (
          <div className="mt-8">
            <StatsCharts disciplineStats={disciplineStats} />
          </div>
        )}

        <div className="mt-8">
          <EloChart history={eloHistory} />
        </div>

        <div className="mt-8">
          <Window title="Статистика по дисциплинам" status={disciplineStats.length > 0 ? "done" : null}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-[var(--status-done)]" />
              <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">По дисциплинам</span>
            </div>
            {disciplineStats.length > 0 ? (
              <div className="overflow-x-auto">
                <Table
                  columns={disciplineColumns}
                  rows={disciplineStats}
                  rowKey={(row) => row.disciplineId}
                />
              </div>
            ) : (
              <EmptyState
                title="Нет сыгранных матчей"
                hint="Этот игрок пока не участвовал в матчах."
                seed={`stats-empty-${playerId}`}
              />
            )}
          </Window>
        </div>
      </div>
    </div>
  );
}
