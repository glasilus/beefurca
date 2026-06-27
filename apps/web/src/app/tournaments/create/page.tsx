"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash as Trash2, Info, Plus, Trophy, Users, Sword, Globe, Lock, Star, CheckCircle } from "@phosphor-icons/react";
import { apiFetch, fetchProfile, setSession } from "../../../lib/api";
import { Nav } from "../../../components/Nav";
import { useToast } from "../../../components/Toast";
import { Window, Card } from "../../../components/ui/Window";
import { Button } from "../../../components/ui/Button";
import { Field, Input, Select, Checkbox } from "../../../components/ui/Field";
import { Badge } from "../../../components/ui/Badge";
import { FractalMedallion } from "../../../components/Fractal";

/* ----------------------------------------------------------------
   Local bracket / league type card selectors
   ---------------------------------------------------------------- */
interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent?: string;
  disabled?: boolean;
}

function OptionCard({ selected, onClick, icon, title, desc, accent, disabled }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={[
        "relative text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer w-full",
        selected
          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--panel))] shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_30%,transparent)]"
          : "border-[var(--border)] bg-[var(--panel-sunken)] hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_5%,var(--panel))]",
        disabled ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white"
          style={{ background: accent ?? "var(--accent)" }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-[13px] text-[var(--text)]">{title}</span>
            {selected && <CheckCircle size={13} weight="fill" className="text-[var(--accent)] shrink-0" />}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{desc}</p>
        </div>
      </div>
    </button>
  );
}

/* ----------------------------------------------------------------
   Section header
   ---------------------------------------------------------------- */
function SectionLabel({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center shrink-0 font-mono">
        {step}
      </span>
      <span className="font-cond font-semibold uppercase tracking-[.08em] text-[12px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

/* ================================================================
   Page
   ================================================================ */
export default function CreateTournamentPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const isPrivileged = profile?.role === "Organizer" || profile?.role === "Admin";

  const [name, setName] = useState("");
  const [selectedDisciplineId, setSelectedDisciplineId] = useState("");
  const [tournamentType, setTournamentType] = useState("AMATEUR");
  const [bracketType, setBracketType] = useState("SINGLE_ELIM");
  const [prizePool, setPrizePool] = useState("");
  const [entryFee, setEntryFee] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [customFields, setCustomFields] = useState<any[]>([]);
  const [fieldName, setFieldName] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fieldRequired, setFieldRequired] = useState(false);

  const [disciplinesList, setDisciplinesList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [createInlineDiscipline, setCreateInlineDiscipline] = useState(false);
  const [inlineDiscName, setInlineDiscName] = useState("");
  const [inlineDiscGameType, setInlineDiscGameType] = useState("SINGLE");
  const [inlineDiscRules, setInlineDiscRules] = useState("");

  // Resolved discipline meta (computed from state, after all useState)
  const selectedDiscipline = disciplinesList.find((d) => d.id === selectedDisciplineId) ?? null;
  const effectiveGameType = createInlineDiscipline ? inlineDiscGameType : (selectedDiscipline?.gameType ?? "SINGLE");
  const isTeam = effectiveGameType === "TEAM";

  useEffect(() => {
    (async () => {
      const prof = await fetchProfile();
      if (!prof) { router.push("/login"); return; }
      setProfile(prof);
      setSession(prof);
      if (prof.role === "Organizer" || prof.role === "Admin") setTournamentType("PRO");

      // Auto-set today's date/time
      const now = new Date();
      now.setSeconds(0, 0);
      setStartDate(now.toISOString().slice(0, 16));

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
    } catch (err) { console.error(err); }
  };

  const handleAddCustomField = () => {
    if (!fieldName.trim() || !fieldLabel.trim()) { toast.error("Заполните техническое имя и метку поля"); return; }
    const cleanName = fieldName.trim().replace(/\s+/g, "_").toLowerCase();
    if (!/^[a-z0-9_]+$/.test(cleanName)) { toast.error("Техническое имя: только латиница, цифры и подчёркивание"); return; }
    if (customFields.some((f) => f.name === cleanName)) { toast.error("Поле с таким именем уже существует"); return; }
    setCustomFields((prev) => [...prev, { name: cleanName, label: fieldLabel.trim(), type: fieldType, required: fieldRequired }]);
    setFieldName(""); setFieldLabel(""); setFieldType("text"); setFieldRequired(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tournamentType === "PRO" && !isPrivileged) {
      toast.error("PRO-турниры могут создавать только организаторы и администраторы.");
      return;
    }

    let disciplineId = selectedDisciplineId;
    if (createInlineDiscipline) {
      if (!inlineDiscName.trim()) { toast.error("Укажите название новой дисциплины"); return; }
      try {
        const dRes = await apiFetch("/tournaments/disciplines", {
          method: "POST",
          body: JSON.stringify({ name: inlineDiscName.trim(), gameType: inlineDiscGameType, rules: inlineDiscRules.trim() || undefined }),
        });
        const dData = await dRes.json();
        if (dRes.ok) disciplineId = dData.discipline.id;
        else { toast.error(dData.error || "Не удалось создать дисциплину"); return; }
      } catch (err: any) { toast.error("Ошибка создания дисциплины: " + err.message); return; }
    }

    if (!disciplineId) { toast.error("Выберите дисциплину или создайте новую."); return; }
    if (!startDate) { toast.error("Укажите дату начала турнира."); return; }

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
      const res = await apiFetch("/tournaments", { method: "POST", body: JSON.stringify(bodyData) });
      const data = await res.json();
      if (res.ok) router.push(`/tournaments/${data.tournament.id}`);
      else toast.error(data.error || "Не удалось создать турнир");
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative">
      <Nav active="create" profile={profile} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12">

        {/* Hero header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            {name.trim()
              ? <FractalMedallion seed={name} size={72} shape="rounded" />
              : (
                <span className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--accent)_15%,var(--panel))] border border-[var(--border)]">
                  <Trophy size={32} className="text-[var(--accent)]" />
                </span>
              )
            }
          </div>
          <h1 className="font-display font-extrabold text-[clamp(22px,4vw,32px)] tracking-tight text-[var(--text)] mb-2">
            {name.trim() || "Новый турнир"}
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Любой может создать Amateur или Sandbox турнир. PRO — только для организаторов.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* ── Секция 1: Название ── */}
          <Window title="Основное">
            <SectionLabel step={1} label="Название турнира" />
            <Input
              type="text"
              required
              placeholder="Например: Чемпионат ВУЗа по шахматам 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base"
            />
          </Window>

          {/* ── Секция 2: Дисциплина ── */}
          <Window title="Дисциплина">
            <SectionLabel step={2} label="Соревновательная дисциплина" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[var(--text-muted)]">Под какую дисциплину создаёте турнир?</span>
              <button
                type="button"
                onClick={() => setCreateInlineDiscipline(!createInlineDiscipline)}
                className="text-[11px] font-bold text-[var(--accent)] hover:underline uppercase font-cond"
              >
                {createInlineDiscipline ? "← Выбрать из списка" : "+ Создать новую"}
              </button>
            </div>

            {!createInlineDiscipline ? (
              <Select value={selectedDisciplineId} onChange={(e) => setSelectedDisciplineId(e.target.value)}>
                {disciplinesList.length === 0 && <option value="">Нет дисциплин — создайте свою</option>}
                {disciplinesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.gameType === "TEAM" ? "Командная" : "Одиночная"}){d.isOfficial ? " [офиц.]" : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex flex-col gap-3 p-3 bg-[var(--panel-sunken)] rounded-lg border border-[var(--hairline)]">
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Новая дисциплина будет доступна всем. Проводите турнир по чему угодно.
                </p>
                <Input type="text" placeholder="Название (например: Mortal Kombat 1)" value={inlineDiscName} onChange={(e) => setInlineDiscName(e.target.value)} />
                <Select value={inlineDiscGameType} onChange={(e) => setInlineDiscGameType(e.target.value)}>
                  <option value="SINGLE">Одиночная (1v1)</option>
                  <option value="TEAM">Командная (Team Roster)</option>
                </Select>
                <textarea
                  placeholder="Правила (необязательно)"
                  rows={2}
                  className="p-2.5 text-[14px] font-sans text-[var(--text)] bg-[var(--panel)] border border-[var(--border)] rounded-ctl shadow-[inset_0_2px_4px_rgba(0,0,0,.12)] outline-none focus:border-[var(--accent)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,.12),0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)] placeholder:text-[var(--text-muted)]"
                  value={inlineDiscRules}
                  onChange={(e) => setInlineDiscRules(e.target.value)}
                />
              </div>
            )}

            {disciplinesList.length === 0 && !createInlineDiscipline && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-3 p-3 bg-[var(--panel-sunken)] rounded-lg">
                <Info size={14} className="shrink-0 text-[var(--accent)]" />
                Нажмите «+ Создать новую» и заведите любую дисциплину.
              </div>
            )}

            {/* Контекстный баннер: тип участия */}
            {(selectedDisciplineId || createInlineDiscipline) && (
              <div className={[
                "flex items-start gap-3 mt-4 p-3 rounded-xl border",
                isTeam
                  ? "bg-[color-mix(in_srgb,var(--status-live)_8%,var(--panel-sunken))] border-[color-mix(in_srgb,var(--status-live)_30%,var(--border))]"
                  : "bg-[color-mix(in_srgb,var(--accent)_8%,var(--panel-sunken))] border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]",
              ].join(" ")}>
                <span className={[
                  "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mt-0.5",
                  isTeam ? "bg-[var(--status-live)]" : "bg-[var(--accent)]",
                ].join(" ")}>
                  {isTeam ? <Users size={14} weight="fill" /> : <Sword size={14} weight="fill" />}
                </span>
                <div>
                  <div className="font-bold text-[12px] text-[var(--text)] mb-0.5">
                    {isTeam ? "Командная дисциплина" : "Одиночная дисциплина (1v1)"}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {isTeam
                      ? "Участники записываются командами. Команды создаются в кабинете. Все форматы сетки поддерживают командный режим."
                      : "Участники регистрируются персонально. Все форматы сетки доступны для одиночных дисциплин."}
                  </p>
                </div>
              </div>
            )}
          </Window>

          {/* ── Секция 3: Уровень лиги ── */}
          <Window title="Уровень лиги">
            <SectionLabel step={3} label="Тип турнира (лига)" />
            <div className="flex flex-col gap-3">
              {isPrivileged && (
                <OptionCard
                  selected={tournamentType === "PRO"}
                  onClick={() => setTournamentType("PRO")}
                  icon={<Star size={18} weight="fill" />}
                  title="PRO"
                  desc="Официальная лига. ELO начисляется по строгим правилам. Только для организаторов."
                  accent="var(--status-danger)"
                />
              )}
              <OptionCard
                selected={tournamentType === "AMATEUR"}
                onClick={() => setTournamentType("AMATEUR")}
                icon={<Trophy size={18} weight="fill" />}
                title="AMATEUR"
                desc="Любительский турнир. ELO начисляется при флаге доверия. Автоподтверждение участников."
                accent="var(--accent)"
              />
              <OptionCard
                selected={tournamentType === "SANDBOX"}
                onClick={() => setTournamentType("SANDBOX")}
                icon={<Users size={18} weight="fill" />}
                title="SANDBOX"
                desc="Песочница без ELO. Ручной ввод участников. Идеально для быстрых мероприятий."
                accent="var(--text-muted)"
              />
            </div>
          </Window>

          {/* ── Секция 4: Сетка ── */}
          <Window title="Формат сетки">
            <SectionLabel step={4} label="Тип турнирной сетки" />

            {/* Контекст совместимости */}
            <div className="flex items-center gap-2 mb-4 text-[11px] text-[var(--text-muted)] bg-[var(--panel-sunken)] rounded-lg px-3 py-2 border border-[var(--hairline)]">
              <Info size={13} className="shrink-0 text-[var(--accent)]" />
              {isTeam
                ? "Все форматы совместимы с командными дисциплинами. Участники — команды, созданные в кабинете."
                : "Все форматы совместимы с одиночными дисциплинами (1v1). Участники — отдельные игроки."}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <OptionCard
                selected={bracketType === "SINGLE_ELIM"}
                onClick={() => setBracketType("SINGLE_ELIM")}
                icon={<Sword size={18} weight="fill" />}
                title="Single Elimination"
                desc={`Олимпийская сетка. Одно поражение — выбывание. ${isTeam ? "Подходит для командных турниров любого размера." : "Классика 1v1. От 4 до 256 участников."}`}
                accent="#5B8EF0"
              />
              <OptionCard
                selected={bracketType === "DOUBLE_ELIM"}
                onClick={() => setBracketType("DOUBLE_ELIM")}
                icon={<Sword size={18} weight="duotone" />}
                title="Double Elimination"
                desc={`Сетка с шансом на реванш. Два поражения — выбывание. ${isTeam ? "Командный формат, популярен в киберспорте." : "Даёт второй шанс в 1v1."}`}
                accent="#8B5CF6"
              />
              <OptionCard
                selected={bracketType === "ROUND_ROBIN"}
                onClick={() => setBracketType("ROUND_ROBIN")}
                icon={<Globe size={18} weight="fill" />}
                title="Round Robin"
                desc={`Каждый против каждого. ${isTeam ? "Рекомендуется до 8–10 команд (число матчей растёт квадратично)." : "Оптимально до 8–10 участников."}`}
                accent="var(--status-done)"
              />
              <OptionCard
                selected={bracketType === "SWISS"}
                onClick={() => setBracketType("SWISS")}
                icon={<Users size={18} weight="fill" />}
                title="Swiss System"
                desc={`Балансировка по очкам. ${isTeam ? "Отлично для командных лиг от 6 команд." : "Лучший выбор для 1v1 с 6+ участниками."}`}
                accent="var(--status-live)"
              />
            </div>
          </Window>

          {/* ── Секция 5: Даты и призы ── */}
          <Window title="Детали">
            <SectionLabel step={5} label="Даты и финансы" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Дата начала *">
                <Input
                  type="datetime-local"
                  required
                  className="font-mono"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Сейчас установлено: сегодня</span>
              </Field>
              <Field label="Дата окончания">
                <Input
                  type="datetime-local"
                  className="font-mono"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
              <Field label="Призовой фонд">
                <Input
                  type="text"
                  placeholder="Например: 50 000 руб + Кубок"
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                />
              </Field>
              <Field label="Организационный взнос (руб)">
                <Input
                  type="number"
                  min={0}
                  className="font-mono text-right"
                  value={entryFee}
                  onChange={(e) => setEntryFee(Number(e.target.value))}
                />
              </Field>
            </div>

            {/* Приватность */}
            <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--panel-sunken)]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Lock size={13} className="text-[var(--text-muted)]" />
                    <span className="font-bold text-sm text-[var(--text)]">Приватный турнир</span>
                    {isPrivate && <Badge tone="accent">Вкл</Badge>}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">
                    Не отображается в каталоге. Доступ только по ссылке-приглашению.
                  </p>
                </div>
              </label>
            </div>
          </Window>

          {/* ── Секция 6: Кастомные поля (опциональная) ── */}
          <Window title="Судейские поля">
            <SectionLabel step={6} label="Кастомные поля матчей (необязательно)" />
            <p className="text-[11px] text-[var(--text-muted)] mb-4 leading-relaxed">
              Дополнительные данные, которые судья заполнит при подтверждении результата (например, «Игровая карта», «Номер стола»).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 items-end">
              <Field label="Имя (лат.)">
                <Input type="text" placeholder="game_map" className="h-8 text-xs" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
              </Field>
              <Field label="Метка">
                <Input type="text" placeholder="Игровая карта" className="h-8 text-xs" value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} />
              </Field>
              <Field label="Тип">
                <Select className="h-8 text-xs" value={fieldType} onChange={(e) => setFieldType(e.target.value)}>
                  <option value="text">Текст</option>
                  <option value="number">Число</option>
                </Select>
              </Field>
              <Button type="button" variant="gel" size="sm" onClick={handleAddCustomField} leftIcon={<Plus size={12} />}>
                Добавить
              </Button>
            </div>

            <Checkbox label="Следующее поле — обязательное" className="text-[11px] mb-3" checked={fieldRequired} onChange={(e) => setFieldRequired(e.target.checked)} />

            <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
              {customFields.map((field, idx) => (
                <div key={field.name} className="flex justify-between items-center p-2.5 bg-[var(--panel-sunken)] border border-[var(--hairline)] rounded-ctl">
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="font-bold text-[var(--text)]">{field.label}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">({field.name} / {field.type === "number" ? "число" : "текст"}{field.required ? " / обяз." : ""})</span>
                  </div>
                  <button type="button" onClick={() => setCustomFields((p) => p.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-[color-mix(in_srgb,var(--status-danger)_10%,transparent)] rounded text-[var(--status-danger)]">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {customFields.length === 0 && (
                <div className="text-[11px] text-[var(--text-muted)] italic font-mono text-center py-2">Кастомных полей нет</div>
              )}
            </div>
          </Window>

          {/* ── CTA ── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="button" variant="secondary" className="sm:flex-1" onClick={() => router.push("/dashboard")}>
              Отмена
            </Button>
            <Button type="submit" variant="gel" className="sm:flex-1 sm:flex-[2]" loading={submitting} disabled={submitting}>
              {submitting ? "Создание..." : "Создать турнир"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
