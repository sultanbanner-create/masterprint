"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Send, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  HelpCircle,
  Bell,
  ChevronLeft,
  Smartphone,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Bot,
  RefreshCw
} from "lucide-react";

export default function TelegramSettingsPage() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyDeadline, setNotifyDeadline] = useState(true);
  const [notifyStatus, setNotifyStatus] = useState(true);

  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Авто-настройка бота (Webhook + Меню WebApp + Команды)
  const [isSettingUpBot, setIsSettingUpBot] = useState(false);
  const [setupResult, setSetupResult] = useState<{ success?: boolean; error?: string; data?: any } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const tmaUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/tma`
    : "https://masterprint-erp.vercel.app/tma";

  useEffect(() => {
    fetch("/api/telegram")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setBotToken(data.botToken || "");
          setChatId(data.chatId || "");
          setNotifyNewOrder(data.notifyNewOrder ?? true);
          setNotifyDeadline(data.notifyDeadline ?? true);
          setNotifyStatus(data.notifyStatus ?? true);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken,
          chatId,
          notifyNewOrder,
          notifyDeadline,
          notifyStatus,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: botToken,
          chatId: chatId,
          message: `🔥 <b>MASTER PRINT — ТЕСТОВОЕ ОПОВЕЩЕНИЕ</b>\n\n✅ Связь с цехом рекламы успешно установлена!\n\n👥 <b>Команда:</b>\n• Тимур (Директор)\n• Жалгас (Продажи & Дизайн)\n• Абзал (Сборка & Монтаж)\n• Альберт (Печать баннеров)\n\n⚡ Оповещения о горящих дедлайнах и новых нарядах активны.\n📱 Telegram Mini App: ${tmaUrl}`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true });
      } else {
        setTestResult({ error: data.error || "Не удалось отправить сообщение" });
      }
    } catch (e: any) {
      setTestResult({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSetupBot = async () => {
    if (!botToken.trim()) {
      alert("Сначала введите токен бота от @BotFather");
      return;
    }

    setIsSettingUpBot(true);
    setSetupResult(null);
    try {
      const res = await fetch("/api/telegram/setup-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: botToken.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSetupResult({ success: true, data });
      } else {
        setSetupResult({ error: data.error || "Не удалось настроить бота" });
      }
    } catch (e: any) {
      setSetupResult({ error: e.message || "Ошибка соединения с сервером" });
    } finally {
      setIsSettingUpBot(false);
    }
  };

  const handleCopyTmaUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(tmaUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Верхняя панель */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <Link
          href="/"
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Telegram-бот и мобильное приложение (TMA)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Управление заказами цеха со смартфона, уведомления команды и быстрый расчет смет
          </p>
        </div>
      </div>

      {/* КАРТОЧКА 1: TELEGRAM MINI APP (TMA) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Telegram Mini App цеха Master Print
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wide">
                  LIVE TMA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Полноценное мобильное веб-приложение прямо внутри Telegram для мастеров и менеджеров
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTmaUrl}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
              {copiedLink ? "Скопировано!" : "Копировать ссылку"}
            </button>
            <a
              href="/tma"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition shadow-md shadow-blue-600/30 flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              Открыть TMA
            </a>
          </div>
        </div>

        {/* Возможности TMA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-amber-400 font-bold block mb-1">⚡ Авто-синхронизация 4 сек</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Мастера (Абзал, Альберт) видят новые наряды мгновенно и отмечают готовность в 1 тап.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-cyan-400 font-bold block mb-1">🖩 Мобильный калькулятор</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Расчет акриловых коробов, баннеров и букв с копированием сметы в чат заказчика в 1 клик.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-emerald-400 font-bold block mb-1">📲 Тактильный виброотклик</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Нативный Telegram Haptic Feedback при смене статусов и сохранении нарядов.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px] bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 truncate">
            <span className="text-slate-500 select-none">URL:</span>
            <span className="text-blue-300 select-all truncate">{tmaUrl}</span>
          </div>

          <button
            onClick={handleSetupBot}
            disabled={isSettingUpBot || !botToken}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-black transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 shrink-0"
          >
            {isSettingUpBot ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Настройка бота...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                🚀 Авто-настройка бота в 1 клик
              </>
            )}
          </button>
        </div>

        {/* Результат авто-настройки */}
        {setupResult?.success && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Бот успешно настроен и подключен к системе!</span>
            </div>
            <div className="text-slate-300 text-[11px] space-y-1 pl-6">
              <div>• Бот: <b>@{setupResult.data?.bot?.username}</b> ({setupResult.data?.bot?.name})</div>
              <div>• Webhook установлен: <b>{setupResult.data?.webhook?.url}</b></div>
              <div>• Кнопка Меню «Master Print ERP» привязана к <b>{setupResult.data?.menuButton?.url}</b></div>
              <div>• Меню команд (/orders, /new, /calc, /stats) зарегистрировано</div>
            </div>
            <div className="pt-2 pl-6">
              <a
                href={setupResult.data?.bot?.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition"
              >
                <Send className="w-3.5 h-3.5" /> Открыть @{setupResult.data?.bot?.username} в Telegram
              </a>
            </div>
          </div>
        )}

        {setupResult?.error && (
          <div className="p-3.5 bg-red-500/20 border border-red-500/30 text-red-200 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{setupResult.error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Форма настроек */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              Параметры подключения бота
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Telegram Bot Token (от @BotFather)
                </label>
                <input
                  type="text"
                  placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full px-3 py-2.5 font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chat ID группы или директора
                </label>
                <input
                  type="text"
                  placeholder="-100123456789 или @channel_name"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  className="w-full px-3 py-2.5 font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider">
                  События для отправки в Telegram:
                </span>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyNewOrder}
                    onChange={(e) => setNotifyNewOrder(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-slate-700 font-medium">
                    🔔 Создание нового заказа (смета, клиент, ответственный мастер)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyDeadline}
                    onChange={(e) => setNotifyDeadline(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-slate-700 font-medium">
                    🔥 Горящий дедлайн (до сдачи осталось менее 4 часов)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStatus}
                    onChange={(e) => setNotifyStatus(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-slate-700 font-medium">
                    📦 Смена статуса заказа («Отпечатан», «Смонтирован», «Сдан»)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
              >
                Сохранить настройки
              </button>

              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" /> Настройки сохранены!
                </span>
              )}
            </div>
          </form>

          {/* Блок отправки теста */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Проверка связи с ботом
            </h3>
            <p className="text-xs text-slate-500">
              Нажмите кнопку ниже, чтобы проверить правильность Bot Token и Chat ID:
            </p>

            <button
              type="button"
              disabled={testing || !botToken || !chatId}
              onClick={handleSendTest}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              {testing ? "Отправка..." : "Отправить тестовое сообщение в Telegram"}
            </button>

            {testResult?.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Сообщение успешно доставлено в Telegram!</span>
              </div>
            )}

            {testResult?.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Ошибка Telegram API: {testResult.error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Справка как получить токен и настроить WebApp */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-xs space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              Инструкция подключения:
            </h3>

            <ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed">
              <li>
                Откройте бота <b>@BotFather</b> в Telegram.
              </li>
              <li>
                Отправьте <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">/newbot</code> и задайте имя бота (например: <i>MasterPrintBot</i>).
              </li>
              <li>
                Скопируйте полученный <b>HTTP API Token</b> и вставьте в поле слева.
              </li>
              <li>
                Нажмите синюю кнопку <b>«🚀 Авто-настройка бота в 1 клик»</b> — система автоматически зарегистрирует Webhook, добавит кнопку запуска TMA в чате и настроит команды!
              </li>
              <li>
                (Опционально) Добавьте бота в рабочий групповой чат цеха и укажите его Chat ID для групповых алертов.
              </li>
            </ol>
          </div>

          <div className="bg-gradient-to-tr from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 text-xs space-y-2">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Прямое подключение
            </div>
            <p className="text-blue-700 leading-relaxed text-[11px]">
              Все команды Telegram и Mini App обрабатываются напрямую через защищенные API endpoints вашего сервера на Vercel без сторонних сервисов.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
