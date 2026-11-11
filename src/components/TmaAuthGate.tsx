"use client";

import React, { useEffect, useState } from "react";
import { Lock, LogIn } from "lucide-react";

/**
 * Мини-приложение в Telegram показывает данные только после входа.
 * Раньше доступ открывался по заголовку Referer, который легко подделать.
 * Вход запоминается в Telegram на 30 дней, как и на сайте.
 */
export function TmaAuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "in" | "out">("checking");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setState(d?.user ? "in" : "out"))
      .catch(() => setState("out"));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Неверный логин или пароль");
      setState("in");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (state === "in") return <>{children}</>;

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Загрузка…</div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="" className="w-11 h-11 rounded-xl object-cover" />
          <div>
            <div className="text-base font-extrabold text-white tracking-tight">Master Print</div>
            <div className="text-xs text-slate-400">Войдите, чтобы открыть наряды цеха</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="tma-login" className="block text-xs font-semibold text-slate-400">Логин</label>
          <input
            id="tma-login"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white focus:border-blue-500 focus:outline-none"
            required
          />
          <label htmlFor="tma-pass" className="block text-xs font-semibold text-slate-400 pt-1">Пароль</label>
          <input
            id="tma-pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white focus:border-blue-500 focus:outline-none"
            required
          />
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">{error}</div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {busy ? "Вход…" : "Войти"}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-2">
            <Lock className="w-3.5 h-3.5" /> Вход сохранится на 30 дней
          </p>
        </form>
      </div>
    </div>
  );
}
