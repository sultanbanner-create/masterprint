"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Flame, 
  MapPin, 
  Truck, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  ArrowRight,
  Printer,
  Hammer
} from "lucide-react";
import { formatCurrency, STATUS_CONFIG } from "@/lib/utils";

interface Order {
  id: number;
  orderNumber: string;
  title: string;
  status: string;
  priority: string;
  deadline?: string | null;
  installAddress?: string | null;
  totalAmount: number;
  debtAmount: number;
  client?: {
    name: string;
    phone?: string | null;
    company?: string | null;
  } | null;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
}

export default function ProductionCalendarPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMaster, setSelectedMaster] = useState<string>("ALL");
  const [onlyInstallations, setOnlyInstallations] = useState(false);
  const [selectedDayOrders, setSelectedDayOrders] = useState<Order[] | null>(null);
  const [selectedDayTitle, setSelectedDayTitle] = useState("");

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Фильтрация заказов по выбранным критериям
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order.deadline) return false;
      if (selectedMaster !== "ALL" && order.assignedTo?.name !== selectedMaster) return false;
      if (onlyInstallations && !order.installAddress) return false;
      return true;
    });
  }, [orders, selectedMaster, onlyInstallations]);

  // Группировка заказов по дням (формат YYYY-MM-DD)
  const ordersByDate = useMemo(() => {
    const map: Record<string, Order[]> = {};
    filteredOrders.forEach((order) => {
      if (!order.deadline) return;
      const dateKey = order.deadline.split("T")[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(order);
    });
    return map;
  }, [filteredOrders]);

  // Вычисление сетки календаря (с учетом сдвига дней недели)
  const calendarGrid = useMemo(() => {
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Понедельник = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Дни предыдущего месяца
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dayNumber: d, isCurrentMonth: false, dateStr });
    }

    // Дни текущего месяца
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dayNumber: d, isCurrentMonth: true, dateStr });
    }

    // Дополняем до полных 35 или 42 ячеек
    const remaining = 42 - days.length;
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const m = month === 11 ? 0 : month + 1;
        const y = month === 11 ? year + 1 : year;
        const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        days.push({ dayNumber: d, isCurrentMonth: false, dateStr });
      }
    }

    return days;
  }, [year, month]);

  const todayStr = new Date().toISOString().split("T")[0];

  const handleDayClick = (dateStr: string, dayOrders: Order[]) => {
    setSelectedDayOrders(dayOrders);
    const dateObj = new Date(dateStr);
    setSelectedDayTitle(
      dateObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Шапка календаря */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-teal-600 to-emerald-500 rounded-xl text-white shadow-md shadow-teal-500/20">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Календарь производства & График монтажей
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Планирование выездов бригады на Chevrolet Labo и дедлайнов сдачи вывесок
              </p>
            </div>
          </div>
        </div>

        {/* Навигация по месяцам */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-slate-900 font-bold min-w-[130px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition"
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Сегодня
          </button>
        </div>
      </div>

      {/* Быстрые фильтры календаря */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Мастер:
          </span>
          {(["ALL", "Абзал", "Альберт", "Жалгас"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMaster(m)}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                selectedMaster === m
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {m === "ALL" ? "Все мастера" : m}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            onClick={() => setOnlyInstallations(!onlyInstallations)}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
              onlyInstallations
                ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Только выездные монтажи (Labo)</span>
          </button>
        </div>

        <div className="text-slate-500 text-[11px]">
          Запланировано дедлайнов в этом месяце: <b className="text-slate-900">{filteredOrders.length}</b>
        </div>
      </div>

      {/* Сетка календаря */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Дни недели */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 uppercase py-2.5">
          {daysOfWeek.map((day, idx) => (
            <div key={day} className={idx >= 5 ? "text-red-500" : ""}>
              {day}
            </div>
          ))}
        </div>

        {/* Ячейки дней */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarGrid.map((item, index) => {
            const isToday = item.dateStr === todayStr;
            const dayOrders = ordersByDate[item.dateStr] || [];
            const hasUrgent = dayOrders.some((o) => o.priority === "URGENT");
            const hasInstall = dayOrders.some((o) => !!o.installAddress);

            return (
              <div
                key={index}
                onClick={() => handleDayClick(item.dateStr, dayOrders)}
                className={`min-h-[110px] p-2 flex flex-col justify-between cursor-pointer transition hover:bg-slate-50/80 ${
                  !item.isCurrentMonth ? "bg-slate-50/40 text-slate-300" : "bg-white"
                } ${isToday ? "ring-2 ring-inset ring-teal-500 bg-teal-50/10" : ""}`}
              >
                {/* Номер дня */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isToday
                        ? "bg-teal-600 text-white"
                        : !item.isCurrentMonth
                        ? "text-slate-400"
                        : "text-slate-800"
                    }`}
                  >
                    {item.dayNumber}
                  </span>

                  <div className="flex items-center gap-1">
                    {hasUrgent && (
                      <span className="p-0.5 rounded bg-red-100 text-red-600" title="Срочный наряд!">
                        <Flame className="w-3 h-3" />
                      </span>
                    )}
                    {hasInstall && (
                      <span className="p-0.5 rounded bg-amber-100 text-amber-700" title="Выездной монтаж на объекте">
                        <Truck className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Список плашек заказов в ячейке */}
                <div className="space-y-1 my-1 overflow-hidden">
                  {dayOrders.slice(0, 2).map((order) => {
                    const cfg = STATUS_CONFIG[order.status] || { bg: "bg-slate-100", color: "text-slate-800" };
                    return (
                      <div
                        key={order.id}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border ${
                          order.priority === "URGENT"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : `${cfg.bg} ${cfg.color} border-slate-200`
                        }`}
                        title={`${order.orderNumber} - ${order.title} (${order.client?.name || ""})`}
                      >
                        <span className="font-mono font-bold mr-1">{order.orderNumber}</span>
                        <span>{order.title}</span>
                      </div>
                    );
                  })}
                  {dayOrders.length > 2 && (
                    <div className="text-[10px] font-bold text-teal-700 text-right pr-1">
                      + ещё {dayOrders.length - 2}
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-slate-400">
                  {dayOrders.length > 0 && `${dayOrders.length} наряда`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Модальное окно деталей выбранного дня */}
      {selectedDayOrders && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    График нарядов: {selectedDayTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Запланировано к исполнению / монтажу ({selectedDayOrders.length} наряда)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayOrders(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {selectedDayOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  На эту дату нет запланированных нарядов цеха.
                </div>
              ) : (
                selectedDayOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || { label: order.status, bg: "bg-slate-100", color: "text-slate-700" };
                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-teal-400 transition bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                            {order.orderNumber}
                          </span>
                          <span className="font-bold text-sm text-slate-900">
                            {order.title}
                          </span>
                          {order.priority === "URGENT" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-red-500" /> Срочно
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                          <span>Клиент: <b>{order.client?.name}</b></span>
                          {order.assignedTo && (
                            <span>Мастер: <b>{order.assignedTo.name}</b></span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {order.installAddress && (
                          <div className="text-xs text-slate-700 flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-200">
                            <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Адрес монтажа: <b>{order.installAddress}</b></span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right text-xs">
                          <div className="font-mono font-bold text-slate-900">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          {order.debtAmount > 0 && (
                            <div className="text-red-600 font-bold text-[11px]">
                              Долг: {formatCurrency(order.debtAmount)}
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/orders/${order.id}`}
                          className="p-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition text-xs font-bold flex items-center gap-1"
                        >
                          <span>Открыть</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
