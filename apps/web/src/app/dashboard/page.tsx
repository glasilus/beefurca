"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EloChart } from "../../components/EloChart";
import { FractalAvatar } from "../../components/FractalAvatar";
import { Nav } from "../../components/Nav";
import { apiFetch, fetchProfile, setSession, clearSession } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import {
  Trophy,
  Users,
  Plus,
  Trash as Trash2,
  TrendUp as TrendingUp,
  PencilSimple,
  DiscordLogo,
} from "@phosphor-icons/react";

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
    if (!(await confirm(`Распустить команду «${teamName}»? Действие необратимо.`))) return;
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
      <div className="min-h-screen bg-obsidian-base flex items-center justify-center text-white">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">Загрузка кабинета...</span>
      </div>
    );
  }

  const isCaptain = (team: any) => team.captainId === profile?.id;

  return (
    <div className="min-h-screen bg-obsidian-base text-white pb-16 relative">
      <div className="absolute inset-0 dither-overlay z-0" />
      <Nav active="dashboard" profile={profile} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Profile */}
          <div className="component-card-dark p-6 flex items-center gap-6">
            <FractalAvatar seed={profile?.id} size={70} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-lg font-bold text-slate-100">{profile?.nickname}</span>
                <span className="text-[8px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded uppercase font-bold text-slate-400">{profile?.role}</span>
                {profile?.discordLinked && (
                  <span className="text-[8px] bg-[#5865F2]/20 border border-[#5865F2]/50 px-1.5 py-0.5 rounded uppercase font-bold text-[#aab2ff] flex items-center gap-1">
                    <DiscordLogo size={10} weight="fill" /> Discord
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{profile?.email}</p>
              {(profile?.fullName || profile?.phone) && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {profile?.fullName}{profile?.fullName && profile?.phone ? " • " : ""}{profile?.phone}
                </p>
              )}
              <div className="flex gap-6 mt-3">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Рейтинг ELO</span>
                  <span className="text-sm font-bold text-completeGrad-mid">{profile?.elo} очков</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Участник с</span>
                  <span className="text-xs text-slate-300 font-semibold">{new Date(profile?.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={openEdit} className="px-3 py-1.5 rounded border border-obsidian-border hover:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <PencilSimple size={12} /> Изменить
              </button>
              <button onClick={handleDeleteAccount} className="px-3 py-1.5 rounded border border-red-900/60 text-red-400 hover:bg-red-950/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 size={12} /> Удалить
              </button>
            </div>
          </div>

          <EloChart history={eloHistory} />

          {/* Discipline stats */}
          <div className="component-card-dark p-6">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-completeGrad-mid" />
              Статистика по дисциплинам
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-obsidian-border text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                  <tr>
                    <th className="p-3">Дисциплина</th>
                    <th className="p-3 text-center">Матчи</th>
                    <th className="p-3 text-center">Победы</th>
                    <th className="p-3 text-center">Поражения</th>
                    <th className="p-3 text-center">Винрейт</th>
                    <th className="p-3 text-right">ELO Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-border">
                  {disciplineStats.map((row: any) => {
                    const winrate = row.matchesCount > 0 ? `${Math.round((row.winsCount / row.matchesCount) * 100)}%` : "0%";
                    const losses = row.matchesCount - row.winsCount;
                    return (
                      <tr key={row.disciplineId} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-semibold text-slate-200">{row.disciplineName}</td>
                        <td className="p-3 text-center font-mono">{row.matchesCount}</td>
                        <td className="p-3 text-center font-mono text-green-400">{row.winsCount}</td>
                        <td className="p-3 text-center font-mono text-red-400">{losses}</td>
                        <td className="p-3 text-center font-mono">{winrate}</td>
                        <td className={`p-3 text-right font-mono font-bold ${row.eloDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {row.eloDelta >= 0 ? `+${row.eloDelta}` : row.eloDelta}
                        </td>
                      </tr>
                    );
                  })}
                  {disciplineStats.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-500 italic font-mono">Пока нет сыгранных матчей в официальных дисциплинах.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teams */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 flex items-center gap-2">
                <Users size={16} className="text-purple-400" />
                Мои команды
              </h3>
              <form onSubmit={handleCreateTeam} className="flex gap-2">
                <input type="text" required placeholder="Название новой команды" className="h-8 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white focus:outline-none" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                <button type="submit" className="h-8 w-8 bg-activeGrad-start hover:bg-red-600 rounded flex items-center justify-center text-white"><Plus size={16} /></button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {joinedTeams.map((team) => {
                const members = teamMembers[team.teamId] || [];
                const captain = isCaptain(team);
                return (
                  <div key={team.teamId} className="component-card-dark p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-sm text-slate-200">{team.teamName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{captain ? "Капитан" : "Состав"}</span>
                        {captain ? (
                          <button onClick={() => handleDisbandTeam(team.teamId, team.teamName)} className="text-[8px] uppercase font-mono px-2 py-0.5 rounded border border-red-900/60 text-red-400 hover:bg-red-950/20">Распустить</button>
                        ) : (
                          <button onClick={() => handleLeaveTeam(team.teamId)} className="text-[8px] uppercase font-mono px-2 py-0.5 rounded border border-red-900/60 text-red-400 hover:bg-red-950/20">Выйти</button>
                        )}
                      </div>
                    </div>

                    {captain && (
                      <div className="flex flex-col gap-2 mb-4">
                        <div className="flex gap-2">
                          <input type="text" placeholder="Никнейм игрока..." className="h-7 flex-1 bg-obsidian-input border border-obsidian-border rounded px-2.5 text-xs text-white focus:outline-none" value={newMemberNickname[team.teamId] || ""} onChange={(e) => setNewMemberNickname((prev) => ({ ...prev, [team.teamId]: e.target.value }))} />
                          <button onClick={() => handleAddMember(team.teamId)} className="h-7 px-3 bg-completeGrad-start hover:bg-blue-600 rounded text-[10px] font-bold uppercase tracking-wider text-white">Добавить</button>
                        </div>
                        <button onClick={() => handleCopyTeamInvite(team.teamId)} className="h-7 px-3 border border-obsidian-border hover:bg-white/5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-300">
                          {copiedTeamId === team.teamId ? "✓ Ссылка скопирована" : "Пригласить по ссылке"}
                        </button>
                      </div>
                    )}

                    {/* Roster */}
                    <div className="flex flex-col gap-1.5">
                      {members.map((mem) => (
                        <div key={mem.playerId} className="flex justify-between items-center text-xs px-2 py-1.5 bg-obsidian-input border border-obsidian-border rounded">
                          <span className="text-slate-300">
                            {mem.nickname}
                            {mem.playerId === team.captainId && <span className="text-[8px] text-yellow-400 ml-2 font-mono uppercase">капитан</span>}
                          </span>
                          {captain && mem.playerId !== team.captainId && (
                            <button onClick={() => handleRemoveMember(team.teamId, mem.playerId)} className="p-1 text-red-400 hover:bg-white/5 rounded"><Trash2 size={12} /></button>
                          )}
                        </div>
                      ))}
                      {members.length === 0 && (
                        <span className="text-[10px] text-slate-500 italic font-mono">Состав пуст</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {joinedTeams.length === 0 && (
                <div className="md:col-span-2 component-card-dark p-6 text-center text-slate-500 text-xs font-mono">Вы пока не состоите ни в одной команде. Создайте свою!</div>
              )}
            </div>
          </div>
        </div>

        {/* Tournament history */}
        <div className="lg:col-span-4">
          <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-6 flex items-center gap-2">
            <Trophy size={16} className="text-activeGrad-start" />
            История турниров ({tournamentsHistory.length})
          </h3>
          <div className="flex flex-col gap-4">
            {tournamentsHistory.map((h) => (
              <div key={h.participantId} className="component-card-dark p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${h.status === "APPROVED" ? "bg-green-950/20 text-green-400 border-green-900" : h.status === "PENDING" ? "bg-yellow-950/20 text-yellow-400 border-yellow-900" : "bg-red-950/20 text-red-400 border-red-900"}`}>
                    {h.status === "APPROVED" ? "Принят" : h.status === "PENDING" ? "Заявка" : "Отклонён"}
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">{new Date(h.joinedAt).toLocaleDateString("ru-RU")}</span>
                </div>
                <h4 onClick={() => router.push(`/tournaments/${h.tournamentId}`)} className="font-bold text-xs text-slate-200 hover:text-completeGrad-mid hover:underline cursor-pointer">{h.tournamentName}</h4>
                <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-obsidian-border text-[9px] text-slate-500 font-medium">
                  <span>{h.disciplineName}</span>
                  <span className="uppercase">{h.bracketType}</span>
                </div>
              </div>
            ))}
            {tournamentsHistory.length === 0 && (
              <div className="component-card-dark p-6 text-center text-slate-500 text-xs font-mono">Вы пока не подавали заявок на участие.</div>
            )}
          </div>
        </div>
      </div>

      {/* Edit profile modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md component-card-dark p-6">
            <h4 className="font-bold text-sm text-slate-200 border-b border-obsidian-border pb-3 mb-4 uppercase tracking-wider">Редактирование профиля</h4>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">ФИО</label>
                <input type="text" className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Контактный телефон</label>
                <input type="tel" className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+7 ..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Новый пароль (оставьте пустым, чтобы не менять)</label>
                <input type="password" minLength={6} className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Минимум 6 символов" />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="h-10 flex-1 border border-obsidian-border hover:bg-white/5 rounded text-xs font-bold uppercase tracking-wider text-slate-400">Отмена</button>
                <button type="submit" className="h-10 flex-1 bg-activeGrad-start hover:bg-red-600 rounded text-xs font-bold uppercase tracking-wider text-white shadow-lg">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
