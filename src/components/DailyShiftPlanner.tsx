"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  SunMedium, 
  Printer, 
  Hammer, 
  Sparkles, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ExternalLink,
  MapPin,
  Flame,
  FileText
} from "lucide-react";
import { formatCurrency, getDeadlineInfo } from "@/lib/utils";

interface OrderItem {
  id: string;
  title: string;
  serviceType: string;
  area?: number | null;
  letterCount?: number | null;
  letterHeight?: number | null;
  letterText?: string | null;
  options?: string | null;
  totalPrice: number;
}

interface Order {
  id: string | number;
  orderNumber: string;
  title: string;
  status: string;
  priority: string;
  deadline?: string | Date | null;
  installAddress?: string | null;
  totalAmount: number;
  debtAmount: number;
  client?: {
    id: string;
    name: string;
    phone?: string | null;
    company?: string | null;
  } | null;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  items: OrderItem[];
  [key: string]: any;
}

interface DailyShiftPlannerProps {
  orders: Order[];
  employees?: any[];
}

export function DailyShiftPlanner({ orders }: DailyShiftPlannerProps) {
  const [liveOrders, setLiveOrders] = useState<Order[]>(orders);
  const [selectedWorker, setSelectedWorker] = useState<"ALL" | "ALBERT" | "ABZAL" | "JALGAS" | "TIMUR">("ALL");

  useEffect(() => {
    const reloadOrders = async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setLiveOrders(data);
          }
        }
      } catch (e) {
        console.error("Shift planner auto-sync error:", e);
      }
    };

    reloadOrders();
    const timer = setInterval(reloadOrders, 4000);
    const onFocus = () => reloadOrders();
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // Фильтрация активных заказов
  const activeOrders = liveOrders.filter((o) => o.status !== "COMPLETED");

  // Альберт: заказы в статусе PRINTING или заказы с баннером/пленкой
  const albertOrders = activeOrders.filter(
    (o) =>
      o.assignedTo?.name === "Альберт" ||
      o.status === "PRINTING" ||
      o.items.some((i) => i.serviceType === "BANNER" || i.serviceType === "ORACAL")
  );

  // Абзал: заказы в статусе ASSEMBLY, MOUNTING или с буквами, лайтбоксами, монтажом
  const abzalOrders = activeOrders.filter(
    (o) =>
      o.assignedTo?.name === "Абзал" ||
      o.status === "ASSEMBLY" ||
      o.status === "MOUNTING" ||
      o.items.some((i) => ["LETTERS", "LIGHTBOX", "INSTALL", "AUTO_BRANDING"].includes(i.serviceType))
  );

  // Жалгас: заказы в статусе NEW, DESIGN или назначенные на Жалгаса
  const jalgasOrders = activeOrders.filter(
    (o) =>
      o.assignedTo?.name === "Жалгас" ||
      o.status === "NEW" ||
      o.status === "DESIGN"
  );

  // Тимур: Горящие дедлайны (срочно/сегодня) и долги
  const timurOrders = activeOrders.filter((o) => {
    if (o.priority === "URGENT") return true;
    if (o.debtAmount > 0) return true;
    if (!o.deadline) return false;
    const diff = (new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    return diff <= 48;
  });

  // Расчет суммарного метража печати для Альберта
  const totalPrintM2 = albertOrders.reduce((sum, order) => {
    return (
      sum +
      order.items
        .filter((i) => i.serviceType === "BANNER" || i.serviceType === "ORACAL")
        .reduce((s, i) => s + (i.area || 0), 0)
    );
  }, 0);

  // Расчет количества световых букв для Абзала
  const totalLettersCount = abzalOrders.reduce((sum, order) => {
    return (
      sum +
      order.items
        .filter((i) => i.serviceType === "LETTERS")
        .reduce((s, i) => s + (i.letterCount || 0), 0)
    );
  }, 0);

  const displayedOrders = 
    selectedWorker === "ALBERT" ? albertOrders :
    selectedWorker === "ABZAL" ? abzalOrders :
    selectedWorker === "JALGAS" ? jalgasOrders :
    selectedWorker === "TIMUR" ? timurOrders : activeOrders;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Шапка утренней планерки */}
      <div className="p-6 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
              <SunMedium className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Утренняя разнарядка & Задачи смены
              </h2>
              <p className="text-xs text-teal-200 mt-0.5">
                Ежедневный план для каждого мастера цеха на сегодня
              </p>
            </div>
          </div>
        </div>

        {/* Быстрые сводки дня */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3.5 py-2 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs">
            <span className="text-teal-200 block text-[10px] uppercase font-bold">Очередь печати:</span>
            <span className="text-sm font-black font-mono text-amber-300">
              {totalPrintM2.toFixed(1)} м²
            </span>
          </div>
          <div className="px-3.5 py-2 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs">
            <span className="text-teal-200 block text-[10px] uppercase font-bold">Букв на сборку:</span>
            <span className="text-sm font-black font-mono text-cyan-300">
              {totalLettersCount} шт
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition"
            title="Распечатать лист смены"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Вкладки мастеров */}
      <div className="flex items-center gap-1.5 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs">
        <button
          onClick={() => setSelectedWorker("ALL")}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 ${
            selectedWorker === "ALL"
              ? "bg-white text-teal-700 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Все задачи ({activeOrders.length})</span>
        </button>

        <button
          onClick={() => setSelectedWorker("ALBERT")}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 ${
            selectedWorker === "ALBERT"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:text-purple-700 hover:bg-purple-50"
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Альберт • Печать ({albertOrders.length})</span>
          {totalPrintM2 > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${selectedWorker === "ALBERT" ? "bg-purple-700 text-purple-200" : "bg-purple-100 text-purple-800"}`}>
              {totalPrintM2.toFixed(1)} м²
            </span>
          )}
        </button>

        <button
          onClick={() => setSelectedWorker("ABZAL")}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 ${
            selectedWorker === "ABZAL"
              ? "bg-orange-600 text-white shadow-xs"
              : "text-slate-600 hover:text-orange-700 hover:bg-orange-50"
          }`}
        >
          <Hammer className="w-4 h-4" />
          <span>Абзал • Сборка & Монтаж ({abzalOrders.length})</span>
          {totalLettersCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${selectedWorker === "ABZAL" ? "bg-orange-700 text-orange-200" : "bg-orange-100 text-orange-800"}`}>
              {totalLettersCount} букв
            </span>
          )}
        </button>

        <button
          onClick={() => setSelectedWorker("JALGAS")}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 ${
            selectedWorker === "JALGAS"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-blue-700 hover:bg-blue-50"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Жалгас • Дизайн & КП ({jalgasOrders.length})</span>
        </button>

        <button
          onClick={() => setSelectedWorker("TIMUR")}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 ${
            selectedWorker === "TIMUR"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Тимур • Дедлайны & Контроль ({timurOrders.length})</span>
        </button>
      </div>

      {/* Список задач */}
      <div className="p-4 space-y-3">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
            Все наряды в этой категории выполнены! Нет незавершенных задач.
          </div>
        ) : (
          displayedOrders.map((order) => {
            const deadline = getDeadlineInfo(order.deadline);
            const isUrgent = order.priority === "URGENT" || deadline.isOverdue || deadline.isUrgent;

            return (
              <div
                key={order.id}
                className={`p-4 rounded-xl border transition hover:shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isUrgent
                    ? "bg-red-50/30 border-red-200"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {order.orderNumber}
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      {order.title}
                    </span>
                    {order.priority === "URGENT" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-red-500" /> СРОЧНО
                      </span>
                    )}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${deadline.badgeClass}`}>
                      {deadline.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      Клиент: {order.client?.name || "Частное лицо"}
                    </span>
                    {order.installAddress && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        {order.installAddress}
                      </span>
                    )}
                    {order.assignedTo && (
                      <span className="text-slate-500">
                        Ответственный: <b className="text-slate-700">{order.assignedTo.name}</b>
                      </span>
                    )}
                  </div>

                  {/* Спецификация для мастеров */}
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                      >
                        <b>{item.title}</b>:
                        {item.area ? ` ${item.area} м²` : ""}
                        {item.letterCount ? ` ${item.letterCount} букв × ${item.letterHeight}см` : ""}
                        {item.letterText ? ` («${item.letterText}»)` : ""}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                  <div className="text-right text-xs">
                    <div className="font-mono font-bold text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    {order.debtAmount > 0 ? (
                      <div className="text-[11px] text-red-600 font-bold">
                        Долг: {formatCurrency(order.debtAmount)}
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-600 font-bold">
                        Оплачен 100%
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition border border-slate-200 flex items-center gap-1 text-xs font-bold"
                  >
                    <span>Открыть наряд</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
