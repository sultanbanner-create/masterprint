"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [from, setFrom] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from");
      if (fromParam) setFrom(fromParam);
    }
  }, []);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const teamMembers = [
    {
      name: "Тимур",
      role: "Директор / Владелец",
      login: "timur",
      pass: "timur2026",
      desc: "Полный доступ: касса, прием денег, маржа, зарплаты",
      badge: "Руководитель",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      avatarBg: "bg-purple-600",
    },
    {
      name: "Жалгас",
      role: "Менеджер & Дизайнер",
      login: "zhalgas",
      pass: "zhalgas2026",
      desc: "Добавление заказов, расчеты, получение оплат от клиентов",
      badge: "Продажи",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      avatarBg: "bg-blue-600",
    },
    {
      name: "Абзал",
      role: "Мастер сборки & Монтаж",
      login: "abzal",
      pass: "abzal2026",
      desc: "Цех, канбан, сборка букв/лайтбоксов, монтажи",
      badge: "Монтаж",
      badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
      avatarBg: "bg-orange-600",
    },
    {
      name: "Альберт",
      role: "Мастер & Печатник",
      login: "albert",
      pass: "albert2026",
      desc: "Очередь широкоформатной печати, наряды, склад",
      badge: "Печать",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      avatarBg: "bg-emerald-600",
    },
  ];

  const submitCredentials = async (loginToSubmit: string, passToSubmit: string) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginToSubmit.trim(), password: passToSubmit }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Неверный логин или пароль");
      }

      // Успешный вход — делаем полноценный переход, чтобы гарантированно применилась сессия
      const targetUrl = from && from !== "/login" ? from : "/";
      window.location.href = targetUrl;
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка авторизации");
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCredentials(login, password);
  };

  const selectEmployee = (empLogin: string, empPass: string, autoSubmit = false) => {
    setLogin(empLogin);
    setPassword(empPass);
    setErrorMsg(null);
    if (autoSubmit) {
      submitCredentials(empLogin, empPass);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Логотип Master Print */}
        <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white shadow-md border border-slate-200 mb-3">
          <img
            src="/logo.png"
            alt="Master Print"
            className="w-12 h-12 rounded-xl object-cover"
          />
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
          <span>MASTER</span>
          <span className="text-blue-600">PRINT</span>
          <span className="text-slate-400 font-light text-xl">ERP</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Вход в систему управления агентством и цехом
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-7 px-5 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-semibold">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Логин сотрудника
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="timur, zhalgas, abzal, albert..."
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none font-semibold text-slate-800"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Пароль
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? "Скрыть" : "Показать"}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none font-mono"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Пин-код: <code className="font-bold text-slate-700 bg-slate-100 px-1 rounded">7777</code></span>
                <span>Пароль: <code className="font-bold text-slate-700 bg-slate-100 px-1 rounded">&lt;логин&gt;2026</code></span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? "Вход в систему..." : "Войти в систему"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Быстрый вход в 1 клик для сотрудников */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-2.5">
              Вход в 1 клик для сотрудников:
            </span>

            <div className="space-y-2">
              {teamMembers.map((emp) => (
                <div
                  key={emp.login}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition text-left flex items-center justify-between group bg-slate-50/50"
                >
                  <div
                    onClick={() => selectEmployee(emp.login, emp.pass, false)}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 mr-2"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${emp.avatarBg}`}
                    >
                      {emp.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                          {emp.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${emp.badgeColor}`}
                        >
                          {emp.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {emp.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => selectEmployee(emp.login, emp.pass, true)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-slate-700 text-[11px] font-bold transition shadow-2xs shrink-0 flex items-center gap-1 disabled:opacity-50"
                    title={`Войти сразу как ${emp.name}`}
                  >
                    <span>Войти</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Защита и безопасность */}
        <div className="mt-4 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Защищенное шифрование сессий · Master Print 2026</span>
        </div>
      </div>
    </div>
  );
}
