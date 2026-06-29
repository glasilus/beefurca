"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass as Search, Calendar, ArrowRight, Lock } from "../../components/ui/icons";
import { apiFetch, fetchProfile, setSession } from "../../lib/api";
import { Nav } from "../../components/Nav";
import { FractalMedallion } from "../../components/Fractal";
import { Window, Card } from "../../components/ui/Window";
import { Button } from "../../components/ui/Button";
import { Badge, tournamentStatusTone } from "../../components/ui/Badge";
import { Field, Input, Select } from "../../components/ui/Field";
import { Tabs } from "../../components/ui/Tabs";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

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

  const statusTabs = [
    { value: "", label: "Все статусы" },
    { value: "pending", label: "Регистрация" },
    { value: "started", label: "Идут сейчас" },
    { value: "completed", label: "Завершенные" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">Загрузка турниров...</span>
      </div>
    );
  }

  const getStatusBadge = (t: any) => {
    if (t.isCompleted) return { label: "Завершен", tone: "done" as const };
    if (t.isStarted) return { label: "Идет сейчас", tone: "live" as const };
    return { label: "Регистрация", tone: "win" as const };
  };

  return (
    <div className="min-h-screen pb-16 relative">
      <Nav active="tournaments" profile={profile} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-12">
        <PageHeader
          title="Каталог турниров"
          eyebrow="Соревнования"
        />
        <p className="text-xs text-[var(--text-muted)] mt-[-16px] mb-6">
          Найдите соревнование, откройте его страницу и подайте заявку на участие.
        </p>

        {/* Filters */}
        <Window title="Фильтры" className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Field label="Поиск по названию">
              <div className="relative">
                <Search className="absolute left-3 top-[11px] text-[var(--text-muted)]" size={14} />
                <Input type="text" placeholder="Поиск..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </Field>
            <Field label="Дисциплина">
              <Select value={selectedDiscipline} onChange={(e) => setSelectedDiscipline(e.target.value)}>
                <option value="">Все дисциплины</option>
                {disciplinesList.map((d) => (<option key={d.id} value={d.name}>{d.name}</option>))}
              </Select>
            </Field>
            <Field label="Уровень лиги">
              <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="">Все уровни</option>
                <option value="PRO">PRO Лиги</option>
                <option value="AMATEUR">Amateur Турниры</option>
                <option value="SANDBOX">Sandbox Песочницы</option>
              </Select>
            </Field>
            <Field label="Статус">
              <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">Все статусы</option>
                <option value="pending">Ожидают старта (регистрация)</option>
                <option value="started">Идут сейчас</option>
                <option value="completed">Завершенные</option>
              </Select>
            </Field>
          </div>
        </Window>

        <Tabs
          items={statusTabs}
          value={selectedStatus}
          onChange={setSelectedStatus}
          className="mb-6"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => {
            const status = getStatusBadge(t);
            return (
              <Card key={t.id} className="flex flex-col justify-between min-h-[180px]">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <Badge tone={status.tone} dot={status.tone === "live"}>{status.label}</Badge>
                    <div className="flex items-center gap-1.5">
                      {t.isPrivate && (
                        <Badge tone="accent">
                          <Lock size={10} weight="bold" /> Приватный
                        </Badge>
                      )}
                      <Badge tone="draft">{t.tournamentType}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <FractalMedallion seed={t.id || t.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-[var(--text)] mb-1 leading-snug line-clamp-2">{t.name}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">{t.disciplineName}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-[var(--hairline)] pt-3 flex justify-between items-center mt-auto">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono">
                    <Calendar size={12} />
                    <span>{new Date(t.startDate).toLocaleDateString("ru-RU")}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/tournaments/${t.id}`)}>
                    Открыть <ArrowRight size={12} />
                  </Button>
                </div>
              </Card>
            );
          })}
          {filteredTournaments.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                title="Турниров не найдено"
                hint="Турниров по заданным фильтрам не найдено."
                seed="tournaments-empty"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
