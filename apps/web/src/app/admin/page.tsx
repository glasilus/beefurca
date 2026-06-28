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
  Star,
  SealCheck,
  PencilSimple,
} from "@phosphor-icons/react";
import { API_URL, apiFetch, fetchProfile, setSession } from "../../lib/api";
import { Nav } from "../../components/Nav";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { Window, Card } from "../../components/ui/Window";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, Input, Select } from "../../components/ui/Field";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import type { TableColumn } from "../../components/ui/Table";

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

  const [editDisc, setEditDisc] = useState<any>(null);
  const [editDiscName, setEditDiscName] = useState("");
  const [editDiscRules, setEditDiscRules] = useState("");

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

  const handleOpenEdit = (d: any) => {
    setEditDisc(d);
    setEditDiscName(d.name);
    setEditDiscRules(d.rules ?? "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDisc || !editDiscName.trim()) return;
    try {
      const res = await apiFetch(`/admin/disciplines/${editDisc.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editDiscName.trim(),
          rules: editDiscRules.trim() || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditDisc(null);
        loadAdminData();
        toast.success("Дисциплина обновлена");
      } else {
        toast.error(data.error || "Не удалось обновить дисциплину");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteDiscipline = async (id: string, name: string) => {
    if (!(await confirm(`Удалить дисциплину «${name}»? Это действие необратимо.`))) return;
    try {
      const res = await apiFetch(`/admin/disciplines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        loadAdminData();
        toast.success(data.message);
      } else {
        toast.error(data.error || "Не удалось удалить дисциплину");
      }
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
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">Загрузка панели администратора...</span>
      </div>
    );
  }

  const userColumns: TableColumn<any>[] = [
    {
      key: "nickname",
      header: "Пользователь",
      render: (usr) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-[var(--text)]">{usr.nickname}</span>
            <Select
              value={usr.role}
              onChange={(e) => handleUpdateRole(usr.id, e.target.value)}
              className="!w-auto !h-7 !text-[10px] !px-1.5 !py-0"
            >
              <option value="Player">Player</option>
              <option value="Organizer">Organizer</option>
              <option value="Admin">Admin</option>
            </Select>
            {usr.isTrusted && <Badge tone="win"><SealCheck size={10} weight="fill" /> Доверенный</Badge>}
            {usr.isBanned && <Badge tone="danger">Забанен</Badge>}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono truncate block">{usr.email} / ELO по дисциплинам</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Действия",
      render: (usr) => {
        if (usr.id === profile?.id) return null;
        return (
          <div className="flex gap-2 shrink-0">
            <Button
              variant={usr.isTrusted ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleToggleTrust(usr.id, !usr.isTrusted)}
            >
              {usr.isTrusted ? "Снять доверие" : "Доверить"}
            </Button>
            <Button
              variant={usr.isBanned ? "gel" : "danger"}
              size="sm"
              onClick={() => handleToggleBan(usr.id, !usr.isBanned)}
            >
              {usr.isBanned ? "Разбанить" : "Забанить"}
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleSoftDelete(usr.id, usr.nickname)}>
              <Trash2 size={12} />
            </Button>
          </div>
        );
      },
    },
  ];

  const tournamentColumns: TableColumn<any>[] = [
    { key: "name", header: "Название", render: (t) => <span className="font-bold text-[var(--text)]">{t.name}</span> },
    { key: "disciplineName", header: "Дисциплина", render: (t) => <span className="font-mono text-[var(--text-muted)]">{t.disciplineName}</span> },
    { key: "tournamentType", header: "Тип", render: (t) => <span className="font-mono text-[var(--text-muted)]">{t.tournamentType}</span> },
    { key: "bracketType", header: "Сетка", render: (t) => <span className="font-mono text-[var(--text-muted)]">{t.bracketType}</span> },
    {
      key: "status",
      header: "Статус",
      render: (t) => {
        if (t.isCompleted) return <Badge tone="draft">Завершён</Badge>;
        if (t.isStarted) return <Badge tone="live" dot>Активен</Badge>;
        return <Badge tone="win">Регистрация</Badge>;
      },
    },
    {
      key: "action",
      header: "Действие",
      render: (t) => (
        <Button variant="secondary" size="sm" onClick={() => router.push(`/tournaments/${t.id}`)}>
          Перейти
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen pb-16 relative">
      <Nav active="admin" profile={profile} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-12">
          <PageHeader
            title="Панель управления системой"
            eyebrow="Администрирование"
            actions={
              <Badge tone="accent">
                <Shield size={12} weight="fill" /> Администратор
              </Badge>
            }
          />
          <p className="text-xs text-[var(--text-muted)] -mt-4 mb-6">
            Дисциплины, управление пользователями (роли, бан, доверие, удаление) и выгрузка Excel-отчётов.
          </p>
        </div>

        {/* Users */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Window title={`Пользователи в системе (${usersList.length})`} status="done">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-[var(--accent)]" />
              <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">
                Управление пользователями
              </span>
            </div>
            <div className="overflow-y-auto max-h-[460px] pr-2">
              <Table
                columns={userColumns}
                rows={usersList}
                rowKey={(row) => row.id}
              />
            </div>
          </Window>
        </div>

        {/* Disciplines + Reports */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Window title="Добавить дисциплину">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={16} className="text-[var(--accent)]" />
              <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Новая дисциплина</span>
            </div>
            <form onSubmit={handleCreateDiscipline} className="flex flex-col gap-4">
              <Field label="Название *">
                <Input type="text" required placeholder="Например: Counter-Strike 2" value={newDiscName} onChange={(e) => setNewDiscName(e.target.value)} />
              </Field>
              <Field label="Формат игры *">
                <Select value={newDiscGameType} onChange={(e) => setNewDiscGameType(e.target.value)}>
                  <option value="SINGLE">Одиночная (1v1)</option>
                  <option value="TEAM">Командная (Team Roster)</option>
                </Select>
              </Field>
              <Field label="Описание правил">
                <textarea
                  placeholder="Базовые правила..."
                  rows={2}
                  className="w-full p-2.5 text-[14px] font-sans text-[var(--text)] bg-[var(--panel-sunken)] border border-[var(--border)] rounded-ctl shadow-[inset_0_2px_4px_rgba(0,0,0,.12)] outline-none focus:border-[var(--accent)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,.12),0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)] placeholder:text-[var(--text-muted)]"
                  value={newDiscRules}
                  onChange={(e) => setNewDiscRules(e.target.value)}
                />
              </Field>
              <Button type="submit" variant="gel" size="sm">Сохранить дисциплину</Button>
            </form>
          </Window>

          {/* Список дисциплин с возможностью промоута до официальной */}
          <Window title={`Справочник дисциплин (${disciplinesList.length})`}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-[var(--accent)]" />
              <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Дисциплины</span>
            </div>
            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
              {disciplinesList.map((d) => (
                <div key={d.id} className="flex justify-between items-start p-2.5 bg-[var(--panel-sunken)] border border-[var(--hairline)] rounded-ctl text-xs gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--text)]">{d.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {d.gameType === "TEAM" ? "командная" : "одиночная"}
                      </span>
                      {d.isOfficial && (
                        <Badge tone="done">
                          <Star size={10} weight="fill" /> офиц.
                        </Badge>
                      )}
                    </div>
                    {d.rules && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">{d.rules}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant={d.isOfficial ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleToggleOfficial(d.id, !d.isOfficial)}
                    >
                      {d.isOfficial ? "Понизить" : "Офиц."}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(d)}
                    >
                      <PencilSimple size={12} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteDiscipline(d.id, d.name)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
              {disciplinesList.length === 0 && (
                <EmptyState title="Нет дисциплин" hint="Дисциплин пока нет" seed="disc-empty" />
              )}
            </div>
          </Window>

          <Window title="Агрегированные Excel-отчёты">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={16} className="text-[var(--status-win)]" />
              <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Отчёты</span>
            </div>
            <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-[var(--hairline)]">
              <span className="text-xs font-bold text-[var(--text)] font-mono">Популярность дисциплин</span>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" className="h-8 text-[10px] font-mono" value={popReportStart} onChange={(e) => setPopReportStart(e.target.value)} />
                <Input type="date" className="h-8 text-[10px] font-mono" value={popReportEnd} onChange={(e) => setPopReportEnd(e.target.value)} />
              </div>
              <Button variant="gel" size="sm" onClick={handleDownloadPopularityReport} leftIcon={<Download size={12} />}>
                Скачать отчёт
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-[var(--text)] font-mono">Индивидуальный отчёт игрока</span>
              <Select className="h-8 text-[10px]" value={playerReportUserId} onChange={(e) => setPlayerReportUserId(e.target.value)}>
                <option value="">-- Выберите игрока --</option>
                {usersList.map((u) => (<option key={u.id} value={u.id}>{u.nickname} ({u.role})</option>))}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" className="h-8 text-[10px] font-mono" value={playerReportStart} onChange={(e) => setPlayerReportStart(e.target.value)} />
                <Input type="date" className="h-8 text-[10px] font-mono" value={playerReportEnd} onChange={(e) => setPlayerReportEnd(e.target.value)} />
              </div>
              <Button variant="gel" size="sm" onClick={handleDownloadPlayerReport} leftIcon={<Download size={12} />}>
                Сформировать отчёт
              </Button>
            </div>
          </Window>
        </div>

        {/* Edit discipline modal */}
        {editDisc && (
          <Modal open={!!editDisc} onClose={() => setEditDisc(null)} title={`Редактировать дисциплину`}>
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <Field label="Название *">
                <Input
                  type="text"
                  required
                  value={editDiscName}
                  onChange={(e) => setEditDiscName(e.target.value)}
                />
              </Field>
              <Field label="Правила и регламент">
                <textarea
                  rows={4}
                  className="w-full p-2.5 text-[14px] font-sans text-[var(--text)] bg-[var(--panel-sunken)] border border-[var(--border)] rounded-ctl shadow-[inset_0_2px_4px_rgba(0,0,0,.12)] outline-none focus:border-[var(--accent)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,.12),0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)] placeholder:text-[var(--text-muted)]"
                  value={editDiscRules}
                  onChange={(e) => setEditDiscRules(e.target.value)}
                  placeholder="Базовые правила..."
                />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditDisc(null)}>
                  Отмена
                </Button>
                <Button type="submit" variant="gel" size="sm">
                  Сохранить
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Tournaments */}
        <div className="lg:col-span-12 mt-6">
          <Window title={`Все турниры (${tournamentsList.length})`} status={tournamentsList.some(t => t.isStarted && !t.isCompleted) ? "live" : null}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-[var(--accent)]" />
              <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Все турниры</span>
            </div>
            <div className="overflow-x-auto">
              {tournamentsList.length > 0 ? (
                <Table
                  columns={tournamentColumns}
                  rows={tournamentsList}
                  rowKey={(row) => row.id}
                />
              ) : (
                <EmptyState title="Нет турниров" hint="В системе пока нет турниров." seed="tournaments-admin-empty" />
              )}
            </div>
          </Window>
        </div>
      </div>
    </div>
  );
}
