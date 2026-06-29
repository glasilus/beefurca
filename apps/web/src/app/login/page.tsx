"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSession } from "../../lib/api";
import { PixelAvatar } from "../../components/PixelAvatar";
import { Window } from "../../components/ui/Window";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Sprite } from "../../components/Sprite";

const DEMO_ACCOUNTS = [
  { role: "Администратор", email: "admin@beefurca.com", password: "admin123" },
  { role: "Организатор", email: "organizer@beefurca.com", password: "organizer123" },
  { role: "Игрок", email: "player@beefurca.com", password: "player123" },
];

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

  const fillDemo = (acc: { email: string; password: string }) => {
    setIsRegister(false);
    setError("");
    setInfo("");
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      {/* Маг — фиксированный нижний левый угол, чуть заходит за край */}
      <div
        className="hidden lg:block fixed bottom-0 left-0 pointer-events-none select-none z-0"
        style={{ transform: "translateX(-14%)" }}
      >
        <Sprite src="/sprites/mage.png" alt="" height={400} />
      </div>

      {/* Призрак — фиксированный нижний правый угол, зеркально */}
      <div
        className="hidden lg:block fixed bottom-0 right-0 pointer-events-none select-none z-0"
        style={{ transform: "translateX(14%)" }}
      >
        <Sprite src="/sprites/ghost.png" alt="" height={400} flip />
      </div>

      {/* Форма — строго по центру */}
      <Window
        title={isRegister ? "Регистрация" : "Авторизация"}
        onClose={() => router.push("/")}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="На главную"
            className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span className="panel-98 inline-block p-1">
              <PixelAvatar seed="BEEFURCA" size={60} />
            </span>
          </button>
          <h2 className="font-score text-2xl tracking-[.16em] mt-3">BEEFURCA</h2>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mt-1">
            {isRegister ? "Создание учётной записи" : "Турнирная консоль"}
          </p>
        </div>

        {error && (
          <div className="flex gap-2 p-3 mb-5 text-xs panel-98-sunken text-[var(--status-danger)]">
            <span className="font-bold shrink-0">[ ! ]</span>
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="flex gap-2 p-3 mb-5 text-xs panel-98-sunken text-[var(--status-win)]">
            <span className="font-bold shrink-0">[ OK ]</span>
            <span>{info}</span>
          </div>
        )}

        {!isRegister && (
          <div className="panel-98 p-3 mb-6">
            <div className="dither text-[9px] uppercase tracking-widest text-[var(--text-muted)] px-2 py-1 mb-2">
              Демо-доступ — нажмите, чтобы подставить
            </div>
            <div className="flex flex-col gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="flex items-center justify-between text-left text-xs px-2 py-1.5 panel-98-sunken hover:text-[var(--accent)] transition-colors"
                >
                  <span className="font-semibold">{acc.role}</span>
                  <span className="font-mono text-[var(--text-muted)]">
                    {acc.email} / {acc.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

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
          <span>{isRegister ? "Уже есть аккаунт?" : "Ещё нет учётной записи?"}</span>
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
