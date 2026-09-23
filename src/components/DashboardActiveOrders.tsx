"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ClipboardList, 
  Flame, 
  CheckCircle2, 
  Square, 
  CheckSquare, 
  ChevronRight,
  Clock
} from "lucide-react";
import { formatCurrency, formatDateTime, getDeadlineInfo, STATUS_CONFIG } from "@/lib/utils";

interface DashboardActiveOrdersProps {
  initialOrders: any[];
  currentUser?: any;
}

export function DashboardActiveOrders({ initialOrders, currentUser }: DashboardActiveOrdersProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [viewTab, setViewTab] = useState<"ALL" | "MY">("ALL");

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
      console.error("Dashboard auto-sync error:", e);
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

  const isAlbert = currentUser?.role === "WORKSHOP_PRINTING" || currentUser?.name === "Альберт";
  const isAbzal = currentUser?.role === "WORKSHOP_ASSEMBLY" || currentUser?.name === "Абзал";

  // Активные заказы цеха
  const activeOrders = orders.filter((o) => o.status !== "COMPLETED");

  // Личные заказы мастера
  const myOrders = activeOrders.filter((o) => {
    if (o.assignedToId === currentUser?.id || o.assignedTo?.name === currentUser?.name) return true;
    if (isAlbert && (o.status === "PRINTING" || o.items?.some((i: any) => i.serviceType === "BANNER" || i.serviceType === "ORACAL"))) return true;
    if (isAbzal && (["ASSEMBLY", "MOUNTING"].includes(o.status) || o.items?.some((i: any) => ["LETTERS", "LIGHTBOX", "STAND", "INSTALL"].includes(i.serviceType)))) return true;
    return false;
  });

  const displayedOrders = viewTab === "MY" && myOrders.length > 0 ? myOrders : activeOrders;

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
      console.error("Dashboard toggle error:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Шапка списка с табами */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewTab === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Все наряды цеха ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("MY")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewTab === "MY"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Мои задачи</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${viewTab === "MY" ? "bg-blue-100 text-blue-700" : "bg-slate-300 text-slate-700"}`}>
                {myOrders.length}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            ⚡ Авто-обновление каждые 4 сек
          </span>
          <Link href="/orders" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5">
            <span>Реестр нарядов ({orders.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Список нарядов */}
      <div className="divide-y divide-slate-100">
        {displayedOrders.map((o) => {
          const statusCfg = STATUS_CONFIG[o.status] || {
            label: o.status,
            color: "bg-slate-100 text-slate-700",
          };
          const deadline = getDeadlineInfo(o.deadline, o.status === "COMPLETED");
          const isDone = o.status === "READY" || o.status === "COMPLETED" || !!o.completedBy;

          return (
            <div
              key={o.id}
              className="p-4 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition"
            >
              <div className="flex items-start gap-3">
                <Link
                  href={`/orders/${o.id}`}
                  className="font-mono font-bold text-sm text-teal-700 hover:underline shrink-0"
                >
                  {o.orderNumber}
                </Link>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{o.title}</div>
                  <div className="text-slate-500 mt-0.5">
                    Клиент: <b>{o.client?.name}</b> {o.client?.phone ? `(${o.client.phone})` : ""}
                  </div>
                  {o.installAddress && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Адрес: {o.installAddress}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                {deadline.isUrgent && !isDone && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded animate-pulse">
                    <Flame className="w-3 h-3 fill-red-600 text-red-600" />
                    ГОРИТ!
                  </span>
                )}

                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>

                {deadline.label && (
                  <span className={`text-[11px] font-mono font-bold ${deadline.colorClass}`}>
                    {deadline.label}
                  </span>
                )}

                <div className="text-right">
                  <span className="font-mono font-black text-slate-900 text-sm block">
                    {formatCurrency(o.totalAmount)}
                  </span>
                </div>

                {/* Галочка выполнения: кто выполнил наряд */}
                {isDone ? (
                  <button
                    type="button"
                    onClick={() => toggleCompletion(o)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                    title="Нажмите, чтобы снять отметку выполнения"
                  >
                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{o.completedBy ? `Выполнил: ${o.completedBy}` : (o.assignedTo?.name ? `Выполнил: ${o.assignedTo.name}` : "Выполнен ✅")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleCompletion(o)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-400 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs active:scale-95 group"
                    title={`Поставить галочку: Отметить наряд выполненным (${currentUser?.name || "Мастер"})`}
                  >
                    <Square className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                    <span className="group-hover:font-bold">Поставить галочку</span>
                  </button>
                )}

                <Link
                  href={`/orders/${o.id}`}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition inline-flex items-center gap-0.5 shadow-2xs"
                >
                  <span>Открыть</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}

        {displayedOrders.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            {viewTab === "MY" 
              ? "У вас нет активных задач. Переключитесь на «Все наряды цеха», чтобы посмотреть общую очередь."
              : "У цеха нет активных нарядов в работе. Все задачи выполнены!"}
          </div>
        )}
      </div>
    </div>
  );
}
