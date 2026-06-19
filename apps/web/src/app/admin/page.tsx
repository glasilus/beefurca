"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  FileXls as FileSpreadsheet,
  Plus,
  Download,
  Trophy,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { API_URL, apiFetch, fetchProfile, setSession } from "../../lib/api";
import { Nav } from "../../components/Nav";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";

export default function AdminPanelPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [tournamentsList, setTournamentsList] = useState<any[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<any[]>([]);

  const [newDiscName, setNewDiscName] = useState("");
  const [newDiscGameType, setNewDiscGameType] = useState("SINGLE");
  const [newDiscRules, setNewDiscRules] = useState("");

  const [popReportStart, setPopReportStart] = useState("");
  const [popReportEnd, setPopReportEnd] = useState("");
  const [playerReportUserId, setPlayerReportUserId] = useState("");
  const [playerReportStart, setPlayerReportStart] = useState("");
  const [playerReportEnd, setPlayerReportEnd] = useState("");

  useEffect(() => {
    (async () => {
      const prof = await fetchProfile();
      if (!prof) {
        router.push("/login");
        return;
      }
      if (prof.role !== "Admin") {
        toast.error("Доступ только для администраторов.");
        router.push("/dashboard");
        return;
      }
      setProfile(prof);
      setSession(prof);
      await loadAdminData();
      setLoading(false);
    })();
  }, []);

  const loadAdminData = async () => {
    try {
      const [usersRes, tourRes, discRes] = await Promise.all([
        apiFetch("/admin/users"),
        apiFetch("/tournaments"),
        apiFetch("/tournaments/disciplines"),
      ]);
      if (usersRes.ok) setUsersList(await usersRes.json());
      if (tourRes.ok) setTournamentsList(await tourRes.json());
      if (discRes.ok) setDisciplinesList(await discRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBan = async (userId: string, isBanned: boolean) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}/ban`, { method: "PUT", body: JSON.stringify({ isBanned }) });
      const data = await res.json();
      if (res.ok) loadAdminData();
      else toast.error(data.error || "Не удалось изменить статус бана");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleTrust = async (userId: string, isTrusted: boolean) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}/trust`, { method: "PUT", body: JSON.stringify({ isTrusted }) });
      const data = await res.json();
      if (res.ok) loadAdminData();
      else toast.error(data.error || "Не удалось изменить доверие");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) });
      const data = await res.json();
      if (res.ok) loadAdminData();
      else toast.error(data.error || "Не удалось изменить роль");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSoftDelete = async (userId: string, nickname: string) => {
    if (!(await confirm(`Удалить пользователя ${nickname}? Данные обезличатся, история сохранится.`))) return;
    try {
      const res = await apiFetch(`/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) loadAdminData();
      else toast.error(data.error || "Не удалось удалить пользователя");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscName.trim()) return;
    try {
      const res = await apiFetch("/admin/disciplines", {
        method: "POST",
        body: JSON.stringify({ name: newDiscName, gameType: newDiscGameType, rules: newDiscRules || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewDiscName("");
        setNewDiscRules("");
        loadAdminData();
      } else toast.error(data.error || "Не удалось создать дисциплину");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleOfficial = async (id: string, isOfficial: boolean) => {
    try {
      const res = await apiFetch(`/admin/disciplines/${id}/official`, {
        method: "PUT",
        body: JSON.stringify({ isOfficial }),
      });
      const data = await res.json();
      if (res.ok) loadAdminData();
      else toast.error(data.error || "Не удалось изменить статус дисциплины");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Отчёты: top-level навигация на API-домен — cookie-сессия отправится автоматически.
  const handleDownloadPopularityReport = () => {
    let url = `${API_URL}/admin/reports/popularity`;
    const params = [];
    if (popReportStart) params.push(`startDate=${popReportStart}`);
    if (popReportEnd) params.push(`endDate=${popReportEnd}`);
    if (params.length) url += `?${params.join("&")}`;
    window.open(url, "_blank");
  };

  const handleDownloadPlayerReport = () => {
    if (!playerReportUserId) {
      toast.error("Выберите игрока для отчёта");
      return;
    }
    let url = `${API_URL}/admin/reports/player/${playerReportUserId}`;
    const params = [];
    if (playerReportStart) params.push(`startDate=${playerReportStart}`);
    if (playerReportEnd) params.push(`endDate=${playerReportEnd}`);
    if (params.length) url += `?${params.join("&")}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-base flex items-center justify-center text-white">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">Загрузка панели администратора...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-base text-white pb-16 relative">
      <div className="absolute inset-0 dither-overlay z-0" />
      <Nav active="admin" profile={profile} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <h2 className="text-2xl font-bold tracking-wider uppercase flex items-center gap-2.5">
            <Shield className="text-activeGrad-start" size={24} />
            Панель управления системой
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Дисциплины, управление пользователями (роли, бан, доверие, удаление) и выгрузка Excel-отчётов.
          </p>
        </div>

        {/* Users */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="component-card-dark p-6">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              Пользователи в системе ({usersList.length})
            </h3>
            <div className="overflow-y-auto max-h-[460px] pr-2 flex flex-col gap-3">
              {usersList.map((usr) => (
                <div key={usr.id} className="p-3 bg-obsidian-input border border-obsidian-border rounded flex justify-between items-center text-xs gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-slate-200">{usr.nickname}</span>
                      <select value={usr.role} onChange={(e) => handleUpdateRole(usr.id, e.target.value)} className="bg-slate-800 text-[10px] text-slate-300 border border-slate-700 rounded px-1.5 py-0.5 font-mono cursor-pointer focus:outline-none">
                        <option value="Player">Player</option>
                        <option value="Organizer">Organizer</option>
                        <option value="Admin">Admin</option>
                      </select>
                      {usr.isTrusted && (<span className="text-[7px] uppercase font-mono px-1 py-0.5 rounded bg-green-950/20 text-green-400 border border-green-900 font-bold">Доверенный</span>)}
                      {usr.isBanned && (<span className="text-[7px] uppercase font-mono px-1 py-0.5 rounded bg-red-950/20 text-red-400 border border-red-900 font-bold">Забанен</span>)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono truncate block">{usr.email} • {usr.elo} ELO</span>
                  </div>

                  {usr.id !== profile?.id && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleTrust(usr.id, !usr.isTrusted)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition border ${usr.isTrusted ? "bg-yellow-950/20 text-yellow-400 border-yellow-900" : "bg-green-950/20 text-green-400 border-green-900"}`}
                      >
                        {usr.isTrusted ? "Снять доверие" : "Доверить"}
                      </button>
                      <button
                        onClick={() => handleToggleBan(usr.id, !usr.isBanned)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${usr.isBanned ? "bg-green-700 hover:bg-green-600 text-white" : "bg-red-700 hover:bg-red-600 text-white"}`}
                      >
                        {usr.isBanned ? "Разбанить" : "Забанить"}
                      </button>
                      <button onClick={() => handleSoftDelete(usr.id, usr.nickname)} className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-red-900/60 text-red-400 hover:bg-red-950/20">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disciplines + Reports */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="component-card-dark p-6">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Plus size={16} className="text-activeGrad-start" />
              Добавить дисциплину
            </h3>
            <form onSubmit={handleCreateDiscipline} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Название *</label>
                <input type="text" required placeholder="Например: Counter-Strike 2" className="h-9 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white" value={newDiscName} onChange={(e) => setNewDiscName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Формат игры *</label>
                <select className="h-9 bg-obsidian-input border border-obsidian-border rounded px-2 text-xs text-white" value={newDiscGameType} onChange={(e) => setNewDiscGameType(e.target.value)}>
                  <option value="SINGLE">Одиночная (1v1)</option>
                  <option value="TEAM">Командная (Team Roster)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Описание правил</label>
                <textarea placeholder="Базовые правила..." rows={2} className="bg-obsidian-input border border-obsidian-border rounded p-2.5 text-xs text-white focus:outline-none focus:border-activeGrad-start" value={newDiscRules} onChange={(e) => setNewDiscRules(e.target.value)} />
              </div>
              <button type="submit" className="h-9 bg-activeGrad-start hover:bg-red-600 rounded text-xs font-bold uppercase tracking-wider text-white transition mt-2">Сохранить дисциплину</button>
            </form>
          </div>

          {/* Список дисциплин с возможностью промоута до официальной */}
          <div className="component-card-dark p-6">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-completeGrad-mid" />
              Справочник дисциплин ({disciplinesList.length})
            </h3>
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
              {disciplinesList.map((d) => (
                <div key={d.id} className="flex justify-between items-center p-2 bg-obsidian-input border border-obsidian-border rounded text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-200">{d.name}</span>
                    <span className="text-[9px] text-slate-500 font-mono ml-2">
                      {d.gameType === "TEAM" ? "командная" : "одиночная"}
                    </span>
                    {d.isOfficial && (
                      <span className="text-[7px] uppercase font-mono px-1 py-0.5 rounded bg-completeGrad-start/10 text-completeGrad-mid border border-completeGrad-start/30 font-bold ml-2">★ офиц.</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleOfficial(d.id, !d.isOfficial)}
                    className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                      d.isOfficial
                        ? "border-slate-700 text-slate-400 hover:bg-white/5"
                        : "border-completeGrad-start/40 text-completeGrad-mid hover:bg-completeGrad-start/10"
                    }`}
                  >
                    {d.isOfficial ? "Понизить" : "Сделать офиц."}
                  </button>
                </div>
              ))}
              {disciplinesList.length === 0 && (
                <div className="text-[10px] text-slate-500 italic font-mono text-center py-2">Дисциплин пока нет</div>
              )}
            </div>
          </div>

          <div className="component-card-dark p-6">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-green-400" />
              Агрегированные Excel-отчёты
            </h3>
            <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-obsidian-border/50">
              <span className="text-xs font-bold text-slate-300 font-mono">Популярность дисциплин</span>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="h-8 bg-obsidian-input border border-obsidian-border rounded px-2 text-[10px] text-white font-mono" value={popReportStart} onChange={(e) => setPopReportStart(e.target.value)} />
                <input type="date" className="h-8 bg-obsidian-input border border-obsidian-border rounded px-2 text-[10px] text-white font-mono" value={popReportEnd} onChange={(e) => setPopReportEnd(e.target.value)} />
              </div>
              <button onClick={handleDownloadPopularityReport} className="h-8 bg-green-700 hover:bg-green-600 rounded text-[10px] font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition"><Download size={12} />Скачать отчёт</button>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-300 font-mono">Индивидуальный отчёт игрока</span>
              <select className="h-8 bg-obsidian-input border border-obsidian-border rounded px-2 text-[10px] text-white" value={playerReportUserId} onChange={(e) => setPlayerReportUserId(e.target.value)}>
                <option value="">-- Выберите игрока --</option>
                {usersList.map((u) => (<option key={u.id} value={u.id}>{u.nickname} ({u.role})</option>))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="h-8 bg-obsidian-input border border-obsidian-border rounded px-2 text-[10px] text-white font-mono" value={playerReportStart} onChange={(e) => setPlayerReportStart(e.target.value)} />
                <input type="date" className="h-8 bg-obsidian-input border border-obsidian-border rounded px-2 text-[10px] text-white font-mono" value={playerReportEnd} onChange={(e) => setPlayerReportEnd(e.target.value)} />
              </div>
              <button onClick={handleDownloadPlayerReport} className="h-8 bg-green-700 hover:bg-green-600 rounded text-[10px] font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition"><Download size={12} />Сформировать отчёт</button>
            </div>
          </div>
        </div>

        {/* Tournaments */}
        <div className="lg:col-span-12 mt-6">
          <div className="component-card-dark p-6">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-completeGrad-mid" />
              Все турниры ({tournamentsList.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-obsidian-border text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Название</th>
                    <th className="p-3.5">Дисциплина</th>
                    <th className="p-3.5">Тип</th>
                    <th className="p-3.5">Сетка</th>
                    <th className="p-3.5 text-center">Статус</th>
                    <th className="p-3.5 text-right pr-6">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-border">
                  {tournamentsList.map((t) => {
                    let statusLabel = "Регистрация";
                    let statusColor = "bg-green-950/20 text-green-400 border border-green-900";
                    if (t.isCompleted) { statusLabel = "Завершён"; statusColor = "bg-slate-900 text-slate-400 border border-slate-700"; }
                    else if (t.isStarted) { statusLabel = "Активен"; statusColor = "bg-activeGrad-start/20 text-activeGrad-start border border-activeGrad-start"; }
                    return (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-bold text-slate-200">{t.name}</td>
                        <td className="p-3.5 font-mono text-slate-400">{t.disciplineName}</td>
                        <td className="p-3.5 font-mono text-slate-400">{t.tournamentType}</td>
                        <td className="p-3.5 font-mono text-slate-400">{t.bracketType}</td>
                        <td className="p-3.5 text-center"><span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${statusColor}`}>{statusLabel}</span></td>
                        <td className="p-3.5 text-right pr-6">
                          <button onClick={() => router.push(`/tournaments/${t.id}`)} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition">Перейти</button>
                        </td>
                      </tr>
                    );
                  })}
                  {tournamentsList.length === 0 && (<tr><td colSpan={6} className="p-8 text-center text-slate-500 font-mono italic">В системе пока нет турниров.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
