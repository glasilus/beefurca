"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EloChart } from "../../components/EloChart";
import { StatsCharts } from "../../components/StatsCharts";
import { FractalAvatar } from "../../components/FractalAvatar";
import { Nav } from "../../components/Nav";
import { apiFetch, fetchProfile, setSession, clearSession } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { Window, Card } from "../../components/ui/Window";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, Input } from "../../components/ui/Field";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import type { TableColumn } from "../../components/ui/Table";
import {
  Trophy,
  Users,
  Plus,
  Trash as Trash2,
  TrendUp as TrendingUp,
  PencilSimple,
  Check,
  UserCircle,
} from "../../components/ui/icons";

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [joinedTeams, setJoinedTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, any[]>>({}); // teamId -> members
  const [tournamentsHistory, setTournamentsHistory] = useState<any[]>([]);
  const [eloHistory, setEloHistory] = useState<any[]>([]);
  const [disciplineStats, setDisciplineStats] = useState<any[]>([]);

  const [newTeamName, setNewTeamName] = useState("");
  const [newMemberNickname, setNewMemberNickname] = useState<Record<string, string>>({});

  // Edit-profile modal
  const [editOpen, setEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");

  useEffect(() => {
    (async () => {
      const prof = await fetchProfile();
      if (!prof) {
        router.push("/login");
        return;
      }
      setSession(prof);

      // Вступление в команду по ссылке-приглашению (?joinTeam=<teamId>)
      const params = new URLSearchParams(window.location.search);
      const joinTeamId = params.get("joinTeam");
      if (joinTeamId) {
        try {
          const res = await apiFetch(`/users/teams/${joinTeamId}/join`, { method: "POST" });
          const data = await res.json();
          if (res.ok) toast.success(data.message || "Вы вступили в команду");
          else toast.error(data.error || "Не удалось вступить в команду");
        } catch (err: any) {
          toast.error(err.message);
        }
        // Чистим URL, чтобы повторная загрузка не дёргала join снова
        window.history.replaceState({}, "", "/dashboard");
      }

      await loadAllData(prof);
      setLoading(false);
    })();
  }, []);

  const loadAllData = async (prof?: any) => {
    try {
      const meRes = await apiFetch("/users/me");
      if (!meRes.ok) {
        clearSession();
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      setProfile(meData.profile);
      setJoinedTeams(meData.teams || []);
      setSession(meData.profile);

      // Состав каждой команды
      const membersMap: Record<string, any[]> = {};
      await Promise.all(
        (meData.teams || []).map(async (t: any) => {
          try {
            const r = await apiFetch(`/users/teams/${t.teamId}/members`);
            if (r.ok) membersMap[t.teamId] = await r.json();
          } catch {}
        })
      );
      setTeamMembers(membersMap);

      const uid = meData.profile.id;
      const [eloRes, tRes, statsRes] = await Promise.all([
        apiFetch(`/users/${uid}/elo-history`),
        apiFetch(`/users/me/tournaments`),
        apiFetch(`/users/${uid}/discipline-stats`),
      ]);
      if (eloRes.ok) setEloHistory(await eloRes.json());
      if (tRes.ok) setTournamentsHistory(await tRes.json());
      if (statsRes.ok) setDisciplineStats(await statsRes.json());
    } catch (err) {
      console.error("Error loading dashboard:", err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      const res = await apiFetch("/users/teams", {
        method: "POST",
        body: JSON.stringify({ name: newTeamName }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewTeamName("");
        loadAllData();
      } else toast.error(data.error || "Не удалось создать команду");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddMember = async (teamId: string) => {
    const nickname = newMemberNickname[teamId];
    if (!nickname || !nickname.trim()) return;
    try {
      const res = await apiFetch(`/users/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewMemberNickname((prev) => ({ ...prev, [teamId]: "" }));
        loadAllData();
      } else toast.error(data.error || "Не удалось добавить игрока");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);
  const handleCopyTeamInvite = async (teamId: string) => {
    const url = `${window.location.origin}/dashboard?joinTeam=${teamId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTeamId(teamId);
      setTimeout(() => setCopiedTeamId(null), 2000);
    } catch {
      prompt("Скопируйте ссылку-приглашение в команду:", url);
    }
  };

  const handleDisbandTeam = async (teamId: string, teamName: string) => {
    if (!(await confirm(`Распустить команду \"${teamName}\"? Действие необратимо.`))) return;
    try {
      const res = await apiFetch(`/users/teams/${teamId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) loadAllData();
      else toast.error(data.error || "Не удалось распустить команду");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!(await confirm("Покинуть эту команду?"))) return;
    try {
      const res = await apiFetch(`/users/teams/${teamId}/members/${profile.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) loadAllData();
      else toast.error(data.error || "Не удалось покинуть команду");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveMember = async (teamId: string, playerId: string) => {
    if (!(await confirm("Удалить этого игрока из состава?"))) return;
    try {
      const res = await apiFetch(`/users/teams/${teamId}/members/${playerId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) loadAllData();
      else toast.error(data.error || "Не удалось удалить игрока");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEdit = () => {
    setEditFullName(profile?.fullName || "");
    setEditPhone(profile?.phone || "");
    setEditPassword("");
    setEditOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = { fullName: editFullName, phone: editPhone };
    if (editPassword.trim()) body.password = editPassword;
    try {
      const res = await apiFetch("/users/me", { method: "PUT", body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setEditOpen(false);
        loadAllData();
      } else toast.error(data.error || "Не удалось сохранить профиль");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!(await confirm("Удалить аккаунт? Личные данные будут обезличены, но история матчей сохранится. Действие необратимо."))) return;
    try {
      const res = await apiFetch("/users/me", { method: "DELETE" });
      if (res.ok) {
        clearSession();
        router.push("/login");
      } else {
        const data = await res.json();
        toast.error(data.error || "Не удалось удалить аккаунт");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">Загрузка кабинета...</span>
      </div>
    );
  }

  const isCaptain = (team: any) => team.captainId === profile?.id;

  const avgElo = disciplineStats.length > 0
    ? Math.round(disciplineStats.reduce((a: number, s: any) => a + 1000 + s.eloDelta, 0) / disciplineStats.length)
    : null;

  const disciplineColumns: TableColumn<any>[] = [
    { key: "disciplineName", header: "Дисциплина", render: (row: any) => <span className="font-semibold">{row.disciplineName}</span> },
    { key: "currentElo", header: "ELO", numeric: true, render: (row: any) => <span className="font-bold font-mono text-[var(--status-done)]">{1000 + row.eloDelta}</span> },
    { key: "matchesCount", header: "Матчи", numeric: true },
    { key: "winsCount", header: "Победы", numeric: true, render: (row: any) => <span className="text-[var(--status-win)]">{row.winsCount}</span> },
    { key: "winrate", header: "WR%", numeric: true, render: (row: any) => <span>{row.matchesCount > 0 ? `${Math.round((row.winsCount / row.matchesCount) * 100)}%` : "—"}</span> },
    { key: "eloDelta", header: "Δ ELO", numeric: true, render: (row: any) => <span className={`font-bold ${row.eloDelta >= 0 ? "text-[var(--status-win)]" : "text-[var(--status-danger)]"}`}>{row.eloDelta >= 0 ? `+${row.eloDelta}` : row.eloDelta}</span> },
  ];

  return (
    <div className="min-h-screen pb-16 relative">
      <Nav active="dashboard" profile={profile} />

      {/* Май — первый кадр листка 418×412 при 3×. backgroundSize=1254px.
          Ширина: 414px = 138px×3 (чуть меньше кадра, убирает правый край).
          Высота: 375px = 125px×3 (чуть меньше первой строки, убирает нижний край). */}
      <div
        aria-hidden="true"
        className="hidden lg:block fixed bottom-0 right-0 z-0 pointer-events-none select-none"
        style={{
          width: "414px",
          height: "375px",
          transform: "translateX(14%)",
          backgroundImage: "url(/sprites/mai.png)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "0 0",
          backgroundSize: "1254px auto",
          imageRendering: "pixelated" as const,
          filter: "url(#sprite-key)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Profile */}
          <Window title="Профиль">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <FractalAvatar seed={profile?.id} size={70} />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 mb-1 flex-wrap justify-center sm:justify-start min-w-0">
                  <span className="text-lg font-bold text-[var(--text)] break-words min-w-0">{profile?.nickname}</span>
                  <Badge tone="draft">{profile?.role}</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{profile?.email}</p>
                {(profile?.fullName || profile?.phone) && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 break-words">
                    {profile?.fullName}{profile?.fullName && profile?.phone ? " | " : ""}{profile?.phone}
                  </p>
                )}
                <div className="flex gap-4 sm:gap-6 mt-3 flex-wrap justify-center sm:justify-start">
                  <div>
                    <span className="text-[10px] uppercase font-cond text-[var(--text-muted)] block">Среднее ELO</span>
                    {avgElo !== null
                      ? <span className="text-sm font-bold text-[var(--status-done)]">{avgElo}</span>
                      : <span className="text-xs text-[var(--text-muted)] font-mono">—</span>
                    }
                    {disciplineStats.length > 0 && (
                      <span className="text-[9px] text-[var(--text-muted)] font-cond block">по {disciplineStats.length} дисц.</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-cond text-[var(--text-muted)] block">Участник с</span>
                    <span className="text-xs text-[var(--text)] font-semibold">{new Date(profile?.createdAt).toLocaleDateString("ru-RU")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-cond text-[var(--text-muted)] block">Матчей</span>
                    <span className="text-xs text-[var(--text)] font-semibold font-mono">
                      {disciplineStats.reduce((a: number, s: any) => a + s.matchesCount, 0)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex sm:flex-col gap-2 flex-wrap justify-center">
                <Button variant="secondary" size="sm" leftIcon={<PencilSimple size={12} />} onClick={openEdit}>
                  Изменить
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<UserCircle size={12} />} onClick={() => router.push(`/players/${profile?.id}`)}>
                  Публичный
                </Button>
                <Button variant="danger" size="sm" leftIcon={<Trash2 size={12} />} onClick={handleDeleteAccount}>
                  Удалить
                </Button>
              </div>
            </div>
          </Window>

          <StatsCharts disciplineStats={disciplineStats} />

          <EloChart history={eloHistory} />

          {/* Discipline stats */}
          <Window title="Статистика по дисциплинам" status={disciplineStats.length > 0 ? "done" : null}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-[var(--status-done)]" />
              <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Статистика по дисциплинам</span>
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
                hint="Пока нет сыгранных матчей в официальных дисциплинах."
                seed="stats-empty"
              />
            )}
          </Window>

          {/* Teams */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[var(--accent)]" />
                <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">Мои команды</span>
              </div>
              <form onSubmit={handleCreateTeam} className="flex gap-2">
                <Input type="text" required placeholder="Название новой команды" className="h-8 w-auto" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                <Button variant="gel" size="sm" type="submit" leftIcon={<Plus size={14} />}>
                  Создать
                </Button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {joinedTeams.map((team) => {
                const members = teamMembers[team.teamId] || [];
                const captain = isCaptain(team);
                return (
                  <Window key={team.teamId} title={team.teamName}>
                    <div className="flex justify-between items-center gap-3 mb-4">
                      <h4 className="font-bold text-sm text-[var(--text)] min-w-0 truncate">{team.teamName}</h4>
                      <div className="flex items-center gap-2">
                        <Badge tone={captain ? "accent" : "draft"}>{captain ? "Капитан" : "Состав"}</Badge>
                        {captain ? (
                          <Button variant="danger" size="sm" onClick={() => handleDisbandTeam(team.teamId, team.teamName)}>Распустить</Button>
                        ) : (
                          <Button variant="danger" size="sm" onClick={() => handleLeaveTeam(team.teamId)}>Выйти</Button>
                        )}
                      </div>
                    </div>

                    {captain && (
                      <div className="flex flex-col gap-2 mb-4">
                        <div className="flex gap-2">
                          <Input type="text" placeholder="Никнейм игрока..." className="h-7 flex-1" value={newMemberNickname[team.teamId] || ""} onChange={(e) => setNewMemberNickname((prev) => ({ ...prev, [team.teamId]: e.target.value }))} />
                          <Button variant="gel" size="sm" onClick={() => handleAddMember(team.teamId)}>Добавить</Button>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleCopyTeamInvite(team.teamId)}>
                          {copiedTeamId === team.teamId ? (
                            <><Check size={12} /> Ссылка скопирована</>
                          ) : "Пригласить по ссылке"}
                        </Button>
                      </div>
                    )}

                    {/* Roster */}
                    <div className="flex flex-col gap-1.5">
                      {members.map((mem) => (
                        <div key={mem.playerId} className="flex justify-between items-center gap-2 text-xs px-2 py-1.5 bg-[var(--panel-sunken)] border border-[var(--hairline)] rounded-ctl">
                          <span className="text-[var(--text)] min-w-0 truncate">
                            {mem.nickname}
                            {mem.playerId === team.captainId && <span className="text-[8px] text-[var(--status-live)] ml-2 font-cond uppercase">капитан</span>}
                          </span>
                          {captain && mem.playerId !== team.captainId && (
                            <button onClick={() => handleRemoveMember(team.teamId, mem.playerId)} className="p-1 text-[var(--status-danger)] hover:bg-[color-mix(in_srgb,var(--status-danger)_10%,transparent)] rounded">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      {members.length === 0 && (
                        <span className="text-[10px] text-[var(--text-muted)] italic font-mono">Состав пуст</span>
                      )}
                    </div>
                  </Window>
                );
              })}
              {joinedTeams.length === 0 && (
                <div className="md:col-span-2">
                  <EmptyState
                    title="Нет команд"
                    hint="Вы пока не состоите ни в одной команде. Создайте свою!"
                    seed="teams-empty"
                    action={<Button variant="gel" size="sm" leftIcon={<Plus size={14} />} onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Название новой команды"]')?.focus()}>Создать команду</Button>}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tournament history */}
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2 mb-6">
            <Trophy size={16} className="text-[var(--accent)]" />
            <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">
              История турниров ({tournamentsHistory.length})
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {tournamentsHistory.map((h) => (
              <Card key={h.participantId}>
                <div className="flex justify-between items-start mb-2">
                  <Badge tone={h.status === "APPROVED" ? "win" : h.status === "PENDING" ? "live" : "danger"}>
                    {h.status === "APPROVED" ? "Принят" : h.status === "PENDING" ? "Заявка" : "Отклонен"}
                  </Badge>
                  <span className="text-[8px] text-[var(--text-muted)] font-mono">{new Date(h.joinedAt).toLocaleDateString("ru-RU")}</span>
                </div>
                <h4 onClick={() => router.push(`/tournaments/${h.tournamentId}`)} className="font-bold text-xs text-[var(--text)] hover:text-[var(--accent)] hover:underline cursor-pointer">{h.tournamentName}</h4>
                <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-[var(--hairline)] text-[9px] text-[var(--text-muted)] font-medium">
                  <span>{h.disciplineName}</span>
                  <span className="uppercase">{h.bracketType}</span>
                </div>
              </Card>
            ))}
            {tournamentsHistory.length === 0 && (
              <EmptyState
                title="Нет заявок"
                hint="Вы пока не подавали заявок на участие."
                seed="history-empty"
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit profile modal */}
      <Modal
        open={editOpen}
        title="Редактирование профиля"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button variant="gel" type="submit" form="edit-profile-form">Сохранить</Button>
          </>
        }
      >
        <form id="edit-profile-form" onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <Field label="ФИО">
            <Input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
          </Field>
          <Field label="Контактный телефон">
            <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+7 ..." />
          </Field>
          <Field label="Новый пароль (оставьте пустым, чтобы не менять)">
            <Input type="password" minLength={6} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Минимум 6 символов" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
