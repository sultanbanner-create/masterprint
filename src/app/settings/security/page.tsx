"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Eye, EyeOff, RefreshCw, Copy, Check, AlertTriangle, UserCog } from "lucide-react";

interface EmployeeRow {
  id: string;
  name: string;
  login: string | null;
  roleTitle: string;
  isActive: boolean;
  hasPassword: boolean;
  oldFormat: boolean;
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePassword(length = 10): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const inputCls =
  "w-full px-3.5 py-3 text-base sm:text-sm bg-white border border-slate-300 rounded-xl focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none transition";

export default function SecuritySettingsPage() {
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Мой пароль
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myResult, setMyResult] = useState<{ ok?: string; error?: string } | null>(null);

  // Пароль сотрудника (для директора)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staffPassword, setStaffPassword] = useState("");
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffResult, setStaffResult] = useState<{ id: string; ok?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    fetch("/api/auth/password", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.me) setMe(data.me);
        if (Array.isArray(data.employees)) setEmployees(data.employees);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const isDirector = me?.role === "DIRECTOR";
  const myRow = employees.find((e) => e.id === me?.id);

  const changeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyResult(null);
    if (next !== repeat) {
      setMyResult({ error: "Новый пароль и повтор не совпадают" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сменить пароль");
      setMyResult({ ok: "Пароль изменён. Используйте его при следующем входе." });
      setCurrent("");
      setNext("");
      setRepeat("");
      load();
    } catch (err: any) {
      setMyResult({ error: err.message });
    } finally {
      setSaving(false);
    }
  };

  const setStaff = async (id: string) => {
    setStaffResult(null);
    setStaffSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: id, newPassword: staffPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить пароль");
      setStaffResult({ id, ok: `Новый пароль для ${data.name} сохранён. Передайте его лично.` });
      load();
    } catch (err: any) {
      setStaffResult({ id, error: err.message });
    } finally {
      setStaffSaving(false);
    }
  };

  const copyStaffPassword = async () => {
    try {
      await navigator.clipboard.writeText(staffPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Безопасность и пароли</h2>
        <p className="text-sm text-slate-500 mt-1">
          Пароль защищает кассу, клиентов и заказы. Не пересылайте его в чатах.
        </p>
      </div>

      {myRow?.oldFormat && (
        <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <b>Смените пароль.</b> Старые пароли вида «имя2026» были видны в открытом коде, поэтому их
            нужно заменить на новые.
          </div>
        </div>
      )}

      {/* Мой пароль */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900">Мой пароль</h3>
            <p className="text-xs text-slate-500">{me ? `${me.name}` : "Загрузка…"}</p>
          </div>
        </div>

        <form onSubmit={changeMyPassword} className="space-y-3.5">
          <div>
            <label htmlFor="cur-pass" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Текущий пароль
            </label>
            <input
              id="cur-pass"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Новый пароль
              </label>
              <input
                id="new-pass"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={inputCls}
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="rep-pass" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Повторите новый пароль
              </label>
              <input
                id="rep-pass"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className={inputCls}
                minLength={8}
                required
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">Не меньше 8 символов. Лучше смешать буквы и цифры.</p>

          {myResult?.error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{myResult.error}</div>
          )}
          {myResult?.ok && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> {myResult.ok}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm disabled:opacity-50 transition"
            >
              {saving ? "Сохраняю…" : "Сменить пароль"}
            </button>
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {show ? "Скрыть пароли" : "Показать пароли"}
            </button>
          </div>
        </form>
      </section>

      {/* Пароли сотрудников */}
      {isDirector && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <UserCog className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-slate-900">Пароли сотрудников</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Задайте каждому новый пароль и передайте его лично, не в общем чате.
          </p>

          {loading ? (
            <p className="text-sm text-slate-500">Загрузка…</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {employees
                .filter((e) => e.id !== me?.id)
                .map((e) => (
                  <li key={e.id} className="py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {e.name}{" "}
                          <span className="text-xs font-normal text-slate-500">· {e.login || "без логина"}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">{e.roleTitle}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!e.hasPassword ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">нет пароля</span>
                        ) : e.oldFormat ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">старый пароль</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">обновлён</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(editingId === e.id ? null : e.id);
                            setStaffPassword(generatePassword());
                            setStaffResult(null);
                          }}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          {editingId === e.id ? "Отмена" : "Новый пароль"}
                        </button>
                      </div>
                    </div>

                    {editingId === e.id && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <label htmlFor={`staff-pass-${e.id}`} className="block text-xs font-semibold text-slate-600">
                          Новый пароль для {e.name}
                        </label>
                        <div className="flex gap-2">
                          <input
                            id={`staff-pass-${e.id}`}
                            type="text"
                            value={staffPassword}
                            onChange={(ev) => setStaffPassword(ev.target.value)}
                            className={inputCls + " font-mono"}
                          />
                          <button
                            type="button"
                            onClick={() => setStaffPassword(generatePassword())}
                            title="Придумать другой"
                            className="px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={copyStaffPassword}
                            title="Скопировать"
                            className="px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        {staffResult?.id === e.id && staffResult.error && (
                          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{staffResult.error}</div>
                        )}
                        {staffResult?.id === e.id && staffResult.ok && (
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{staffResult.ok}</div>
                        )}
                        <button
                          type="button"
                          disabled={staffSaving}
                          onClick={() => setStaff(e.id)}
                          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm disabled:opacity-50"
                        >
                          {staffSaving ? "Сохраняю…" : "Сохранить пароль"}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
