"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash as Trash2, Info } from "@phosphor-icons/react";
import { apiFetch, fetchProfile, setSession } from "../../../lib/api";
import { Nav } from "../../../components/Nav";
import { useToast } from "../../../components/Toast";

export default function CreateTournamentPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const isPrivileged = profile?.role === "Organizer" || profile?.role === "Admin";

  // Form states
  const [name, setName] = useState("");
  const [selectedDisciplineId, setSelectedDisciplineId] = useState("");
  const [tournamentType, setTournamentType] = useState("AMATEUR");
  const [bracketType, setBracketType] = useState("SINGLE_ELIM");
  const [prizePool, setPrizePool] = useState("");
  const [entryFee, setEntryFee] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  // Custom fields schema (тип только text|number — как принимает бэкенд)
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [fieldName, setFieldName] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fieldRequired, setFieldRequired] = useState(false);

  const [disciplinesList, setDisciplinesList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Inline-создание пользовательской дисциплины (ядро: любой заводит дисциплину)
  const [createInlineDiscipline, setCreateInlineDiscipline] = useState(false);
  const [inlineDiscName, setInlineDiscName] = useState("");
  const [inlineDiscGameType, setInlineDiscGameType] = useState("SINGLE");
  const [inlineDiscRules, setInlineDiscRules] = useState("");

  useEffect(() => {
    (async () => {
      const prof = await fetchProfile();
      if (!prof) {
        router.push("/login");
        return;
      }
      setProfile(prof);
      setSession(prof);
      // Привилегированные по умолчанию создают PRO, игроки — AMATEUR
      if (prof.role === "Organizer" || prof.role === "Admin") {
        setTournamentType("PRO");
      }
      await loadDisciplines();
      setLoading(false);
    })();
  }, []);

  const loadDisciplines = async () => {
    try {
      const res = await apiFetch("/tournaments/disciplines");
      if (res.ok) {
        const data = await res.json();
        setDisciplinesList(data);
        if (data.length > 0) setSelectedDisciplineId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomField = () => {
    if (!fieldName.trim() || !fieldLabel.trim()) {
      toast.error("Заполните техническое имя и метку поля");
      return;
    }
    const cleanName = fieldName.trim().replace(/\s+/g, "_").toLowerCase();
    if (!/^[a-z0-9_]+$/.test(cleanName)) {
      toast.error("Техническое имя: только латиница, цифры и подчёркивание");
      return;
    }
    if (customFields.some((f) => f.name === cleanName)) {
      toast.error("Поле с таким техническим именем уже существует");
      return;
    }
    setCustomFields((prev) => [
      ...prev,
      { name: cleanName, label: fieldLabel.trim(), type: fieldType, required: fieldRequired },
    ]);
    setFieldName("");
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(false);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tournamentType === "PRO" && !isPrivileged) {
      toast.error("PRO-турниры могут создавать только организаторы и администраторы.");
      return;
    }

    // Определяем дисциплину: выбранная из списка или новая (создаём на лету).
    let disciplineId = selectedDisciplineId;
    if (createInlineDiscipline) {
      if (!inlineDiscName.trim()) {
        toast.error("Укажите название новой дисциплины");
        return;
      }
      try {
        const dRes = await apiFetch("/tournaments/disciplines", {
          method: "POST",
          body: JSON.stringify({
            name: inlineDiscName.trim(),
            gameType: inlineDiscGameType,
            rules: inlineDiscRules.trim() || undefined,
          }),
        });
        const dData = await dRes.json();
        if (dRes.ok) {
          disciplineId = dData.discipline.id;
        } else {
          toast.error(dData.error || "Не удалось создать дисциплину");
          return;
        }
      } catch (err: any) {
        toast.error("Ошибка создания дисциплины: " + err.message);
        return;
      }
    }

    if (!disciplineId) {
      toast.error("Выберите дисциплину или создайте новую.");
      return;
    }

    const bodyData = {
      name,
      disciplineId,
      tournamentType,
      bracketType,
      prizePool: prizePool || undefined,
      entryFee: Number(entryFee) || 0,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      isPrivate,
      customFieldsSchema: customFields.length > 0 ? customFields : undefined,
    };

    setSubmitting(true);
    try {
      const res = await apiFetch("/tournaments", {
        method: "POST",
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/tournaments/${data.tournament.id}`);
      } else {
        toast.error(data.error || "Не удалось создать турнир");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-base flex items-center justify-center text-white">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse">
          Загрузка...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-base text-white pb-16 relative">
      <div className="absolute inset-0 dither-overlay z-0" />
      <Nav active="create" profile={profile} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 mt-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-wider uppercase">Создание турнира</h2>
          <p className="text-xs text-slate-400 mt-1">
            Любой пользователь может создать любительский (AMATEUR) или автономный
            (SANDBOX) турнир. PRO-турниры доступны организаторам и администраторам.
          </p>
        </div>

        {disciplinesList.length === 0 && (
          <div className="component-card-dark p-4 mb-6 flex items-center gap-2 text-xs text-slate-300 border border-obsidian-border">
            <Info size={16} className="shrink-0 text-completeGrad-mid" />
            Готовых дисциплин пока нет — нажмите «+ Создать свою» и заведите любую.
          </div>
        )}

        <form onSubmit={handleSubmit} className="component-card-dark p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Название турнира *</label>
            <input
              type="text"
              required
              placeholder="Например: Чемпионат ВУЗа по шахматам 2026"
              className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Соревновательная дисциплина *</label>
                <button
                  type="button"
                  onClick={() => setCreateInlineDiscipline(!createInlineDiscipline)}
                  className="text-[10px] font-bold text-activeGrad-start hover:underline uppercase font-mono"
                >
                  {createInlineDiscipline ? "Выбрать существующую" : "+ Создать свою"}
                </button>
              </div>

              {!createInlineDiscipline ? (
                <select
                  className="h-10 w-full bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white focus:outline-none focus:border-activeGrad-start"
                  value={selectedDisciplineId}
                  onChange={(e) => setSelectedDisciplineId(e.target.value)}
                >
                  {disciplinesList.length === 0 && <option value="">Дисциплин нет — создайте свою</option>}
                  {disciplinesList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.gameType === "TEAM" ? "Командная" : "Одиночная"})
                      {d.isOfficial ? " ★" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-col gap-3 p-4 bg-obsidian-input border border-obsidian-border rounded">
                  <p className="text-[9px] text-slate-500 font-mono leading-relaxed">
                    Новая дисциплина станет доступна всем. Это ядро платформы: вы
                    можете провести турнир по чему угодно, не дожидаясь админа.
                  </p>
                  <input
                    type="text"
                    placeholder="Название (например: Mortal Kombat 1)"
                    className="h-9 bg-obsidian-panel border border-obsidian-border rounded px-3 text-xs text-white"
                    value={inlineDiscName}
                    onChange={(e) => setInlineDiscName(e.target.value)}
                  />
                  <select
                    className="h-9 bg-obsidian-panel border border-obsidian-border rounded px-2 text-xs text-white"
                    value={inlineDiscGameType}
                    onChange={(e) => setInlineDiscGameType(e.target.value)}
                  >
                    <option value="SINGLE">Одиночная (1v1)</option>
                    <option value="TEAM">Командная (Team Roster)</option>
                  </select>
                  <textarea
                    placeholder="Правила (необязательно)"
                    rows={2}
                    className="p-2 bg-obsidian-panel border border-obsidian-border rounded text-xs text-white focus:outline-none"
                    value={inlineDiscRules}
                    onChange={(e) => setInlineDiscRules(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Уровень лиги (Тип турнира) *</label>
              <select
                className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white focus:outline-none focus:border-activeGrad-start"
                value={tournamentType}
                onChange={(e) => setTournamentType(e.target.value)}
              >
                {isPrivileged && <option value="PRO">PRO (Влияет на ELO, строгие правила)</option>}
                <option value="AMATEUR">AMATEUR (ELO при флаге доверия, автоподтверждение)</option>
                <option value="SANDBOX">SANDBOX (Без ELO, ручной ввод участников)</option>
              </select>
              {!isPrivileged && (
                <span className="text-[9px] text-slate-500 font-mono">
                  PRO-турниры доступны только организаторам.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Тип турнирной сетки *</label>
              <select
                className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3 text-xs text-white focus:outline-none focus:border-activeGrad-start"
                value={bracketType}
                onChange={(e) => setBracketType(e.target.value)}
              >
                <option value="SINGLE_ELIM">Single Elimination (Олимпийская сетка)</option>
                <option value="DOUBLE_ELIM">Double Elimination (Сетка лузеров)</option>
                <option value="ROUND_ROBIN">Round Robin (Круговая система)</option>
                <option value="SWISS">Swiss System (Швейцарская система)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Дата начала турнира *</label>
              <input
                type="datetime-local"
                required
                className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start font-mono"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Дата окончания (необязательно)</label>
              <input
                type="datetime-local"
                className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start font-mono"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Призовой фонд</label>
              <input
                type="text"
                placeholder="Например: 50 000 руб + ценные призы"
                className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Организационный взнос (руб)</label>
              <input
                type="number"
                min="0"
                className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start font-mono text-right"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 bg-obsidian-input border border-obsidian-border rounded cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-slate-200">Приватный турнир</span>
              <span className="text-[10px] text-slate-400 font-mono leading-relaxed">
                Не отображается в публичном каталоге. Доступ — только по прямой
                ссылке-приглашению (кнопка «Пригласить» на странице турнира).
                Работает и для AMATEUR, и для PRO.
              </span>
            </span>
          </label>

          {/* Кастомные судейские поля матчей */}
          <div className="border-t border-obsidian-border pt-6 mt-4">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-300 mb-3">
              Кастомные судейские поля матчей
            </h3>
            <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
              Дополнительные метаданные, которые судья заполнит при подтверждении
              результата (например, «Игровая карта», «Номер стола»).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-bold text-slate-500 uppercase font-mono">Имя (лат. без пробелов)</label>
                <input
                  type="text"
                  placeholder="game_map"
                  className="h-8 bg-obsidian-input border border-obsidian-border rounded px-2.5 text-xs text-white"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-bold text-slate-500 uppercase font-mono">Отображаемая метка</label>
                <input
                  type="text"
                  placeholder="Игровая карта"
                  className="h-8 bg-obsidian-input border border-obsidian-border rounded px-2.5 text-xs text-white"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-bold text-slate-500 uppercase font-mono">Тип значения</label>
                <select
                  className="h-8 bg-obsidian-input border border-obsidian-border rounded px-2 text-xs text-white"
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                >
                  <option value="text">Текст</option>
                  <option value="number">Число</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddCustomField}
                className="h-8 bg-completeGrad-start hover:bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-wider transition"
              >
                Добавить поле
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
              {customFields.map((field, idx) => (
                <div key={field.name} className="flex justify-between items-center p-2 bg-obsidian-input border border-obsidian-border rounded">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-300 font-bold">{field.label}</span>
                    <span className="text-slate-500 text-[10px]">
                      ({field.name} • {field.type === "number" ? "число" : "текст"}
                      {field.required ? " • обяз." : ""})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomField(idx)}
                    className="p-1.5 hover:bg-white/5 rounded text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {customFields.length === 0 && (
                <div className="text-[10px] text-slate-500 italic font-mono text-center py-2">
                  Кастомные поля матчей не добавлены
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 mt-3 text-[10px] text-slate-400 font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
              />
              Следующее добавляемое поле — обязательное
            </label>
          </div>

          <div className="border-t border-obsidian-border pt-6 mt-4 flex gap-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="h-11 flex-1 border border-obsidian-border hover:bg-white/5 rounded text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 flex-1 bg-activeGrad-start hover:bg-red-600 rounded text-xs font-bold uppercase tracking-wider text-white shadow-lg transition disabled:opacity-50"
            >
              {submitting ? "Создание..." : "Создать турнир"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
