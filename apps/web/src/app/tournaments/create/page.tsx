"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash as Trash2, Info, Plus } from "@phosphor-icons/react";
import { apiFetch, fetchProfile, setSession } from "../../../lib/api";
import { Nav } from "../../../components/Nav";
import { useToast } from "../../../components/Toast";
import { Window, Card } from "../../../components/ui/Window";
import { Button } from "../../../components/ui/Button";
import { Field, Input, Select, Checkbox } from "../../../components/ui/Field";
import { Badge } from "../../../components/ui/Badge";
import { PageHeader } from "../../../components/ui/PageHeader";
import { FractalMedallion } from "../../../components/Fractal";

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
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest animate-pulse text-[var(--text-muted)]">
          Загрузка...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 relative">
      <Nav active="create" profile={profile} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 mt-12">
        <PageHeader
          title="Создание турнира"
          eyebrow="Новый турнир"
        />
        <p className="text-xs text-[var(--text-muted)] -mt-4 mb-8">
          Любой пользователь может создать любительский (AMATEUR) или автономный
          (SANDBOX) турнир. PRO-турниры доступны организаторам и администраторам.
        </p>

        {/* Cover preview from tournament name */}
        {name.trim() && (
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center gap-2">
              <FractalMedallion seed={name} size={96} shape="rounded" />
              <span className="text-[10px] font-cond uppercase text-[var(--text-muted)]">Обложка турнира</span>
            </div>
          </div>
        )}

        {disciplinesList.length === 0 && (
          <Card className="mb-6">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Info size={16} className="shrink-0 text-[var(--accent)]" />
              Готовых дисциплин пока нет -- нажмите «+ Создать свою» и заведите любую.
            </div>
          </Card>
        )}

        <Window title="Параметры турнира">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Field label="Название турнира *">
              <Input
                type="text"
                required
                placeholder="Например: Чемпионат ВУЗа по шахматам 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-cond uppercase tracking-[.06em] text-[11px] text-[var(--text-muted)]">Соревновательная дисциплина *</span>
                  <button
                    type="button"
                    onClick={() => setCreateInlineDiscipline(!createInlineDiscipline)}
                    className="text-[11px] font-bold text-[var(--accent)] hover:underline uppercase font-cond"
                  >
                    {createInlineDiscipline ? "Выбрать существующую" : "+ Создать свою"}
                  </button>
                </div>

                {!createInlineDiscipline ? (
                  <Select
                    value={selectedDisciplineId}
                    onChange={(e) => setSelectedDisciplineId(e.target.value)}
                  >
                    {disciplinesList.length === 0 && <option value="">Дисциплин нет -- создайте свою</option>}
                    {disciplinesList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.gameType === "TEAM" ? "Командная" : "Одиночная"})
                        {d.isOfficial ? " [офиц.]" : ""}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Card>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
                      Новая дисциплина станет доступна всем. Это ядро платформы: вы
                      можете провести турнир по чему угодно, не дожидаясь админа.
                    </p>
                    <div className="flex flex-col gap-3">
                      <Input
                        type="text"
                        placeholder="Название (например: Mortal Kombat 1)"
                        value={inlineDiscName}
                        onChange={(e) => setInlineDiscName(e.target.value)}
                      />
                      <Select
                        value={inlineDiscGameType}
                        onChange={(e) => setInlineDiscGameType(e.target.value)}
                      >
                        <option value="SINGLE">Одиночная (1v1)</option>
                        <option value="TEAM">Командная (Team Roster)</option>
                      </Select>
                      <textarea
                        placeholder="Правила (необязательно)"
                        rows={2}
                        className="p-2.5 text-[14px] font-sans text-[var(--text)] bg-[var(--panel-sunken)] border border-[var(--border)] rounded-ctl shadow-[inset_0_2px_4px_rgba(0,0,0,.12)] outline-none focus:border-[var(--accent)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,.12),0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)] placeholder:text-[var(--text-muted)]"
                        value={inlineDiscRules}
                        onChange={(e) => setInlineDiscRules(e.target.value)}
                      />
                    </div>
                  </Card>
                )}
              </div>

              <Field label="Уровень лиги (Тип турнира) *">
                <Select
                  value={tournamentType}
                  onChange={(e) => setTournamentType(e.target.value)}
                >
                  {isPrivileged && <option value="PRO">PRO (Влияет на ELO, строгие правила)</option>}
                  <option value="AMATEUR">AMATEUR (ELO при флаге доверия, автоподтверждение)</option>
                  <option value="SANDBOX">SANDBOX (Без ELO, ручной ввод участников)</option>
                </Select>
                {!isPrivileged && (
                  <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                    PRO-турниры доступны только организаторам.
                  </span>
                )}
              </Field>

              <Field label="Тип турнирной сетки *">
                <Select
                  value={bracketType}
                  onChange={(e) => setBracketType(e.target.value)}
                >
                  <option value="SINGLE_ELIM">Single Elimination (Олимпийская сетка)</option>
                  <option value="DOUBLE_ELIM">Double Elimination (Сетка лузеров)</option>
                  <option value="ROUND_ROBIN">Round Robin (Круговая система)</option>
                  <option value="SWISS">Swiss System (Швейцарская система)</option>
                </Select>
              </Field>

              <Field label="Дата начала турнира *">
                <Input
                  type="datetime-local"
                  required
                  className="font-mono"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>

              <Field label="Дата окончания (необязательно)">
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
                  placeholder="Например: 50 000 руб + ценные призы"
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

            <Card className="cursor-pointer">
              <Checkbox
                label=""
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <div className="ml-6 -mt-5">
                <span className="text-sm font-bold text-[var(--text)]">Приватный турнир</span>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">
                  Не отображается в публичном каталоге. Доступ -- только по прямой
                  ссылке-приглашению (кнопка «Пригласить» на странице турнира).
                  Работает и для AMATEUR, и для PRO.
                </p>
              </div>
            </Card>

            {/* Кастомные судейские поля матчей */}
            <div className="border-t border-[var(--hairline)] pt-6 mt-4">
              <h3 className="font-cond font-semibold uppercase tracking-[.06em] text-[12px] text-[var(--text-muted)] mb-3">
                Кастомные судейские поля матчей
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mb-4 leading-relaxed">
                Дополнительные метаданные, которые судья заполнит при подтверждении
                результата (например, «Игровая карта», «Номер стола»).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 items-end">
                <Field label="Имя (лат. без пробелов)">
                  <Input
                    type="text"
                    placeholder="game_map"
                    className="h-8 text-xs"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                  />
                </Field>
                <Field label="Отображаемая метка">
                  <Input
                    type="text"
                    placeholder="Игровая карта"
                    className="h-8 text-xs"
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                  />
                </Field>
                <Field label="Тип значения">
                  <Select
                    className="h-8 text-xs"
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                  >
                    <option value="text">Текст</option>
                    <option value="number">Число</option>
                  </Select>
                </Field>
                <Button
                  type="button"
                  variant="gel"
                  size="sm"
                  onClick={handleAddCustomField}
                  leftIcon={<Plus size={12} />}
                >
                  Добавить поле
                </Button>
              </div>

              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                {customFields.map((field, idx) => (
                  <div key={field.name} className="flex justify-between items-center p-2.5 bg-[var(--panel-sunken)] border border-[var(--hairline)] rounded-ctl">
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="font-bold text-[var(--text)]">{field.label}</span>
                      <span className="text-[var(--text-muted)] text-[10px]">
                        ({field.name} / {field.type === "number" ? "число" : "текст"}
                        {field.required ? " / обяз." : ""})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(idx)}
                      className="p-1.5 hover:bg-[color-mix(in_srgb,var(--status-danger)_10%,transparent)] rounded text-[var(--status-danger)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {customFields.length === 0 && (
                  <div className="text-[11px] text-[var(--text-muted)] italic font-mono text-center py-2">
                    Кастомные поля матчей не добавлены
                  </div>
                )}
              </div>

              <Checkbox
                label="Следующее добавляемое поле -- обязательное"
                className="mt-3 text-[11px]"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
              />
            </div>

            <div className="border-t border-[var(--hairline)] pt-6 mt-4 flex gap-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => router.push("/dashboard")}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant="gel"
                className="flex-1"
                loading={submitting}
                disabled={submitting}
              >
                {submitting ? "Создание..." : "Создать турнир"}
              </Button>
            </div>
          </form>
        </Window>
      </div>
    </div>
  );
}
