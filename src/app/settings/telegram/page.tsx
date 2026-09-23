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
  ChevronLeft
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
          message: `🔥 <b>OUTDOOR ERP — ТЕСТОВОЕ ОПОВЕЩЕНИЕ</b>\n\n✅ Связь с цехом рекламы успешно установлена!\n\n👥 <b>Команда:</b>\n• Тимур (Директор)\n• Жалгас (Продажи & Дизайн)\n• Абзал (Сборка & Монтаж)\n• Альберт (Печать баннеров)\n\n⚡ Оповещения о горящих дедлайнах и новых нарядах активны.`,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
              Telegram-бот цеха наружной рекламы
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Мгновенные оповещения команды в Telegram о новых заказах и горящих дедлайнах
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Форма настроек */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-teal-600" />
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
                    className="w-4 h-4 text-teal-600 rounded"
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
                    className="w-4 h-4 text-teal-600 rounded"
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
                    className="w-4 h-4 text-teal-600 rounded"
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

        {/* Справка как получить токен */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-xs space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              Как создать бота:
            </h3>

            <ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed">
              <li>
                Откройте в Telegram бота <b>@BotFather</b>
              </li>
              <li>
                Отправьте команду <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">/newbot</code>
              </li>
              <li>
                Введите название бота (например: <i>Outdoor_ERP_Bot</i>)
              </li>
              <li>
                Скопируйте полученный <b>HTTP API Token</b> в поле слева
              </li>
              <li>
                Добавьте вашего бота в рабочий Telegram-чат цеха и сделайте его администратором
              </li>
              <li>
                Укажите Chat ID группы (узнать его можно через <b>@getidsbot</b> или <b>@myidbot</b>)
              </li>
            </ol>
          </div>

          <div className="bg-gradient-to-tr from-teal-50 to-emerald-50 p-4 rounded-2xl border border-teal-200 text-xs space-y-2">
            <div className="font-bold text-teal-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Защита и автономность
            </div>
            <p className="text-teal-700 leading-relaxed">
              Все оповещения отправляются напрямую с вашего сервера в официальный Telegram API без посредников.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
