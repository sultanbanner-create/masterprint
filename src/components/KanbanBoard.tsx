"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Flame, 
  Clock, 
  MapPin, 
  User, 
  ChevronRight, 
  ArrowRight,
  Printer,
  Award,
  CheckCircle2,
  Square,
  CheckSquare
} from "lucide-react";
import { formatCurrency, formatDateTime, getDeadlineInfo, STAGES } from "@/lib/utils";

export function KanbanBoard({ 
  initialOrders, 
  employees, 
  currentUser 
}: { 
  initialOrders: any[]; 
  employees: any[]; 
  currentUser?: any; 
}) {
  const [orders, setOrders] = useState<any[]>(initialOrders);

  const isDirector = currentUser?.role === "DIRECTOR";
  const isWorkshop = currentUser?.role === "WORKSHOP_ASSEMBLY" || currentUser?.role === "WORKSHOP_PRINTING";

  // По умолчанию для всех открываем полный конвейер цеха
  const [filterEmployee, setFilterEmployee] = useState<string>("ALL");

  // Фоновая синхронизация канбана с базой данных
  const reloadOrders = async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
        }
      }
    } catch (e) {
      console.error("Kanban auto-sync error:", e);
    }
  };

  useEffect(() => {
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

  // Галочка выполнения на Канбане
  const toggleCompletion = async (order: any) => {
    const isCurrentlyDone = order.status === "READY" || order.status === "COMPLETED" || !!order.completedBy;
    const willBeDone = !isCurrentlyDone;
    const performerName = currentUser?.name || "Мастер цеха";

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === order.id) {
          const hasPrint = o.items?.some((i: any) => i.serviceType === "BANNER" || i.serviceType === "ORACAL");
          return {
            ...o,
            status: willBeDone ? "READY" : (hasPrint ? "PRINTING" : "ASSEMBLY"),
            completedBy: willBeDone ? performerName : null,
            completedAt: willBeDone ? new Date().toISOString() : null,
          };
        }
        return o;
      })
    );

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCompletedToggle: willBeDone,
          completedBy: performerName,
          cancelledBy: performerName,
          assignedToId: order.assignedToId || currentUser?.id,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      }
    } catch (err) {
      console.error("Kanban completion toggle error:", err);
    }
  };

  // Персональные показатели выработки
  const myOrders = orders.filter(
    (o) => (currentUser?.id && o.assignedToId === currentUser.id) ||
           (currentUser?.name && o.assignedTo?.name === currentUser.name)
  );
  const myCompletedOrders = myOrders.filter(
    (o) => o.status === "COMPLETED" || o.status === "READY"
  );
  const myCompletedSum = myCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const myActiveOrders = myOrders.filter((o) => o.status !== "COMPLETED");

  const updateOrderStatus = async (orderId: number, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getNextStage = (current: string) => {
    const keys = STAGES.map((s) => s.key);
    const idx = keys.indexOf(current);
    if (idx >= 0 && idx < keys.length - 1) {
      return keys[idx + 1];
    }
    return null;
  };

  const filteredOrders = orders.filter((o) => {
    if (filterEmployee !== "ALL") {
      const isAssigned = o.assignedToId === filterEmployee;
      const emp = employees.find((e) => e.id === filterEmployee);
      const isAlbertFilter = emp?.name === "Альберт";
      const isAbzalFilter = emp?.name === "Абзал";
      const isBannerJob = isAlbertFilter && (o.status === "PRINTING" || o.items?.some((i: any) => i.serviceType === "BANNER" || i.serviceType === "ORACAL"));
      const isAssemblyJob = isAbzalFilter && (["ASSEMBLY", "MOUNTING"].includes(o.status) || o.items?.some((i: any) => ["LETTERS", "LIGHTBOX", "STAND", "INSTALL"].includes(i.serviceType)));

      if (!isAssigned && !isBannerJob && !isAssemblyJob) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Личный блок мастера: только его заказы и сумма выполненной работы */}
      {!isDirector && currentUser && (
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Выработка: {currentUser.name} ({currentUser.roleTitle || "Мастер цеха"})
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-black font-mono text-emerald-700">
                  {formatCurrency(myCompletedSum)}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  (сдано: <b>{myCompletedOrders.length}</b> нарядов • в работе у меня: <b>{myActiveOrders.length}</b>)
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const match = employees.find((e) => e.id === currentUser.id || e.name === currentUser.name);
              setFilterEmployee((prev) => (prev === match?.id ? "ALL" : (match?.id || "ALL")));
            }}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs shrink-0"
          >
            {filterEmployee === currentUser?.id || filterEmployee === employees.find((e) => e.name === currentUser?.name)?.id
              ? "Показать все участки цеха"
              : "Показать только мой участок"}
          </button>
        </div>
      )}

      {/* Фильтр по сотруднику на Канбане */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase mr-1 flex items-center gap-1 shrink-0">
            <User className="w-3.5 h-3.5" /> Вид цеха:
          </span>
          <button
            type="button"
            onClick={() => setFilterEmployee("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              filterEmployee === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Все участки
          </button>
          {employees.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => setFilterEmployee(emp.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                filterEmployee === emp.id
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{emp.name}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({emp.roleTitle.split("&")[0].trim()})
              </span>
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-slate-500 shrink-0">
          Нарядов на доске: <b>{filteredOrders.length}</b>
        </span>
      </div>

      {/* Колонки стадий конвейера */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageOrders = filteredOrders.filter((o) => o.status === stage.key);
          const nextStageKey = getNextStage(stage.key);

          return (
            <div
              key={stage.key}
              className={`bg-slate-100/70 rounded-2xl p-3 border-t-4 ${stage.color} border border-slate-200 flex flex-col min-h-[520px] shadow-2xs`}
            >
              {/* Шапка колонки */}
              <div className="pb-2.5 mb-2.5 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-tight">
                    {stage.title}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-white text-slate-800 font-bold text-[11px] font-mono flex items-center justify-center border border-slate-200">
                    {stageOrders.length}
                  </span>
                </div>
                {stage.role && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Ответственный: <b>{stage.role}</b>
                  </span>
                )}
              </div>

              {/* Карточки */}
              <div className="space-y-2.5 flex-1">
                {stageOrders.map((order) => {
                  const deadlineInfo = getDeadlineInfo(order.deadline, order.status === "COMPLETED");

                  return (
                    <div
                      key={order.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition space-y-2.5 group"
                    >
                      {/* Верх: номер и срочность / дедлайн */}
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-mono font-bold text-xs text-teal-700 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        {order.status !== "READY" && order.status !== "COMPLETED" && deadlineInfo.isUrgent ? (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 flex items-center gap-0.5 animate-pulse">
                            <Flame className="w-3 h-3 fill-red-600 text-red-600" /> Горит!
                          </span>
                        ) : order.priority === "URGENT" ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 flex items-center gap-0.5">
                            <Flame className="w-3 h-3 fill-red-600 text-red-600" /> Срочно
                          </span>
                        ) : null}
                      </div>

                      {/* Клиент */}
                      <div>
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {order.client?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {order.client?.company || order.client?.phone || "—"}
                        </div>
                      </div>

                      {/* Заголовок заказа */}
                      <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                        {order.title}
                      </div>

                      {/* Дедлайн и таймер */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Срок: {formatDateTime(order.deadline)}</span>
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${deadlineInfo.badgeClass}`}>
                          {deadlineInfo.label}
                        </span>
                      </div>

                      {/* Мастер */}
                      {order.assignedTo && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {order.assignedTo.name[0]}
                          </span>
                          <span className="font-semibold">{order.assignedTo.name}</span>
                        </div>
                      )}

                      {/* Низ: цена и кнопки действий */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div>
                          <div className="font-mono font-bold text-xs text-slate-900">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          {isWorkshop ? (
                            <div className="text-[10px] text-slate-400 font-medium">Наряд цеха</div>
                          ) : order.debtAmount > 0 ? (
                            <div className="text-[10px] font-mono text-red-600 font-semibold">
                              Долг: {formatCurrency(order.debtAmount)}
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-600 font-medium">Оплачен</div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {order.status === "READY" || order.status === "COMPLETED" || order.completedBy ? (
                            <button
                              type="button"
                              onClick={() => toggleCompletion(order)}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5 shadow-2xs active:scale-95"
                              title={`Выполнено! Нажмите для отмены отметки. Выполнил: ${order.completedBy || order.assignedTo?.name || "Мастер"}`}
                            >
                              <CheckSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[70px]">{order.completedBy || "Готов"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleCompletion(order)}
                              className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-400 rounded-lg text-[10px] font-semibold transition flex items-center gap-0.5 shadow-2xs active:scale-95 group"
                              title={`Поставить галочку: Отметить наряд выполненным (${currentUser?.name || "Мастер"})`}
                            >
                              <Square className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                              <span>Галочка</span>
                            </button>
                          )}

                          {nextStageKey && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, nextStageKey)}
                              className="px-2 py-1 bg-slate-100 hover:bg-teal-600 hover:text-white rounded-lg text-[10px] font-bold text-slate-700 transition flex items-center gap-0.5 shadow-2xs"
                              title="Перевести на следующий этап"
                            >
                              <span>Вперёд</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {stageOrders.length === 0 && (
                  <div className="h-28 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    Пусто
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
