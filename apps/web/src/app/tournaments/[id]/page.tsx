"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BracketCanvas } from "../../../components/BracketCanvas";
import { FractalAvatar } from "../../../components/FractalAvatar";
import { FractalSeal } from "../../../components/FractalSeal";
import { API_URL, apiFetch, fetchProfile, setSession } from "../../../lib/api";
import { useToast } from "../../../components/Toast";
import { useConfirm } from "../../../components/ConfirmDialog";
import { ThemeToggle } from "../../../components/ThemeToggle";
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
    if (!(await confirm(`Снять участника «${name}» с турнира?`))) return;
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
      <div className="min-h-screen bg-obsidian-base flex items-center justify-center text-white">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">
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

  return (
    <div className="min-h-screen bg-obsidian-base text-white pb-16 relative">
      <div className="absolute inset-0 dither-overlay z-0" />

      <header className="relative z-10 border-b border-obsidian-border bg-obsidian-panel/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <button
            onClick={() => router.push("/tournaments")}
            className="text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            ← К списку турниров
          </button>
          <span className="font-extrabold text-sm tracking-wider uppercase">Турнирная панель</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Кабинет
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tournament Header */}
        <div className="lg:col-span-12 component-card-dark p-6 flex flex-col md:flex-row gap-6 items-center">
          <FractalAvatar seed={tournament?.id} size={80} />
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-2">
              <span className="text-xs font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded">
                {tournament?.tournamentType}
              </span>
              <span className="text-xs font-mono text-completeGrad-mid bg-completeGrad-start/10 border border-completeGrad-start/20 px-2.5 py-0.5 rounded uppercase">
                {tournament?.bracketType}
              </span>
              {tournament?.isPrivate && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-950/30 text-purple-300 border border-purple-800">🔒 Приватный</span>
              )}
              {tournament?.isCompleted ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">Завершён</span>
              ) : tournament?.isStarted ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-activeGrad-start/20 text-activeGrad-start border border-activeGrad-start">Идёт</span>
              ) : (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-green-950/20 text-green-400 border border-green-900">Регистрация</span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-100">{tournament?.name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-3 text-xs text-slate-400">
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
            <button
              onClick={() => router.push(`/tournaments/${params.id}/scoreboard`)}
              className="h-11 px-5 border border-obsidian-border hover:bg-white/5 rounded text-xs font-bold uppercase tracking-wider text-slate-300 transition flex items-center gap-2"
            >
              <Tv size={14} className="text-completeGrad-mid" />
              Табло трансляции
            </button>

            <button
              onClick={handleCopyInvite}
              className="h-11 px-5 border border-obsidian-border hover:bg-white/5 rounded text-xs font-bold uppercase tracking-wider text-slate-300 transition flex items-center gap-2"
              title="Скопировать ссылку-приглашение на турнир"
            >
              {inviteCopied ? <Check size={14} className="text-green-400" /> : <LinkIcon size={14} className="text-completeGrad-mid" />}
              {inviteCopied ? "Ссылка скопирована" : "Пригласить (ссылка)"}
            </button>

            {/* Игрок: подать заявку */}
            {canJoin && (
              <div className="flex items-center gap-2">
                {isTeamDiscipline && (
                  <select
                    value={joinTeamId}
                    onChange={(e) => setJoinTeamId(e.target.value)}
                    className="h-11 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white"
                  >
                    <option value="">-- Ваша команда --</option>
                    {myTeams.map((t) => (
                      <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="h-11 px-6 bg-completeGrad-start hover:bg-blue-600 rounded text-xs font-bold uppercase tracking-wider text-white shadow-lg transition flex items-center gap-2 disabled:opacity-60"
                >
                  <UserPlus size={14} />
                  {joining ? "Отправка..." : "Подать заявку"}
                </button>
              </div>
            )}

            {/* Статус заявки игрока */}
            {!canManage && myParticipation && (
              <span className={`h-11 px-4 inline-flex items-center rounded text-xs font-bold uppercase tracking-wider border ${
                myParticipation.status === "APPROVED"
                  ? "bg-green-950/20 text-green-400 border-green-900"
                  : myParticipation.status === "PENDING"
                  ? "bg-yellow-950/20 text-yellow-400 border-yellow-900"
                  : "bg-red-950/20 text-red-400 border-red-900"
              }`}>
                {myParticipation.status === "APPROVED" ? "Вы участвуете" : myParticipation.status === "PENDING" ? "Заявка на рассмотрении" : "Заявка отклонена"}
              </span>
            )}

            {canManage && !tournament?.isStarted && (
              <button
                onClick={handleGenerateBracket}
                className="h-11 px-6 bg-activeGrad-start hover:bg-red-600 rounded text-xs font-bold uppercase tracking-wider text-white shadow-lg transition flex items-center gap-2"
              >
                <Play size={14} />
                Начать турнир
              </button>
            )}

            {canManage && tournament?.isStarted && !tournament?.isCompleted && tournament?.bracketType === "SWISS" && (
              <button
                onClick={handleNextRound}
                className="h-11 px-5 bg-completeGrad-start hover:bg-blue-600 rounded text-xs font-bold uppercase tracking-wider text-white transition flex items-center gap-2"
              >
                <ArrowsClockwise size={14} />
                Следующий тур
              </button>
            )}

            {canManage && tournament?.isStarted && !tournament?.isCompleted && (
              <button
                onClick={handleComplete}
                className="h-11 px-6 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-bold uppercase tracking-wider transition flex items-center gap-2"
              >
                <UserCheck size={14} />
                Завершить
              </button>
            )}
          </div>
        </div>

        {/* Турнирная сетка — своя визуализация под каждый формат:
            дерево (Single), две дорожки (Double), кросс-таблица (Round Robin),
            колонки по турам (Swiss). */}
        {matches.length > 0 && (
          <div className="lg:col-span-12">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <GripHorizontal size={16} className="text-activeGrad-start" />
              {tournament?.bracketType === "ROUND_ROBIN"
                ? "Турнирная таблица (круговая)"
                : tournament?.bracketType === "SWISS"
                ? "Туры (швейцарская система)"
                : "Турнирная сетка (реалтайм)"}
            </h3>
            <BracketCanvas matches={matches} participants={approvedParticipants} bracketType={tournament?.bracketType} />
          </div>
        )}

        {confirmedSealHash && (
          <div className="lg:col-span-12 component-card-dark p-6 border-completeGrad-start flex flex-col items-center justify-center py-10">
            <h4 className="text-sm font-bold uppercase tracking-wider text-completeGrad-mid mb-6">
              Результат зафиксирован судьёй
            </h4>
            <FractalSeal hash={confirmedSealHash} size={110} />
            <button
              onClick={() => setConfirmedSealHash(null)}
              className="mt-8 text-xs font-mono text-slate-500 hover:text-slate-300 underline"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Organizer panels */}
        {canManage && (
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-obsidian-border pt-8">
            {/* SANDBOX ручное добавление */}
            {tournament?.tournamentType === "SANDBOX" && !tournament?.isStarted && (
              <div className="component-card-dark p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                  <UserPlus size={16} className="text-green-400" />
                  Добавить участника вручную
                </h3>
                <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                  Впишите имя участника (или название команды) — регистрация на платформе не требуется.
                </p>
                <form onSubmit={handleSandboxAdd} className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="ФИО / Никнейм участника"
                    className="h-9 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white"
                    value={sbNickname}
                    onChange={(e) => setSbNickname(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Название команды (необязательно)"
                    className="h-9 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white"
                    value={sbTeamName}
                    onChange={(e) => setSbTeamName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="h-9 bg-green-700 hover:bg-green-600 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                  >
                    Добавить участника
                  </button>
                </form>
              </div>
            )}

            {/* Mass referee */}
            <div className="component-card-dark p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <User size={16} className="text-purple-400" />
                Назначение судей (массово)
              </h3>
              <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                Назначить одного судью на все незавершённые матчи турнира.
              </p>
              <div className="flex gap-3">
                <select
                  className="h-10 flex-1 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white"
                  value={selectedRefereeId}
                  onChange={(e) => setSelectedRefereeId(e.target.value)}
                >
                  <option value="">-- Выберите арбитра --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>{u.nickname}</option>
                  ))}
                </select>
                <button
                  onClick={handleMassAssignReferee}
                  className="h-10 px-4 bg-completeGrad-start hover:bg-blue-600 rounded text-xs font-bold uppercase tracking-wider text-white"
                >
                  Назначить
                </button>
              </div>
            </div>

            {/* Excel import */}
            {!tournament?.isStarted && (
              <div className="component-card-dark p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-activeGrad-start" />
                  Пакетный импорт (Excel)
                </h3>
                <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                  Таблица `.xlsx`: столбец 1 — Никнейм, столбец 2 — Команда (опц.).
                </p>
                <form onSubmit={handleImportExcel} className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".xlsx"
                    required
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                  />
                  <button
                    type="submit"
                    className="h-9 px-4 bg-activeGrad-start hover:bg-red-600 rounded text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2"
                  >
                    <Upload size={14} />
                    Загрузить
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Управление составом участников (организатор) */}
        {canManage && (
          <div className="lg:col-span-12 component-card-dark p-5 border-t border-obsidian-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users size={16} className="text-completeGrad-mid" />
                Участники турнира ({approvedParticipants.length})
              </h3>
              {!tournament?.isStarted && (
                <span className="text-[10px] text-slate-500 font-mono">До старта можно снимать участников</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
              {approvedParticipants.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-2 bg-obsidian-input border border-obsidian-border rounded">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200 truncate block">{p.teamSnapshot || p.nicknameSnapshot}</span>
                    {p.teamSnapshot && (
                      <span className="text-[8px] text-slate-500 font-mono">капитан: {p.nicknameSnapshot}</span>
                    )}
                  </div>
                  {!tournament?.isStarted && (
                    <button
                      onClick={() => handleRemoveApproved(p.id, p.teamSnapshot || p.nicknameSnapshot)}
                      className="p-1.5 shrink-0 text-red-400 hover:bg-white/5 rounded"
                      title="Снять с турнира"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {approvedParticipants.length === 0 && (
                <div className="col-span-full text-xs text-slate-500 italic font-mono text-center py-4">Подтверждённых участников пока нет</div>
              )}
            </div>
          </div>
        )}

        {/* Approvals + referee scoring */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-obsidian-border pt-8">
          {canManage && (
            <div className="component-card-dark p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <UserCheck size={16} className="text-green-400" />
                Заявки на участие ({pendingParticipants.length})
              </h3>
              <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-2">
                {pendingParticipants.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-2 bg-obsidian-input border border-obsidian-border rounded">
                    <div>
                      <span className="text-xs font-semibold text-slate-200">{p.nicknameSnapshot}</span>
                      {p.teamSnapshot && (
                        <span className="text-[8px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-400 ml-2">
                          Команда: {p.teamSnapshot}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveParticipant(p.id)}
                        className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                      >
                        Одобрить
                      </button>
                      <button
                        onClick={() => handleRejectParticipant(p.id)}
                        className="px-3 py-1 rounded border border-red-900/60 text-red-400 hover:bg-red-950/20 text-[10px] font-bold uppercase tracking-wider"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
                {pendingParticipants.length === 0 && (
                  <div className="text-xs text-slate-500 italic font-mono text-center py-4">Нет ожидающих заявок</div>
                )}
              </div>
            </div>
          )}

          {myRefereedMatches.length > 0 && (
            <div className="component-card-dark p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-activeGrad-start" />
                Панель судейства ({myRefereedMatches.length})
              </h3>
              <div className="flex flex-col gap-4">
                {myRefereedMatches.map((m) => (
                  <div key={m.id} className="p-3.5 bg-obsidian-input border border-obsidian-border rounded flex flex-col gap-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pb-2 border-b border-obsidian-border">
                      <span>Раунд {m.round} • Пара {m.position + 1}</span>
                      <div className="flex gap-2">
                        <button onClick={() => openMetadataModal(m)} className="text-completeGrad-mid hover:underline uppercase font-bold text-[9px]">Инфо</button>
                        <button
                          onClick={() => {
                            setSelectedScoringMatch(m);
                            setScore1(0);
                            setScore2(0);
                            setCustomFieldsData({});
                            setTechDefeat(false);
                            setTechLoserId("");
                          }}
                          className="text-activeGrad-start hover:underline uppercase font-bold text-[9px]"
                        >
                          Ввести счёт
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-200">
                      <span className="truncate max-w-[140px]">{nameOf(m.participant1Id)}</span>
                      <span className="font-bold">{m.score1 !== null ? m.score1 : "-"}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-200">
                      <span className="truncate max-w-[140px]">{nameOf(m.participant2Id)}</span>
                      <span className="font-bold">{m.score2 !== null ? m.score2 : "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Match list */}
        {matches.length > 0 && (
          <div className="lg:col-span-12 component-card-dark p-6 mt-4 border-t border-obsidian-border/50">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-activeGrad-start" />
              Расписание и результаты матчей
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((m) => (
                <div key={m.id} className="p-3 bg-obsidian-input border border-obsidian-border rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                    <span>Раунд {m.round} • Пара {m.position + 1}</span>
                    <span className={m.winnerId ? "text-slate-400" : "text-green-400"}>
                      {m.winnerId ? "Завершён" : "Активен"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    <div className="flex justify-between">
                      <span className="truncate max-w-[120px]">{nameOf(m.participant1Id)}</span>
                      <span className="font-mono font-bold">{m.score1 !== null ? m.score1 : "-"}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="truncate max-w-[120px]">{nameOf(m.participant2Id)}</span>
                      <span className="font-mono font-bold">{m.score2 !== null ? m.score2 : "-"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-obsidian-border/30 items-center justify-between">
                    <div className="flex gap-2">
                      {m.customFieldsData?.stream_url && (
                        <a href={m.customFieldsData.stream_url} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[8px] text-slate-300 hover:text-white flex items-center gap-1 transition">
                          <Tv size={8} className="text-red-400" /><span>Стрим</span>
                        </a>
                      )}
                      {m.customFieldsData?.invite_link && (
                        <a href={m.customFieldsData.invite_link} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[8px] text-slate-300 hover:text-white flex items-center gap-1 transition">
                          <ExternalLink size={8} className="text-blue-400" /><span>Комната</span>
                        </a>
                      )}
                    </div>
                    {(m.refereeId === currentUser?.id || canManage) && (
                      <button onClick={() => openMetadataModal(m)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[8px] text-completeGrad-mid font-bold uppercase transition">
                        Инфо
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standings */}
        <div className="lg:col-span-12 component-card-dark p-6 mt-4 border-t border-obsidian-border/50">
          <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-completeGrad-mid" />
            Таблица лидеров турнира
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-obsidian-border text-slate-400 uppercase font-mono text-[9px] tracking-wider font-bold">
                <tr>
                  <th className="p-3 w-16 text-center">Место</th>
                  <th className="p-3">Участник</th>
                  <th className="p-3 text-center">Игры</th>
                  <th className="p-3 text-center text-green-400">Победы</th>
                  <th className="p-3 text-center text-red-400">Поражения</th>
                  <th className="p-3 text-right pr-6">Разница ELO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-border">
                {standings.map((row: any, idx) => (
                  <tr key={row.participantId} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-200">
                      {row.teamName ? `${row.teamName} (${row.nickname})` : row.nickname}
                    </td>
                    <td className="p-3 text-center font-mono">{row.matchesPlayed}</td>
                    <td className="p-3 text-center font-mono text-green-400">{row.wins}</td>
                    <td className="p-3 text-center font-mono text-red-400">{row.losses}</td>
                    <td className={`p-3 text-right font-mono font-bold pr-6 ${row.eloChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {row.eloChange >= 0 ? `+${row.eloChange}` : row.eloChange}
                    </td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-500 italic font-mono">В турнире пока нет завершённых матчей.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual referee assignment */}
        {canManage && matches.length > 0 && (
          <div className="lg:col-span-12 component-card-dark p-6 border-t border-obsidian-border/50">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              Индивидуальное назначение судей по матчам
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((m) => (
                <div key={m.id} className="p-3 bg-obsidian-input border border-obsidian-border rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                    <span>Раунд {m.round} • Пара {m.position + 1}</span>
                    <span className={m.winnerId ? "text-slate-400" : "text-green-400"}>{m.winnerId ? "Завершён" : "Активен"}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    <div className="flex justify-between"><span className="truncate max-w-[120px]">{nameOf(m.participant1Id)}</span><span className="font-mono font-bold">{m.score1 !== null ? m.score1 : "-"}</span></div>
                    <div className="flex justify-between mt-1"><span className="truncate max-w-[120px]">{nameOf(m.participant2Id)}</span><span className="font-mono font-bold">{m.score2 !== null ? m.score2 : "-"}</span></div>
                  </div>
                  <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-obsidian-border/30">
                    <label className="text-[8px] font-bold text-slate-500 uppercase font-mono">Назначенный судья</label>
                    <select
                      className="h-7 bg-obsidian-panel border border-obsidian-border rounded px-2 text-[10px] text-slate-300"
                      value={m.refereeId || ""}
                      onChange={(e) => handleSetMatchReferee(m.id, e.target.value)}
                    >
                      <option value="">-- Без судьи / Организатор --</option>
                      {usersList.map((u) => (<option key={u.id} value={u.id}>{u.nickname}</option>))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scoring modal */}
      {selectedScoringMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md component-card-dark p-6">
            <h4 className="font-bold text-sm text-slate-200 border-b border-obsidian-border pb-3 mb-4 uppercase tracking-wider">
              Фиксация результата
            </h4>

            {/* Кто играет */}
            <div className="flex justify-between text-xs font-bold text-slate-300 mb-4">
              <span className="truncate max-w-[160px]">{scoringName1}</span>
              <span className="text-slate-500">vs</span>
              <span className="truncate max-w-[160px] text-right">{scoringName2}</span>
            </div>

            {/* Переключатель техпоражения */}
            <label className="flex items-center gap-2 mb-4 text-[11px] text-slate-300 font-mono cursor-pointer">
              <input type="checkbox" checked={techDefeat} onChange={(e) => setTechDefeat(e.target.checked)} />
              Техническое поражение
            </label>

            <form onSubmit={handleScoreSubmit} className="flex flex-col gap-4">
              {techDefeat ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Кому засчитать поражение</label>
                  <select
                    required
                    className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white"
                    value={techLoserId}
                    onChange={(e) => setTechLoserId(e.target.value)}
                  >
                    <option value="">-- Выберите участника --</option>
                    {selectedScoringMatch.participant1Id && (
                      <option value={selectedScoringMatch.participant1Id}>{scoringName1}</option>
                    )}
                    {selectedScoringMatch.participant2Id && (
                      <option value={selectedScoringMatch.participant2Id}>{scoringName2}</option>
                    )}
                  </select>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-mono truncate">{scoringName1}</label>
                      <input type="number" required min="0" className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white text-right font-mono" value={score1} onChange={(e) => setScore1(Number(e.target.value))} />
                    </div>
                    <span className="text-xl font-bold font-mono text-slate-400 mt-4">:</span>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-mono truncate text-right">{scoringName2}</label>
                      <input type="number" required min="0" className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white text-right font-mono" value={score2} onChange={(e) => setScore2(Number(e.target.value))} />
                    </div>
                  </div>

                  {tournament?.customFieldsSchema && tournament.customFieldsSchema.map((field: any) => (
                    <div key={field.name} className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                        {field.label} {field.required && "*"}
                      </label>
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        required={field.required}
                        className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none"
                        placeholder={`Введите ${field.label.toLowerCase()}`}
                        value={customFieldsData[field.name] || ""}
                        onChange={(e) => {
                          const val = field.type === "number" ? Number(e.target.value) || 0 : e.target.value;
                          setCustomFieldsData((prev) => ({ ...prev, [field.name]: val }));
                        }}
                      />
                    </div>
                  ))}
                </>
              )}

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={closeScoreModal} className="h-10 flex-1 border border-obsidian-border hover:bg-white/5 rounded text-xs font-bold uppercase tracking-wider text-slate-400">Отмена</button>
                <button type="submit" className="h-10 flex-1 bg-activeGrad-start hover:bg-red-600 rounded text-xs font-bold uppercase tracking-wider text-white shadow-lg">Подтвердить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metadata modal */}
      {selectedMetadataMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md component-card-dark p-6">
            <h4 className="font-bold text-sm text-slate-200 border-b border-obsidian-border pb-3 mb-4 uppercase tracking-wider">
              Информация о матче
            </h4>
            <form onSubmit={handleSaveMetadata} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Ссылка на стрим / трансляцию</label>
                <input type="url" placeholder="https://twitch.tv/..." className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none" value={metadataStreamUrl} onChange={(e) => setMetadataStreamUrl(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Ссылка-приглашение в комнату (лобби)</label>
                <input type="text" placeholder="https://lichess.org/..." className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none" value={metadataInviteLink} onChange={(e) => setMetadataInviteLink(e.target.value)} />
              </div>
              {tournament?.customFieldsSchema && tournament.customFieldsSchema.map((field: any) => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">{field.label}</label>
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none"
                    placeholder={`Введите ${field.label.toLowerCase()}`}
                    value={metadataCustomFields[field.name] || ""}
                    onChange={(e) => {
                      const val = field.type === "number" ? Number(e.target.value) || 0 : e.target.value;
                      setMetadataCustomFields((prev) => ({ ...prev, [field.name]: val }));
                    }}
                  />
                </div>
              ))}
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setSelectedMetadataMatch(null)} className="h-10 flex-1 border border-obsidian-border hover:bg-white/5 rounded text-xs font-bold uppercase tracking-wider text-slate-400">Отмена</button>
                <button type="submit" className="h-10 flex-1 bg-completeGrad-start hover:bg-blue-600 rounded text-xs font-bold uppercase tracking-wider text-white shadow-lg">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
