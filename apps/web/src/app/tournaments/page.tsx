"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass as Search, Calendar, ArrowRight } from "@phosphor-icons/react";
import { apiFetch, fetchProfile, setSession } from "../../lib/api";
import { Nav } from "../../components/Nav";

export default function TournamentsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tournamentsList, setTournamentsList] = useState<any[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    (async () => {
      const prof = await fetchProfile();
      if (!prof) {
        router.push("/login");
        return;
      }
      setProfile(prof);
      setSession(prof);
      await Promise.all([loadTournaments(), loadDisciplines()]);
      setLoading(false);
    })();
  }, []);

  const loadTournaments = async () => {
    try {
      const res = await apiFetch("/tournaments");
      if (res.ok) setTournamentsList(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const loadDisciplines = async () => {
    try {
      const res = await apiFetch("/tournaments/disciplines");
      if (res.ok) setDisciplinesList(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTournaments = tournamentsList.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesDiscipline = selectedDiscipline ? t.disciplineName === selectedDiscipline : true;
    const matchesType = selectedType ? t.tournamentType === selectedType : true;
    let matchesStatus = true;
    if (selectedStatus === "completed") matchesStatus = t.isCompleted;
    else if (selectedStatus === "started") matchesStatus = t.isStarted && !t.isCompleted;
    else if (selectedStatus === "pending") matchesStatus = !t.isStarted;
    return matchesSearch && matchesDiscipline && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-base flex items-center justify-center text-white">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">Загрузка турниров...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-base text-white pb-16 relative">
      <div className="absolute inset-0 dither-overlay z-0" />
      <Nav active="tournaments" profile={profile} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-wider uppercase">Каталог турниров</h2>
          <p className="text-xs text-slate-400 mt-1">
            Найдите соревнование, откройте его страницу и подайте заявку на участие.
          </p>
        </div>

        <div className="component-card-dark p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Поиск по названию</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input type="text" placeholder="Поиск..." className="w-full h-9 bg-obsidian-input border border-obsidian-border rounded pl-9 pr-3 text-xs text-white focus:outline-none focus:border-activeGrad-start" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Дисциплина</label>
            <select className="h-9 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white focus:outline-none focus:border-activeGrad-start" value={selectedDiscipline} onChange={(e) => setSelectedDiscipline(e.target.value)}>
              <option value="">Все дисциплины</option>
              {disciplinesList.map((d) => (<option key={d.id} value={d.name}>{d.name}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Уровень лиги</label>
            <select className="h-9 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white focus:outline-none focus:border-activeGrad-start" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">Все уровни</option>
              <option value="PRO">PRO Лиги</option>
              <option value="AMATEUR">Amateur Турниры</option>
              <option value="SANDBOX">Sandbox Песочницы</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Статус</label>
            <select className="h-9 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white focus:outline-none focus:border-activeGrad-start" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Все статусы</option>
              <option value="pending">Ожидают старта (регистрация)</option>
              <option value="started">Идут сейчас</option>
              <option value="completed">Завершённые</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => {
            let statusBadge = "Регистрация";
            let statusColor = "bg-green-950/20 text-green-400 border-green-900";
            if (t.isCompleted) {
              statusBadge = "Завершён";
              statusColor = "bg-slate-900 text-slate-400 border-slate-700";
            } else if (t.isStarted) {
              statusBadge = "Идёт сейчас";
              statusColor = "bg-activeGrad-start/20 text-activeGrad-start border-activeGrad-start";
            }
            return (
              <div key={t.id} className="component-card-dark p-5 flex flex-col justify-between min-h-[180px]">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${statusColor}`}>{statusBadge}</span>
                    <div className="flex items-center gap-1.5">
                      {t.isPrivate && (
                        <span className="text-[8px] bg-purple-950/30 border border-purple-800 px-1.5 py-0.5 rounded font-mono text-purple-300 font-bold uppercase">🔒 Приватный</span>
                      )}
                      <span className="text-[8px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-400 font-bold">{t.tournamentType}</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100 mb-1 leading-snug line-clamp-2">{t.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mb-4">{t.disciplineName}</p>
                </div>
                <div className="border-t border-obsidian-border pt-3 flex justify-between items-center mt-auto">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <Calendar size={12} />
                    <span>{new Date(t.startDate).toLocaleDateString("ru-RU")}</span>
                  </div>
                  <button onClick={() => router.push(`/tournaments/${t.id}`)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-completeGrad-mid hover:underline">
                    <span>Открыть</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredTournaments.length === 0 && (
            <div className="col-span-full component-card-dark p-12 text-center text-slate-500 text-xs font-mono">Турниров по заданным фильтрам не найдено.</div>
          )}
        </div>
      </div>
    </div>
  );
}
