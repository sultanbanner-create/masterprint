"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Square, CheckSquare, ChevronRight } from "lucide-react";
import { formatCurrency, getDeadlineInfo, STATUS_CONFIG } from "@/lib/utils";

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
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        reloadOrders();
      }
    }, 12000);

    const onFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        reloadOrders();
      }
    };

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

  const tabCls = (on: boolean) =>
    `h-9 px-3.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${
      on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
    }`;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <header className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl" role="tablist" aria-label="Какие наряды показать">
          <button type="button" role="tab" aria-selected={viewTab === "ALL"} onClick={() => setViewTab("ALL")} className={tabCls(viewTab === "ALL")}>
            Весь цех <span className="text-slate-400 font-semibold">{activeOrders.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={viewTab === "MY"} onClick={() => setViewTab("MY")} className={tabCls(viewTab === "MY")}>
            Мои <span className="text-slate-400 font-semibold">{myOrders.length}</span>
          </button>
        </div>
        <Link href="/orders" className="text-sm font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-0.5">
          Все заказы <ChevronRight className="w-4 h-4" />
        </Link>
      </header>

      <ul className="divide-y divide-slate-100">
        {displayedOrders.map((o) => {
          const statusCfg = STATUS_CONFIG[o.status];
          const deadline = getDeadlineInfo(o.deadline, o.status === "COMPLETED");
          const isDone = o.status === "READY" || o.status === "COMPLETED" || !!o.completedBy;
          const doneBy = o.completedBy || o.assignedTo?.name;
          const hot = deadline.isUrgent && !isDone;

          return (
            <li key={o.id} className="px-4 sm:px-5 py-3.5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-bold text-slate-500">{o.orderNumber}</span>
                  {statusCfg && (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                  )}
                  {o.deadline && !isDone && (
                    <span className={hot ? "font-bold text-red-600" : "text-slate-500"}>{deadline.label}</span>
                  )}
                </div>
                <Link href={`/orders/${o.id}`} className="block mt-1 text-[15px] font-bold text-slate-900 hover:text-brand-700 truncate">
                  {o.title}
                </Link>
                <div className="text-sm text-slate-500 truncate">
                  {o.client?.name || "Без клиента"}
                  {o.client?.phone ? `, ${o.client.phone}` : ""}
                  {o.installAddress ? `, ${o.installAddress}` : ""}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3">
                <span className="text-[15px] font-extrabold text-slate-900 whitespace-nowrap">{formatCurrency(o.totalAmount)}</span>
                <button
                  type="button"
                  onClick={() => toggleCompletion(o)}
                  aria-pressed={isDone}
                  className={`h-10 px-3.5 rounded-xl text-sm font-bold transition flex items-center gap-2 active:scale-95 ${
                    isDone
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-800"
                  }`}
                  title={isDone ? "Снять отметку" : `Отметить готовым (${currentUser?.name || "мастер"})`}
                >
                  {isDone ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span className="whitespace-nowrap">{isDone ? (doneBy ? `Сделал ${doneBy}` : "Готово") : "Готово"}</span>
                </button>
              </div>
            </li>
          );
        })}

        {displayedOrders.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-slate-500">
            {viewTab === "MY"
              ? "За вами сейчас нет нарядов. Переключитесь на «Весь цех», чтобы взять задачу из общей очереди."
              : "В цехе нет нарядов в работе. Новый наряд можно создать кнопкой «Наряд»."}
          </li>
        )}
      </ul>
    </section>
  );
}
