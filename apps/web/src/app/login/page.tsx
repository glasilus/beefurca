"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { WarningOctagon, DiscordLogo } from "@phosphor-icons/react";
import { API_URL, apiFetch, setSession } from "../../lib/api";
import { ThemeToggle } from "../../components/ThemeToggle";

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
    <div className="min-h-screen bg-obsidian-base flex flex-col justify-center items-center px-4 relative">
      <div className="absolute inset-0 dither-overlay z-0" />
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md component-card-dark p-8">
        <h2 className="text-5xl font-pixel text-center tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-activeGrad-start via-activeGrad-mid to-activeGrad-end mb-1">
          BEEFURCA
        </h2>
        <p className="text-[10px] text-center font-mono uppercase tracking-widest text-slate-500 mb-8">
          {isRegister ? "Создание учетной записи" : "Авторизация в системе"}
        </p>

        {error && (
          <div className="flex gap-2 p-3.5 mb-6 text-xs border border-red-950/60 bg-red-950/20 text-red-400 rounded">
            <WarningOctagon size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="flex gap-2 p-3.5 mb-6 text-xs border border-green-950/60 bg-green-950/20 text-green-400 rounded">
            <span>{info}</span>
          </div>
        )}

        {/* Вход через Discord */}
        <button
          type="button"
          onClick={handleDiscordLogin}
          className="w-full h-11 mb-5 flex items-center justify-center gap-2 rounded bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold uppercase tracking-widest transition shadow-lg"
        >
          <DiscordLogo size={18} weight="fill" />
          Войти через Discord
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-obsidian-border" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600">
            или по почте
          </span>
          <div className="flex-1 h-px bg-obsidian-border" />
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                Никнейм *
              </label>
              <input
                type="text"
                required
                minLength={2}
                className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start"
                placeholder="Пример: Cyber_Knight"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
              Электронная почта *
            </label>
            <input
              type="email"
              required
              className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
              Пароль *
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                  ФИО (необязательно)
                </label>
                <input
                  type="text"
                  className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start"
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                  Контактный телефон (необязательно)
                </label>
                <input
                  type="tel"
                  className="h-10 bg-obsidian-input border border-obsidian-border rounded px-3.5 text-xs text-white focus:outline-none focus:border-activeGrad-start"
                  placeholder="+7 ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 mt-4 bg-activeGrad-start hover:bg-red-600 rounded text-xs font-bold uppercase tracking-widest text-white shadow-lg transition flex items-center justify-center disabled:opacity-60"
          >
            {loading ? "Загрузка..." : isRegister ? "Зарегистрироваться" : "Войти в систему"}
          </button>
        </form>

        <div className="flex flex-col items-center mt-8 pt-6 border-t border-obsidian-border text-xs text-slate-400 gap-2">
          <span>{isRegister ? "Уже есть аккаунт?" : "Еще нет учетной записи?"}</span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setInfo("");
            }}
            className="text-completeGrad-mid font-semibold hover:underline"
          >
            {isRegister ? "Войти в систему" : "Создать аккаунт"}
          </button>
        </div>
      </div>
    </div>
  );
}
