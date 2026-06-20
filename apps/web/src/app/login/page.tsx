"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { WarningOctagon, DiscordLogo, CheckCircle } from "@phosphor-icons/react";
import { API_URL, apiFetch, setSession } from "../../lib/api";
import { ThemeToggle } from "../../components/ThemeToggle";
import { Logo } from "../../components/Logo";
import { Window } from "../../components/ui/Window";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";


export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const endpoint = isRegister ? "/auth/register" : "/auth/login";
    // Роль НЕ отправляется: все регистрируются как Player, роль меняет админ.
    const bodyObj = isRegister
      ? {
          nickname,
          email,
          password,
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
        }
      : { email, password };

    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(bodyObj),
      });

      const data = await res.json();
      if (res.ok) {
        if (isRegister) {
          setIsRegister(false);
          setInfo("Регистрация успешна! Теперь вы можете войти.");
        } else {
          setSession(data.user, data.accessToken);
          router.push("/dashboard");
        }
      } else {
        setError(data.error || "Произошла ошибка при авторизации.");
      }
    } catch (err: any) {
      setError(`Ошибка подключения: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = () => {
    // Браузерный редирект (не fetch): бэкенд уведёт на согласие Discord,
    // а после — обратно на /dashboard с установленной cookie-сессией.
    window.location.href = `${API_URL}/auth/discord`;
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <Window
        title={isRegister ? "Регистрация" : "Авторизация"}
        onClose={() => router.push("/")}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo fractal */}
        <div className="flex flex-col items-center mb-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="На главную"
            title="На главную"
            className="cursor-pointer rounded-[14px] transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Logo size={60} />
          </button>
          <h2 className="font-score text-2xl tracking-[.04em] text-[var(--text)] mt-3">
            BEEFURCA
          </h2>
          <p className="text-[10px] font-cond uppercase tracking-widest text-[var(--text-muted)] mt-1">
            {isRegister ? "Создание учетной записи" : "Авторизация в системе"}
          </p>
        </div>

        {error && (
          <div className="flex gap-2 p-3.5 mb-6 text-xs border border-[var(--status-danger)] bg-[color-mix(in_srgb,var(--status-danger)_10%,transparent)] text-[var(--status-danger)] rounded-ctl">
            <WarningOctagon size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="flex gap-2 p-3.5 mb-6 text-xs border border-[var(--status-win)] bg-[color-mix(in_srgb,var(--status-win)_10%,transparent)] text-[var(--status-win)] rounded-ctl">
            <CheckCircle size={16} className="shrink-0" />
            <span>{info}</span>
          </div>
        )}

        {/* Вход через Discord */}
        <Button
          variant="secondary"
          className="w-full mb-5"
          leftIcon={<DiscordLogo size={18} weight="fill" />}
          onClick={handleDiscordLogin}
        >
          Войти через Discord
        </Button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[var(--hairline)]" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
            или по почте
          </span>
          <div className="flex-1 h-px bg-[var(--hairline)]" />
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {isRegister && (
            <Field label="Никнейм *">
              <Input
                type="text"
                required
                minLength={2}
                placeholder="Пример: Cyber_Knight"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </Field>
          )}

          <Field label="Электронная почта *">
            <Input
              type="email"
              required
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Пароль *">
            <Input
              type="password"
              required
              minLength={6}
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {isRegister && (
            <>
              <Field label="ФИО (необязательно)">
                <Input
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
              <Field label="Контактный телефон (необязательно)">
                <Input
                  type="tel"
                  placeholder="+7 ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </>
          )}

          <Button
            variant="gel"
            className="w-full mt-4"
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {isRegister ? "Зарегистрироваться" : "Войти в систему"}
          </Button>
        </form>

        <div className="flex flex-col items-center mt-8 pt-6 border-t border-[var(--hairline)] text-xs text-[var(--text-muted)] gap-2">
          <span>{isRegister ? "Уже есть аккаунт?" : "Еще нет учетной записи?"}</span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setInfo("");
            }}
            className="text-[var(--accent)] font-semibold hover:underline"
          >
            {isRegister ? "Войти в систему" : "Создать аккаунт"}
          </button>
        </div>
      </Window>
    </div>
  );
}
