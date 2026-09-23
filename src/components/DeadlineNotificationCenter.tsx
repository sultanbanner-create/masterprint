"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Bell, 
  Flame, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  X, 
  ChevronRight, 
  Printer, 
  Hammer,
  ExternalLink,
  Volume2
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface BurningOrder {
  id: number;
  orderNumber: string;
  title: string;
  status: string;
  statusLabel: string;
  priority: string;
  deadline: string;
  diffHours: number;
  diffMinutesTotal: number;
  isOverdue: boolean;
  isUrgent: boolean;
  timeText: string;
  assignedTo: {
    id: string;
    name: string;
    roleTitle: string;
  } | null;
  client: {
    id: string;
    name: string;
    phone?: string;
    company?: string;
  } | null;
  totalAmount: number;
}

export function DeadlineNotificationCenter({ currentUser }: { currentUser?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [burningOrders, setBurningOrders] = useState<BurningOrder[]>([]);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingTg, setSendingTg] = useState(false);
  const [tgSentMessage, setTgSentMessage] = useState<string | null>(null);
  const [dismissBanner, setDismissBanner] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchDeadlines = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/deadlines");
      if (res.ok) {
        const data = await res.json();
        setBurningOrders(data.burningOrders || []);
        setCriticalCount(data.criticalCount || 0);
      }
    } catch (e) {
      console.error("Failed to load deadline notifications:", e);
    }
  }, []);

  useEffect(() => {
    fetchDeadlines();
    const interval = setInterval(fetchDeadlines, 30000); // Опрос раз в 30 секунд
    return () => clearInterval(interval);
  }, [fetchDeadlines]);

  // Быстрая отметка заказа как готовый (для Альберта, Абзала, Тимура)
  const markAsReady = async (orderId: number, orderNumber: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "READY" }),
      });

      if (res.ok) {
        // Мгновенно снимаем заказ из списка горящих тревог
        setBurningOrders((prev) => prev.filter((o) => o.id !== orderId));
        setCriticalCount((prev) => Math.max(0, prev - 1));
        await fetchDeadlines();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  // Экстренная отправка алерта в Telegram
  const triggerTelegramBroadcast = async () => {
    setSendingTg(true);
    setTgSentMessage(null);
    try {
      const res = await fetch("/api/notifications/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTgSentMessage(`✓ Отправлено ${data.sent} алертов в Telegram цеха!`);
      } else {
        setTgSentMessage(`Ошибка: ${data.error || "Не удалось отправить"}`);
      }
    } catch (e: any) {
      setTgSentMessage("Ошибка связи с сервером");
    } finally {
      setSendingTg(false);
      setTimeout(() => setTgSentMessage(null), 4000);
    }
  };

  const count = burningOrders.length;
  const mostCriticalOrder = burningOrders.find((o) => o.isOverdue || o.diffHours <= 6) || burningOrders[0];

  return (
    <>
      {/* КНОПКА КОЛОКОЛЬЧИКА В ШАПКЕ */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 rounded-xl border transition flex items-center gap-1.5 ${
            count > 0
              ? criticalCount > 0
                ? "bg-red-500 hover:bg-red-600 text-white border-red-600 shadow-sm animate-pulse"
                : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
              : "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border-slate-200"
          }`}
          title={
            count > 0
              ? `🔥 Внимание: ${count} заказов с горящим дедлайном (не готовы)!`
              : "Дедлайны под контролем (все в срок)"
          }
        >
          {count > 0 ? (
            <Flame className="w-4 h-4 fill-current animate-bounce" />
          ) : (
            <Bell className="w-4 h-4" />
          )}

          {count > 0 && (
            <span className="font-mono font-black text-xs px-1">
              {count}
            </span>
          )}
        </button>

        {/* ВСПЛЫВАЮЩИЙ ЦЕНТР ОПОВЕЩЕНИЙ */}
        {isOpen && (
          <div className="fixed sm:absolute right-2 sm:right-0 top-16 z-50 w-[95vw] sm:w-96 max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Заголовок дропдауна */}
            <div className={`p-4 text-white flex items-center justify-between ${criticalCount > 0 ? "bg-red-600" : count > 0 ? "bg-amber-600" : "bg-slate-900"}`}>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 fill-white" />
                <div>
                  <h3 className="font-black text-sm tracking-tight leading-tight">
                    Контроль дедлайнов цеха
                  </h3>
                  <p className="text-[11px] text-white/80">
                    {count > 0
                      ? `${count} заказов со сроком <24ч (НЕ ГОТОВЫ)`
                      : "Все заказы выполняются по графику"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Тело списка уведомлений */}
            <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
              {count > 0 ? (
                burningOrders.map((order) => {
                  const isAlbert = order.assignedTo?.name === "Альберт";
                  const isAbzal = order.assignedTo?.name === "Абзал";

                  return (
                    <div
                      key={order.id}
                      className={`p-3 rounded-xl border transition ${
                        order.isOverdue
                          ? "bg-red-50/70 border-red-200"
                          : order.diffHours <= 6
                          ? "bg-amber-50/80 border-amber-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {/* Верх строки: номер и оставшееся время */}
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          onClick={() => setIsOpen(false)}
                          className="font-mono font-bold text-xs text-blue-700 hover:underline flex items-center gap-1"
                        >
                          <span>#{order.orderNumber}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                            order.isOverdue
                              ? "bg-red-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {order.timeText}
                        </span>
                      </div>

                      {/* Название изделия */}
                      <div className="font-semibold text-xs text-slate-900 mt-1 line-clamp-1">
                        {order.title}
                      </div>

                      {/* Мастер и этап */}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1.5 pt-1.5 border-t border-slate-200/60">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-400">Мастер:</span>
                          <span className="font-bold text-slate-800">
                            {order.assignedTo?.name || "Не назначен"}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                          {order.statusLabel} • НЕ ГОТОВ
                        </span>
                      </div>

                      {/* КНОПКА ОТМЕТКИ В 1 КЛИК ДЛЯ АЛЬБЕРТА / МАСТЕРОВ */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => markAsReady(order.id, order.orderNumber)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                          title="Нажмите, чтобы отметить заказ как готовый и снять тревогу дедлайна"
                        >
                          {updatingId === order.id ? (
                            "Обновление..."
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {isAlbert
                                  ? "✅ Напечатан (Готов)"
                                  : isAbzal
                                  ? "✅ Собрано (Готов)"
                                  : "✅ Отметить готовым"}
                              </span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/orders/${order.id}`}
                          onClick={() => setIsOpen(false)}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 transition"
                        >
                          Наряд
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">Все дедлайны в безопасности</div>
                  <div className="text-[11px] text-slate-400">
                    Нет горящих нарядов с приближающимся сроком сдачи.
                  </div>
                </div>
              )}
            </div>

            {/* Подвал дропдауна с кнопкой отправки в Telegram */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <Link
                href="/orders"
                onClick={() => setIsOpen(false)}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Все наряды в реестре ➔
              </Link>

              {count > 0 && (
                <button
                  type="button"
                  disabled={sendingTg}
                  onClick={triggerTelegramBroadcast}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center gap-1 transition shadow-2xs"
                  title="Отправить срочные алерты о дедлайнах в Telegram-чат цеха"
                >
                  <Send className="w-3 h-3" />
                  <span>{sendingTg ? "Отправка..." : "В Telegram"}</span>
                </button>
              )}
            </div>

            {tgSentMessage && (
              <div className="p-2 bg-slate-900 text-white text-[11px] text-center font-semibold">
                {tgSentMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ВЕРХНЯЯ ЭКСТРЕННАЯ ПОЛОСА ПРИ КРИТИЧЕСКОМ ДЕДЛАЙНЕ (< 6 ЧАСОВ ИЛИ ПРОСРОЧЕН) */}
      {!dismissBanner && mostCriticalOrder && (mostCriticalOrder.isOverdue || mostCriticalOrder.diffHours <= 6) && (
        <div className="fixed top-14 left-0 right-0 z-20 bg-red-600 text-white px-4 py-2 shadow-md flex items-center justify-between text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <Flame className="w-4 h-4 fill-white animate-bounce shrink-0" />
            <span className="font-black uppercase tracking-wider bg-red-800/80 px-2 py-0.5 rounded text-[10px] shrink-0">
              Внимание! Горит дедлайн
            </span>
            <span className="truncate font-semibold">
              Наряд <b>#{mostCriticalOrder.orderNumber}</b> ({mostCriticalOrder.title}) • Мастер: <b>{mostCriticalOrder.assignedTo?.name || "Не назначен"}</b> — {mostCriticalOrder.timeText} (НЕ ГОТОВ!)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => markAsReady(mostCriticalOrder.id, mostCriticalOrder.orderNumber)}
              className="px-2.5 py-1 bg-white text-red-700 hover:bg-red-50 rounded-lg text-xs font-black shadow-xs transition"
            >
              {mostCriticalOrder.assignedTo?.name === "Альберт" ? "✅ Напечатан (Готов)" : "✅ Отметить готовым"}
            </button>
            <Link
              href={`/orders/${mostCriticalOrder.id}`}
              className="hidden sm:inline-block px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition"
            >
              Открыть
            </Link>
            <button
              type="button"
              onClick={() => setDismissBanner(true)}
              className="p-1 hover:bg-red-700 rounded-md transition text-white/80 hover:text-white"
              title="Скрыть предупреждение"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
