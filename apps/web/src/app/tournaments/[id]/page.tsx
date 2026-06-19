"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BracketCanvas } from "../../../components/BracketCanvas";
import { FractalAvatar } from "../../../components/FractalAvatar";
import { FractalSeal } from "../../../components/FractalSeal";
import { FractalMedallion } from "../../../components/Fractal";
import { API_URL, apiFetch, fetchProfile, setSession } from "../../../lib/api";
import { useToast } from "../../../components/Toast";
import { useConfirm } from "../../../components/ConfirmDialog";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { Nav } from "../../../components/Nav";
import { Window, Card } from "../../../components/ui/Window";
import { Button } from "../../../components/ui/Button";
import { Badge, tournamentStatusTone } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { Field, Input, Select, Checkbox } from "../../../components/ui/Field";
import { Table } from "../../../components/ui/Table";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import type { TableColumn } from "../../../components/ui/Table";
import {
  Trophy,
  Users,
  Play,
  UserCheck,
  FileXls as FileSpreadsheet,
  UploadSimple as Upload,
  User,
  UserPlus,
  ArrowsClockwise,
  DotsSix as GripHorizontal,
  Television as Tv,
  Calendar,
  ArrowSquareOut as ExternalLink,
  LinkSimple as LinkIcon,
  Check,
  Trash as Trash2,
  Lock,
} from "@phosphor-icons/react";

export default function TournamentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]); // судьи
  const [standings, setStandings] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [disciplineGameType, setDisciplineGameType] = useState<string>("SINGLE");

  // Join
  const [joinTeamId, setJoinTeamId] = useState("");
  const [joining, setJoining] = useState(false);

  // Sandbox manual add
  const [sbNickname, setSbNickname] = useState("");
  const [sbTeamName, setSbTeamName] = useState("");

  // Referee assign
  const [selectedRefereeId, setSelectedRefereeId] = useState("");

  // Score modal
  const [selectedScoringMatch, setSelectedScoringMatch] = useState<any>(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  const [techDefeat, setTechDefeat] = useState(false);
  const [techLoserId, setTechLoserId] = useState("");
  const [confirmedSealHash, setConfirmedSealHash] = useState<string | null>(null);

  // Import
  const [importFile, setImportFile] = useState<File | null>(null);

  // Invite link
  const [inviteCopied, setInviteCopied] = useState(false);

  // Metadata modal
  const [selectedMetadataMatch, setSelectedMetadataMatch] = useState<any>(null);
  const [metadataStreamUrl, setMetadataStreamUrl] = useState("");
  const [metadataInviteLink, setMetadataInviteLink] = useState("");
  const [metadataCustomFields, setMetadataCustomFields] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const prof = await fetchProfile();
      if (!prof) {
        router.push("/login");
        return;
      }
      setCurrentUser(prof);
      setSession(prof);
      setMyTeams((await loadMe()) || []);
      await loadTournamentDetails();
      await loadGlobalUsers();
      setLoading(false);
    })();

    // SSE realtime (cookie-аутентификация)
    const sseUrl = `${API_URL}/tournaments/${params.id}/stream`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });
    eventSource.addEventListener("update", (event: any) => {
      try {
        setMatches(JSON.parse(event.data));
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });
    return () => eventSource.close();
  }, [params.id]);

  const loadMe = async () => {
    try {
      const res = await apiFetch("/users/me");
      if (res.ok) {
        const data = await res.json();
        return data.teams || [];
      }
    } catch (err) {
      console.error(err);
    }
    return [];
  };

  const loadTournamentDetails = async () => {
    try {
      const res = await apiFetch(`/tournaments/${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setTournament(data.tournament);
        setParticipants(data.participants || []);
        setMatches(data.matches || []);
        // Узнаём формат дисциплины (для командной заявки нужен выбор команды)
        try {
          const dRes = await apiFetch("/tournaments/disciplines");
          if (dRes.ok) {
            const discs = await dRes.json();
            const disc = discs.find((d: any) => d.id === data.tournament.disciplineId);
            if (disc) setDisciplineGameType(disc.gameType);
          }
        } catch {}
      } else {
        toast.error(data.error || "Не удалось загрузить турнир");
        router.push("/tournaments");
        return;
      }

      const standRes = await apiFetch(`/tournaments/${params.id}/standings`);
      if (standRes.ok) setStandings(await standRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const loadGlobalUsers = async () => {
    try {
      const res = await apiFetch("/users/referees");
      if (res.ok) setUsersList(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Игрок: подать заявку на участие
  const handleJoin = async () => {
    if (isTeamDiscipline && !joinTeamId) {
      toast.error("Выберите команду для участия в командном турнире");
      return;
    }
    setJoining(true);
    try {
      const res = await apiFetch(`/tournaments/${params.id}/join`, {
        method: "POST",
        body: JSON.stringify(isTeamDiscipline ? { teamId: joinTeamId } : {}),
      });
      const data = await res.json();
      if (res.ok) {
        await loadTournamentDetails();
        toast.success(data.message || "Заявка отправлена!");
      } else {
        toast.error(data.error || "Не удалось подать заявку");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setJoining(false);
    }
  };

  // Организатор SANDBOX: ручное добавление участника строкой
  const handleSandboxAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbNickname.trim()) return;
    try {
      const res = await apiFetch(`/tournaments/${params.id}/participants`, {
        method: "POST",
        body: JSON.stringify({
          nickname: sbNickname.trim(),
          teamName: sbTeamName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSbNickname("");
        setSbTeamName("");
        await loadTournamentDetails();
      } else {
        toast.error(data.error || "Не удалось добавить участника");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleApproveParticipant = async (partId: string) => {
    try {
      const res = await apiFetch(`/tournaments/${params.id}/approve/${partId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) await loadTournamentDetails();
      else toast.error(data.error || "Не удалось одобрить участника");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRejectParticipant = async (partId: string) => {
    if (!(await confirm("Отклонить заявку этого участника?"))) return;
    try {
      const res = await apiFetch(`/tournaments/${params.id}/reject/${partId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) await loadTournamentDetails();
      else toast.error(data.error || "Не удалось отклонить заявку");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveApproved = async (partId: string, name: string) => {
    if (!(await confirm(`Снять участника \"${name}\" с турнира?`))) return;
    try {
      const res = await apiFetch(`/tournaments/${params.id}/reject/${partId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) await loadTournamentDetails();
      else toast.error(data.error || "Не удалось снять участника");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCopyInvite = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // Фолбэк, если clipboard недоступен (http / старый браузер)
      prompt("Скопируйте ссылку-приглашение вручную:", url);
    }
  };

  const handleGenerateBracket = async () => {
    if (!(await confirm("Запустить турнир и сгенерировать сетку? После старта приём заявок закроется."))) return;
    try {
      const res = await apiFetch(`/tournaments/${params.id}/generate-bracket`, { method: "POST" });
      const data = await res.json();
      if (res.ok) await loadTournamentDetails();
      else toast.error(data.error || "Ошибка генерации сетки");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Организатор: следующий тур Swiss
  const handleNextRound = async () => {
    try {
      const res = await apiFetch(`/tournaments/${params.id}/next-round`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await loadTournamentDetails();
        toast.success(data.message || "Следующий тур сгенерирован");
      } else {
        toast.error(data.error || "Не удалось сгенерировать следующий тур");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMassAssignReferee = async () => {
    if (!selectedRefereeId) {
      toast.error("Выберите судью из списка");
      return;
    }
    try {
      const res = await apiFetch(`/tournaments/${params.id}/matches/referee`, {
        method: "PUT",
        body: JSON.stringify({ refereeId: selectedRefereeId }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadTournamentDetails();
        toast.success(data.message || "Судья назначен на все матчи.");
      } else {
        toast.error(data.error || "Ошибка назначения судьи");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    const formData = new FormData();
    formData.append("file", importFile);
    try {
      const res = await apiFetch(`/tournaments/${params.id}/participants/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportFile(null);
        await loadTournamentDetails();
        toast.success(data.message || "Импорт прошёл успешно.");
      } else {
        toast.error(data.error || "Ошибка импорта");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleComplete = async () => {
    if (!(await confirm("Вы уверены, что хотите завершить турнир?"))) return;
    try {
      const res = await apiFetch(`/tournaments/${params.id}/complete`, { method: "POST" });
      if (res.ok) await loadTournamentDetails();
      else toast.error("Не удалось завершить турнир");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Судья: ввод счёта ИЛИ технического поражения
  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScoringMatch) return;

    try {
      let res: Response;
      if (techDefeat) {
        if (!techLoserId) {
          toast.error("Выберите участника, которому засчитывается техническое поражение");
          return;
        }
        res = await apiFetch(`/matches/${selectedScoringMatch.id}/tech-defeat`, {
          method: "POST",
          body: JSON.stringify({ loserParticipantId: techLoserId }),
        });
      } else {
        res = await apiFetch(`/matches/${selectedScoringMatch.id}/score`, {
          method: "POST",
          body: JSON.stringify({ score1, score2, customFieldsData }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setConfirmedSealHash(selectedScoringMatch.id);
        closeScoreModal();
        await loadTournamentDetails();
      } else {
        toast.error(data.error || "Не удалось сохранить результат");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const closeScoreModal = () => {
    setSelectedScoringMatch(null);
    setScore1(0);
    setScore2(0);
    setCustomFieldsData({});
    setTechDefeat(false);
    setTechLoserId("");
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMetadataMatch) return;
    try {
      const mergedFields = {
        ...metadataCustomFields,
        stream_url: metadataStreamUrl.trim() || undefined,
        invite_link: metadataInviteLink.trim() || undefined,
      };
      const res = await apiFetch(`/matches/${selectedMetadataMatch.id}/metadata`, {
        method: "PUT",
        body: JSON.stringify({ customFieldsData: mergedFields }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedMetadataMatch(null);
        setMetadataStreamUrl("");
        setMetadataInviteLink("");
        setMetadataCustomFields({});
        await loadTournamentDetails();
      } else {
        toast.error(data.error || "Не удалось сохранить информацию");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSetMatchReferee = async (matchId: string, refId: string) => {
    try {
      const res = await apiFetch(`/matches/${matchId}/referee`, {
        method: "PUT",
        body: JSON.stringify({ refereeId: refId || undefined }),
      });
      const data = await res.json();
      if (res.ok) await loadTournamentDetails();
      else toast.error(data.error || "Не удалось изменить судью");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openMetadataModal = (m: any) => {
    setSelectedMetadataMatch(m);
    setMetadataStreamUrl(m.customFieldsData?.stream_url || "");
    setMetadataInviteLink(m.customFieldsData?.invite_link || "");
    const otherFields: Record<string, any> = {};
    tournament?.customFieldsSchema?.forEach((f: any) => {
      otherFields[f.name] = m.customFieldsData?.[f.name] || "";
    });
    setMetadataCustomFields(otherFields);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">
          Загрузка сетки...
        </span>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "Admin";
  const isOrganizer = tournament?.organizerId === currentUser?.id;
  const canManage = isOrganizer || isAdmin;
  const isTeamDiscipline = disciplineGameType === "TEAM";
  const pendingParticipants = participants.filter((p) => p.status === "PENDING");
  const approvedParticipants = participants.filter((p) => p.status === "APPROVED");

  const myParticipation = participants.find((p) => p.userId === currentUser?.id);
  const canJoin =
    !canManage &&
    tournament?.tournamentType !== "SANDBOX" &&
    !tournament?.isStarted &&
    !myParticipation;

  // Карта участников для подстановки имён
  const participantMap = new Map<string, any>();
  approvedParticipants.forEach((p) => participantMap.set(p.id, p));
  const nameOf = (id: string | null) => {
    if (!id) return "Ожидание";
    const p = participantMap.get(id);
    return p ? p.teamSnapshot || p.nicknameSnapshot : "Ожидание";
  };

  const myRefereedMatches = matches.filter(
    (m) => (m.refereeId === currentUser?.id || canManage) && !m.winnerId && m.participant1Id && m.participant2Id
  );

  const scoringName1 = selectedScoringMatch ? nameOf(selectedScoringMatch.participant1Id) : "";
  const scoringName2 = selectedScoringMatch ? nameOf(selectedScoringMatch.participant2Id) : "";

  const tournamentStatus = tournament?.isCompleted ? "done" : tournament?.isStarted ? "live" : "draft";
  const tournamentStatusLabel = tournament?.isCompleted ? "Завершен" : tournament?.isStarted ? "Идет" : "Регистрация";

  const standingsColumns: TableColumn<any>[] = [
    { key: "rank", header: "Место", numeric: true, render: (_: any, idx: number) => <span className="font-bold">{idx + 1}</span> },
    { key: "name", header: "Участник", render: (row: any) => <span className="font-semibold">{row.teamName ? `${row.teamName} (${row.nickname})` : row.nickname}</span> },
    { key: "matchesPlayed", header: "Игры", numeric: true },
    { key: "wins", header: "Победы", numeric: true, render: (row: any) => <span className="text-[var(--status-win)]">{row.wins}</span> },
    { key: "losses", header: "Поражения", numeric: true, render: (row: any) => <span className="text-[var(--status-danger)]">{row.losses}</span> },
    { key: "eloChange", header: "Разница ELO", numeric: true, render: (row: any) => <span className={`font-bold ${row.eloChange >= 0 ? "text-[var(--status-win)]" : "text-[var(--status-danger)]"}`}>{row.eloChange >= 0 ? `+${row.eloChange}` : row.eloChange}</span> },
  ];

  return (
    <div className="min-h-screen pb-16 relative">
      {/* Header */}
      <header className="relative z-10 brushed pinstripe border-b border-[var(--border)]" style={{ boxShadow: "0 1px 0 var(--gloss) inset, 0 4px 18px var(--shadow)" }}>
        <div className="max-w-7xl mx-auto px-6 h-[62px] flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => router.push("/tournaments")}>
            &larr; К списку турниров
          </Button>
          <span className="font-display font-bold text-sm tracking-wider uppercase text-[var(--text)]">Турнирная панель</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              Кабинет
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tournament Header */}
        <div className="lg:col-span-12">
          <Window title={tournament?.name} status={tournamentStatus as "live" | "done" | "draft"}>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <FractalMedallion seed={tournament?.id} size={80} />
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-2">
                  <Badge tone="draft">{tournament?.tournamentType}</Badge>
                  <Badge tone="accent">{tournament?.bracketType}</Badge>
                  {tournament?.isPrivate && (
                    <Badge tone="accent"><Lock size={10} weight="bold" /> Приватный</Badge>
                  )}
                  <Badge tone={tournamentStatusTone(tournamentStatusLabel)} dot={tournament?.isStarted && !tournament?.isCompleted}>
                    {tournamentStatusLabel}
                  </Badge>
                </div>
                <h2 className="font-display font-bold text-2xl text-[var(--text)]">{tournament?.name}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-3 text-xs text-[var(--text-muted)]">
                  {tournament?.prizePool && (
                    <span><strong>Призовой фонд:</strong> {tournament.prizePool}</span>
                  )}
                  <span><strong>Взнос:</strong> {tournament?.entryFee > 0 ? `${tournament.entryFee} руб` : "Бесплатно"}</span>
                  <span><strong>Начало:</strong> {new Date(tournament?.startDate).toLocaleDateString("ru-RU")}</span>
                  <span><strong>Участников:</strong> {approvedParticipants.length}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                <Button variant="secondary" size="sm" leftIcon={<Tv size={14} />} onClick={() => router.push(`/tournaments/${params.id}/scoreboard`)}>
                  Табло трансляции
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={inviteCopied ? <Check size={14} /> : <LinkIcon size={14} />}
                  onClick={handleCopyInvite}
                >
                  {inviteCopied ? "Ссылка скопирована" : "Пригласить (ссылка)"}
                </Button>

                {/* Игрок: подать заявку */}
                {canJoin && (
                  <div className="flex items-center gap-2">
                    {isTeamDiscipline && (
                      <Select
                        value={joinTeamId}
                        onChange={(e) => setJoinTeamId(e.target.value)}
                        className="h-[32px] w-auto"
                      >
                        <option value="">-- Ваша команда --</option>
                        {myTeams.map((t) => (
                          <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                        ))}
                      </Select>
                    )}
                    <Button variant="gel" size="sm" leftIcon={<UserPlus size={14} />} onClick={handleJoin} loading={joining} disabled={joining}>
                      {joining ? "Отправка..." : "Подать заявку"}
                    </Button>
                  </div>
                )}

                {/* Статус заявки игрока */}
                {!canManage && myParticipation && (
                  <Badge
                    tone={myParticipation.status === "APPROVED" ? "win" : myParticipation.status === "PENDING" ? "live" : "danger"}
                    className="h-[32px] flex items-center"
                  >
                    {myParticipation.status === "APPROVED" ? "Вы участвуете" : myParticipation.status === "PENDING" ? "Заявка на рассмотрении" : "Заявка отклонена"}
                  </Badge>
                )}

                {canManage && !tournament?.isStarted && (
                  <Button variant="gel" size="sm" leftIcon={<Play size={14} />} onClick={handleGenerateBracket}>
                    Начать турнир
                  </Button>
                )}

                {canManage && tournament?.isStarted && !tournament?.isCompleted && tournament?.bracketType === "SWISS" && (
                  <Button variant="secondary" size="sm" leftIcon={<ArrowsClockwise size={14} />} onClick={handleNextRound}>
                    Следующий тур
                  </Button>
                )}

                {canManage && tournament?.isStarted && !tournament?.isCompleted && (
                  <Button variant="gel" size="sm" leftIcon={<UserCheck size={14} />} onClick={handleComplete}>
                    Завершить
                  </Button>
                )}
              </div>
            </div>
          </Window>
        </div>

        {/* Турнирная сетка */}
        {matches.length > 0 && (
          <div className="lg:col-span-12">
            <div className="flex items-center gap-2 mb-4">
              <GripHorizontal size={16} className="text-[var(--accent)]" />
              <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">
                {tournament?.bracketType === "ROUND_ROBIN"
                  ? "Турнирная таблица (круговая)"
                  : tournament?.bracketType === "SWISS"
                  ? "Туры (швейцарская система)"
                  : "Турнирная сетка (реалтайм)"}
              </span>
            </div>
            <BracketCanvas matches={matches} participants={approvedParticipants} bracketType={tournament?.bracketType} />
          </div>
        )}

        {confirmedSealHash && (
          <div className="lg:col-span-12">
            <Window title="Результат зафиксирован судьей" status="done">
              <div className="flex flex-col items-center justify-center py-10">
                <FractalSeal hash={confirmedSealHash} size={110} />
                <Button variant="ghost" size="sm" className="mt-8" onClick={() => setConfirmedSealHash(null)}>
                  Закрыть
                </Button>
              </div>
            </Window>
          </div>
        )}

        {/* Organizer panels */}
        {canManage && (
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[var(--border)] pt-8">
            {/* SANDBOX ручное добавление */}
            {tournament?.tournamentType === "SANDBOX" && !tournament?.isStarted && (
              <Window title="Добавить участника вручную">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={16} className="text-[var(--status-win)]" />
                  <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Добавить участника вручную</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mb-4 leading-relaxed">
                  Впишите имя участника (или название команды) -- регистрация на платформе не требуется.
                </p>
                <form onSubmit={handleSandboxAdd} className="flex flex-col gap-3">
                  <Field label="ФИО / Никнейм участника">
                    <Input type="text" placeholder="ФИО / Никнейм участника" value={sbNickname} onChange={(e) => setSbNickname(e.target.value)} />
                  </Field>
                  <Field label="Название команды (необязательно)">
                    <Input type="text" placeholder="Название команды (необязательно)" value={sbTeamName} onChange={(e) => setSbTeamName(e.target.value)} />
                  </Field>
                  <Button variant="gel" size="sm" type="submit">Добавить участника</Button>
                </form>
              </Window>
            )}

            {/* Mass referee */}
            <Window title="Назначение судей (массово)">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-[var(--accent)]" />
                <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Назначение судей (массово)</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mb-4 leading-relaxed">
                Назначить одного судью на все незавершённые матчи турнира.
              </p>
              <div className="flex gap-3">
                <Select value={selectedRefereeId} onChange={(e) => setSelectedRefereeId(e.target.value)} className="flex-1">
                  <option value="">-- Выберите арбитра --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>{u.nickname}</option>
                  ))}
                </Select>
                <Button variant="gel" size="sm" onClick={handleMassAssignReferee}>Назначить</Button>
              </div>
            </Window>

            {/* Excel import */}
            {!tournament?.isStarted && (
              <Window title="Пакетный импорт (Excel)">
                <div className="flex items-center gap-2 mb-4">
                  <FileSpreadsheet size={16} className="text-[var(--accent)]" />
                  <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Пакетный импорт (Excel)</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mb-4 leading-relaxed">
                  Таблица `.xlsx`: столбец 1 -- Никнейм, столбец 2 -- Команда (опц.).
                </p>
                <form onSubmit={handleImportExcel} className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".xlsx"
                    required
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="text-xs text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-ctl file:border-0 file:text-xs file:font-semibold file:bg-[var(--panel-sunken)] file:text-[var(--text)] hover:file:bg-[var(--chrome-bot)]"
                  />
                  <Button variant="gel" size="sm" type="submit" leftIcon={<Upload size={14} />}>
                    Загрузить
                  </Button>
                </form>
              </Window>
            )}
          </div>
        )}

        {/* Управление составом участников (организатор) */}
        {canManage && (
          <div className="lg:col-span-12">
            <Window title={`Участники турнира (${approvedParticipants.length})`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[var(--status-done)]" />
                  <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Участники турнира ({approvedParticipants.length})</span>
                </div>
                {!tournament?.isStarted && (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">До старта можно снимать участников</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {approvedParticipants.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-2 bg-[var(--panel-sunken)] border border-[var(--hairline)] rounded-ctl">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[var(--text)] truncate block">{p.teamSnapshot || p.nicknameSnapshot}</span>
                      {p.teamSnapshot && (
                        <span className="text-[8px] text-[var(--text-muted)] font-mono">капитан: {p.nicknameSnapshot}</span>
                      )}
                    </div>
                    {!tournament?.isStarted && (
                      <button
                        onClick={() => handleRemoveApproved(p.id, p.teamSnapshot || p.nicknameSnapshot)}
                        className="p-1.5 shrink-0 text-[var(--status-danger)] hover:bg-[color-mix(in_srgb,var(--status-danger)_10%,transparent)] rounded"
                        title="Снять с турнира"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {approvedParticipants.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState title="Нет участников" hint="Подтверждённых участников пока нет" seed="participants-empty" />
                  </div>
                )}
              </div>
            </Window>
          </div>
        )}

        {/* Approvals + referee scoring */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[var(--border)] pt-8">
          {canManage && (
            <Window title={`Заявки на участие (${pendingParticipants.length})`}>
              <div className="flex items-center gap-2 mb-4">
                <UserCheck size={16} className="text-[var(--status-win)]" />
                <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Заявки на участие ({pendingParticipants.length})</span>
              </div>
              <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-2">
                {pendingParticipants.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-2 bg-[var(--panel-sunken)] border border-[var(--hairline)] rounded-ctl">
                    <div>
                      <span className="text-xs font-semibold text-[var(--text)]">{p.nicknameSnapshot}</span>
                      {p.teamSnapshot && (
                        <Badge tone="draft" className="ml-2">Команда: {p.teamSnapshot}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="gel" size="sm" onClick={() => handleApproveParticipant(p.id)}>Одобрить</Button>
                      <Button variant="danger" size="sm" onClick={() => handleRejectParticipant(p.id)}>Отклонить</Button>
                    </div>
                  </div>
                ))}
                {pendingParticipants.length === 0 && (
                  <EmptyState title="Нет заявок" hint="Нет ожидающих заявок" seed="pending-empty" />
                )}
              </div>
            </Window>
          )}

          {myRefereedMatches.length > 0 && (
            <Window title={`Панель судейства (${myRefereedMatches.length})`} status="live">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-[var(--accent)]" />
                <span className="font-cond font-semibold uppercase text-[12px] text-[var(--text-muted)]">Панель судейства ({myRefereedMatches.length})</span>
              </div>
              <div className="flex flex-col gap-4">
                {myRefereedMatches.map((m) => (
                  <Card key={m.id}>
                    <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-mono pb-2 border-b border-[var(--hairline)]">
                      <span>Раунд {m.round} | Пара {m.position + 1}</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openMetadataModal(m)}>Инфо</Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedScoringMatch(m);
                          setScore1(0);
                          setScore2(0);
                          setCustomFieldsData({});
                          setTechDefeat(false);
                          setTechLoserId("");
                        }}>Ввести счет</Button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text)] mt-2">
                      <span className="truncate max-w-[140px]">{nameOf(m.participant1Id)}</span>
                      <span className="font-bold font-mono">{m.score1 !== null ? m.score1 : "-"}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text)] mt-1">
                      <span className="truncate max-w-[140px]">{nameOf(m.participant2Id)}</span>
                      <span className="font-bold font-mono">{m.score2 !== null ? m.score2 : "-"}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </Window>
          )}
        </div>

        {/* Match list */}
        {matches.length > 0 && (
          <div className="lg:col-span-12 mt-4 border-t border-[var(--border)] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-[var(--accent)]" />
              <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">Расписание и результаты матчей</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((m) => (
                <Card key={m.id}>
                  <div className="flex justify-between items-center text-[9px] text-[var(--text-muted)] font-mono">
                    <span>Раунд {m.round} | Пара {m.position + 1}</span>
                    <Badge tone={m.winnerId ? "done" : "win"} className="text-[8px]">
                      {m.winnerId ? "Завершен" : "Активен"}
                    </Badge>
                  </div>
                  <div className="text-xs font-semibold text-[var(--text)] mt-2">
                    <div className="flex justify-between">
                      <span className="truncate max-w-[120px]">{nameOf(m.participant1Id)}</span>
                      <span className="font-mono font-bold">{m.score1 !== null ? m.score1 : "-"}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="truncate max-w-[120px]">{nameOf(m.participant2Id)}</span>
                      <span className="font-mono font-bold">{m.score2 !== null ? m.score2 : "-"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-[var(--hairline)] items-center justify-between">
                    <div className="flex gap-2">
                      {m.customFieldsData?.stream_url && (
                        <a href={m.customFieldsData.stream_url} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 rounded-ctl bg-[var(--panel-sunken)] border border-[var(--hairline)] text-[8px] text-[var(--text)] hover:text-[var(--accent)] flex items-center gap-1 transition">
                          <Tv size={8} className="text-[var(--status-danger)]" /><span>Стрим</span>
                        </a>
                      )}
                      {m.customFieldsData?.invite_link && (
                        <a href={m.customFieldsData.invite_link} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 rounded-ctl bg-[var(--panel-sunken)] border border-[var(--hairline)] text-[8px] text-[var(--text)] hover:text-[var(--accent)] flex items-center gap-1 transition">
                          <ExternalLink size={8} className="text-[var(--accent)]" /><span>Комната</span>
                        </a>
                      )}
                    </div>
                    {(m.refereeId === currentUser?.id || canManage) && (
                      <Button variant="ghost" size="sm" onClick={() => openMetadataModal(m)}>Инфо</Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Standings */}
        <div className="lg:col-span-12 mt-4 border-t border-[var(--border)] pt-6">
          <Window title="Таблица лидеров турнира">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-[var(--status-done)]" />
              <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">Таблица лидеров турнира</span>
            </div>
            {standings.length > 0 ? (
              <div className="overflow-x-auto">
                <Table
                  columns={standingsColumns}
                  rows={standings}
                  rowKey={(row) => row.participantId}
                />
              </div>
            ) : (
              <EmptyState title="Нет результатов" hint="В турнире пока нет завершённых матчей." seed="standings-empty" />
            )}
          </Window>
        </div>

        {/* Individual referee assignment */}
        {canManage && matches.length > 0 && (
          <div className="lg:col-span-12 border-t border-[var(--border)] pt-6">
            <Window title="Индивидуальное назначение судей по матчам">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-[var(--accent)]" />
                <span className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)]">Индивидуальное назначение судей по матчам</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((m) => (
                  <Card key={m.id}>
                    <div className="flex justify-between items-center text-[9px] text-[var(--text-muted)] font-mono">
                      <span>Раунд {m.round} | Пара {m.position + 1}</span>
                      <Badge tone={m.winnerId ? "done" : "win"} className="text-[8px]">
                        {m.winnerId ? "Завершен" : "Активен"}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-[var(--text)] mt-2">
                      <div className="flex justify-between"><span className="truncate max-w-[120px]">{nameOf(m.participant1Id)}</span><span className="font-mono font-bold">{m.score1 !== null ? m.score1 : "-"}</span></div>
                      <div className="flex justify-between mt-1"><span className="truncate max-w-[120px]">{nameOf(m.participant2Id)}</span><span className="font-mono font-bold">{m.score2 !== null ? m.score2 : "-"}</span></div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[var(--hairline)]">
                      <Field label="Назначенный судья">
                        <Select
                          className="h-7 text-[10px]"
                          value={m.refereeId || ""}
                          onChange={(e) => handleSetMatchReferee(m.id, e.target.value)}
                        >
                          <option value="">-- Без судьи / Организатор --</option>
                          {usersList.map((u) => (<option key={u.id} value={u.id}>{u.nickname}</option>))}
                        </Select>
                      </Field>
                    </div>
                  </Card>
                ))}
              </div>
            </Window>
          </div>
        )}
      </div>

      {/* Scoring modal */}
      <Modal
        open={!!selectedScoringMatch}
        title="Фиксация результата"
        onClose={closeScoreModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeScoreModal}>Отмена</Button>
            <Button variant="gel" type="submit" form="score-form">Подтвердить</Button>
          </>
        }
      >
        {/* Кто играет */}
        <div className="flex justify-between text-xs font-bold text-[var(--text)] mb-4">
          <span className="truncate max-w-[160px]">{scoringName1}</span>
          <span className="text-[var(--text-muted)]">vs</span>
          <span className="truncate max-w-[160px] text-right">{scoringName2}</span>
        </div>

        {/* Переключатель техпоражения */}
        <Checkbox
          label="Техническое поражение"
          checked={techDefeat}
          onChange={(e) => setTechDefeat(e.target.checked)}
          className="mb-4"
        />

        <form id="score-form" onSubmit={handleScoreSubmit} className="flex flex-col gap-4">
          {techDefeat ? (
            <Field label="Кому засчитать поражение">
              <Select required value={techLoserId} onChange={(e) => setTechLoserId(e.target.value)}>
                <option value="">-- Выберите участника --</option>
                {selectedScoringMatch?.participant1Id && (
                  <option value={selectedScoringMatch.participant1Id}>{scoringName1}</option>
                )}
                {selectedScoringMatch?.participant2Id && (
                  <option value={selectedScoringMatch.participant2Id}>{scoringName2}</option>
                )}
              </Select>
            </Field>
          ) : (
            <>
              <div className="flex justify-between items-center gap-4">
                <Field label={scoringName1} className="flex-1">
                  <Input type="number" required min={0} className="text-right font-mono" value={score1} onChange={(e) => setScore1(Number(e.target.value))} />
                </Field>
                <span className="text-xl font-bold font-mono text-[var(--text-muted)] mt-4">:</span>
                <Field label={scoringName2} className="flex-1">
                  <Input type="number" required min={0} className="text-right font-mono" value={score2} onChange={(e) => setScore2(Number(e.target.value))} />
                </Field>
              </div>

              {tournament?.customFieldsSchema && tournament.customFieldsSchema.map((field: any) => (
                <Field key={field.name} label={`${field.label}${field.required ? " *" : ""}`}>
                  <Input
                    type={field.type === "number" ? "number" : "text"}
                    required={field.required}
                    placeholder={`Введите ${field.label.toLowerCase()}`}
                    value={customFieldsData[field.name] || ""}
                    onChange={(e) => {
                      const val = field.type === "number" ? Number(e.target.value) || 0 : e.target.value;
                      setCustomFieldsData((prev) => ({ ...prev, [field.name]: val }));
                    }}
                  />
                </Field>
              ))}
            </>
          )}
        </form>
      </Modal>

      {/* Metadata modal */}
      <Modal
        open={!!selectedMetadataMatch}
        title="Информация о матче"
        onClose={() => setSelectedMetadataMatch(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedMetadataMatch(null)}>Отмена</Button>
            <Button variant="gel" type="submit" form="metadata-form">Сохранить</Button>
          </>
        }
      >
        <form id="metadata-form" onSubmit={handleSaveMetadata} className="flex flex-col gap-4">
          <Field label="Ссылка на стрим / трансляцию">
            <Input type="url" placeholder="https://twitch.tv/..." value={metadataStreamUrl} onChange={(e) => setMetadataStreamUrl(e.target.value)} />
          </Field>
          <Field label="Ссылка-приглашение в комнату (лобби)">
            <Input type="text" placeholder="https://lichess.org/..." value={metadataInviteLink} onChange={(e) => setMetadataInviteLink(e.target.value)} />
          </Field>
          {tournament?.customFieldsSchema && tournament.customFieldsSchema.map((field: any) => (
            <Field key={field.name} label={field.label}>
              <Input
                type={field.type === "number" ? "number" : "text"}
                placeholder={`Введите ${field.label.toLowerCase()}`}
                value={metadataCustomFields[field.name] || ""}
                onChange={(e) => {
                  const val = field.type === "number" ? Number(e.target.value) || 0 : e.target.value;
                  setMetadataCustomFields((prev) => ({ ...prev, [field.name]: val }));
                }}
              />
            </Field>
          ))}
        </form>
      </Modal>
    </div>
  );
}
