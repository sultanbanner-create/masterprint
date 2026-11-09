"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [from, setFrom] = useState("/");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fromParam = new URLSearchParams(window.location.search).get("from");
    if (fromParam) setFrom(fromParam);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Неверный логин или пароль");

      // Переход только внутри сайта (защита от подмены адреса)
      const safe = from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/login");
      window.location.href = safe ? from : "/";
    } catch (err: any) {
      setErrorMsg(err.message || "Не удалось войти");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink md:bg-slate-100 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      {/* Фирменная часть */}
      <section className="relative overflow-hidden bg-ink text-white px-6 pt-[calc(env(safe-area-inset-top,0px)_+_40px)] pb-10 md:p-12 lg:p-16 flex flex-col justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 w-[420px] h-[420px] rounded-full bg-brand-600/30 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="Master Print" className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover" />
          <div className="leading-tight">
            <div className="text-lg md:text-xl font-extrabold tracking-tight">Master Print</div>
            <div className="text-xs md:text-sm text-slate-400">Рекламное агентство и цех</div>
          </div>
        </div>

        <div className="relative mt-10 md:mt-0 max-w-md">
          <h1 className="text-[28px] leading-[1.15] md:text-4xl lg:text-[44px] font-extrabold tracking-tight text-balance">
            Заказы, цех и касса в одном месте
          </h1>
          <p className="hidden md:block mt-4 text-slate-400 text-base leading-relaxed">
            Наряды от расчёта до монтажа, сроки мастеров, долги клиентов и склад материалов.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="cmyk-strip w-24 rounded-full" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">C · M · Y · K</span>
          </div>
        </div>

        <div className="relative hidden md:block text-xs text-slate-500">Master Print ERP · {new Date().getFullYear()}</div>
      </section>

      {/* Форма входа */}
      <section className="bg-slate-100 rounded-t-[28px] md:rounded-none -mt-4 md:mt-0 relative flex items-start md:items-center justify-center px-5 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)_+_32px)] md:p-12 min-h-[60vh] md:min-h-screen">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Вход</h2>
          <p className="text-sm text-slate-500 mt-1">Логин и пароль выдаёт директор</p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4" noValidate>
            {errorMsg && (
              <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="login" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Логин
              </label>
              <input
                id="login"
                type="text"
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                placeholder="например, timur"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full h-12 px-4 text-base bg-white border border-slate-300 rounded-xl focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none text-slate-900 placeholder:text-slate-400 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-4 pr-12 text-base bg-white border border-slate-300 rounded-xl focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none text-slate-900 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1.5 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !login.trim() || !password}
              className="w-full h-12 mt-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-base flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {isLoading ? "Входим…" : "Войти"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-500 leading-relaxed">
            Забыли пароль? Попросите директора задать новый в разделе «Пароль и вход».
          </p>
        </div>
      </section>
    </div>
  );
}
