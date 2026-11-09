"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Clock, 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Search, 
  ChevronRight, 
  Filter,
  Calendar,
  ArrowRight,
  Printer,
  Download,
  Award,
  Square,
  CheckSquare
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, getDeadlineInfo, STATUS_CONFIG } from "@/lib/utils";


const STATUS_OPTIONS = [
  { value: "NEW", label: "Новый" },
  { value: "DESIGN", label: "Макет (Жалгас)" },
  { value: "PRINTING", label: "Печать (Альберт)" },
  { value: "ASSEMBLY", label: "Сборка (Абзал)" },
  { value: "MOUNTING", label: "Монтаж (Абзал)" },
  { value: "READY", label: "Готов к сдаче" },
  { value: "COMPLETED", label: "Сдан и оплачен" },
];

interface OrderListProps {
  initialOrders: any[];
  employees: any[];
  currentUser?: any;
}

export function OrderList({ initialOrders, employees, currentUser }: OrderListProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  
  const isDirector = currentUser?.role === "DIRECTOR";
  const isWorkshop = currentUser?.role === "WORKSHOP_ASSEMBLY" || currentUser?.role === "WORKSHOP_PRINTING";

  // Все наряды видны ВСЕМ сотрудникам в реестре по умолчанию
  const [filterEmployee, setFilterEmployee] = useState<string>("ALL");

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [filterProductType, setFilterProductType] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Фоновое автоматическое обновление списка нарядов в реальном времени
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
      console.error("Auto-sync error:", e);
    }
  };

  useEffect(() => {
    // Фоновый опрос каждые 12 сек только если вкладка активна
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        reloadOrders();
      }
    }, 12000);

    // Мгновенное обновление при возврате на вкладку или разблокировке смартфона
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

  const updateStatus = async (orderId: number, nextStatus: string) => {
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

  // Галочка выполнения: кто выполнил наряд ставит галочку
  const toggleCompletion = async (order: any) => {
    const isCurrentlyDone = order.status === "READY" || order.status === "COMPLETED" || !!order.completedBy;
    const willBeDone = !isCurrentlyDone;
    const performerName = currentUser?.name || "Мастер цеха";

    // Оптимистичное обновление интерфейса
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
      console.error("Completion toggle error:", err);
    }
  };

  // Личные показатели выработки авторизованного сотрудника
  const myOrders = orders.filter(
    (o) => (currentUser?.id && o.assignedToId === currentUser.id) ||
           (currentUser?.name && o.assignedTo?.name === currentUser.name)
  );
  const myCompletedOrders = myOrders.filter(
    (o) => o.status === "COMPLETED" || o.status === "READY"
  );
  const myCompletedSum = myCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const myActiveOrders = myOrders.filter((o) => o.status !== "COMPLETED");
  const myUrgentOrders = myActiveOrders.filter((o) => {
    if (o.priority === "URGENT") return true;
    if (!o.deadline) return false;
    const diffHours = (new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours <= 24;
  });

  const urgentCount = orders.filter((o) => o.priority === "URGENT").length;
  const debtCount = orders.filter((o) => o.debtAmount > 0).length;

  const filteredOrders = orders.filter((order) => {
    if (filterEmployee !== "ALL") {
      const isAssigned = order.assignedToId === filterEmployee;
      const emp = employees.find((e) => e.id === filterEmployee);
      const isAlbertFilter = emp?.name === "Альберт";
      const isAbzalFilter = emp?.name === "Абзал";
      const isBannerJob = isAlbertFilter && (order.status === "PRINTING" || order.items?.some((i: any) => i.serviceType === "BANNER" || i.serviceType === "ORACAL"));
      const isAssemblyJob = isAbzalFilter && (["ASSEMBLY", "MOUNTING"].includes(order.status) || order.items?.some((i: any) => ["LETTERS", "LIGHTBOX", "STAND", "INSTALL"].includes(i.serviceType)));

      if (!isAssigned && !isBannerJob && !isAssemblyJob) return false;
    }
    if (filterStatus !== "ALL" && order.status !== filterStatus) return false;
    if (filterUrgentOnly && order.priority !== "URGENT") return false;
    if (filterDebtOnly && order.debtAmount <= 0) return false;
    if (filterProductType !== "ALL") {
      const hasType = order.items?.some((i: any) => i.serviceType === filterProductType);
      if (!hasType) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const mNum = order.orderNumber.toLowerCase().includes(q);
      const mClient = order.client?.name.toLowerCase().includes(q);
      const mComp = order.client?.company?.toLowerCase().includes(q);
      const mTitle = order.title.toLowerCase().includes(q);
      return mNum || mClient || mComp || mTitle;
    }
    return true;
  });

  const exportToExcel = () => {
    const headers = isWorkshop
      ? [
          "Наряд",
          "Название изделия",
          "Клиент",
          "Телефон",
          "Мастер",
          "Статус",
          "Срок исполнения (Дедлайн)",
          "Сумма заказа (UZS)",
          "Адрес монтажа",
        ]
      : [
          "Наряд",
          "Название изделия",
          "Клиент",
          "Компания",
          "Телефон",
          "Мастер",
          "Статус",
          "Срок исполнения (Дедлайн)",
          "Сумма заказа (UZS)",
          "Оплачено (UZS)",
          "Остаток долга (UZS)",
          "Адрес монтажа",
        ];

    const rows = filteredOrders.map((o) =>
      isWorkshop
        ? [
            o.orderNumber,
            `"${(o.title || "").replace(/"/g, '""')}"`,
            `"${(o.client?.name || "").replace(/"/g, '""')}"`,
            `"${o.client?.phone || ""}"`,
            `"${o.assignedTo?.name || "Не назначен"}"`,
            `"${STATUS_CONFIG[o.status]?.label || o.status}"`,
            `"${o.deadline ? new Date(o.deadline).toLocaleString("ru-RU") : "Без срока"}"`,
            o.totalAmount,
            `"${(o.installAddress || "").replace(/"/g, '""')}"`,
          ]
        : [
            o.orderNumber,
            `"${(o.title || "").replace(/"/g, '""')}"`,
            `"${(o.client?.name || "").replace(/"/g, '""')}"`,
            `"${(o.client?.company || "").replace(/"/g, '""')}"`,
            `"${o.client?.phone || ""}"`,
            `"${o.assignedTo?.name || "Не назначен"}"`,
            `"${STATUS_CONFIG[o.status]?.label || o.status}"`,
            `"${o.deadline ? new Date(o.deadline).toLocaleString("ru-RU") : "Без срока"}"`,
            o.totalAmount,
            o.paidAmount,
            o.debtAmount,
            `"${(o.installAddress || "").replace(/"/g, '""')}"`,
          ]
    );

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `orders_masterprint_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      {/* Личный блок мастера: только его заказы и сумма выполненной работы */}
      {!isDirector && currentUser && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-emerald-800">
                  Выработка: {currentUser.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {currentUser.roleTitle || "Мастер цеха"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-emerald-700">
                  {formatCurrency(myCompletedSum)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  (сдано / готово: <b>{myCompletedOrders.length}</b> нарядов)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
              В работе: <b className="text-slate-900">{myActiveOrders.length}</b> нарядов
            </div>
            {myUrgentOrders.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-red-600" />
                <span>Срочные: {myUrgentOrders.length}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const match = employees.find((e) => e.id === currentUser.id || e.name === currentUser.name);
                setFilterEmployee((prev) => (prev === match?.id ? "ALL" : (match?.id || "ALL")));
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
            >
              {filterEmployee === currentUser?.id || filterEmployee === employees.find((e) => e.name === currentUser?.name)?.id
                ? "Показать все наряды цеха"
                : "Только мои наряды"}
            </button>
          </div>
        </div>
      )}

      {/* Верхний блок фильтрации: по сотруднику и строке поиска */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Фильтр по мастерам */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <User className="w-3.5 h-3.5" /> Мастер:
          </span>
          <button
            type="button"
            onClick={() => setFilterEmployee("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              filterEmployee === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Все ({orders.length})
          </button>
          {employees.map((emp) => {
            const count = orders.filter((o) => o.assignedToId === emp.id).length;
            const isSelected = filterEmployee === emp.id;

            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => setFilterEmployee(emp.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{emp.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Поиск и фильтр по статусу */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по наряду, клиенту, вывеске..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Все статусы</option>
            <option value="NEW">Новые</option>
            <option value="DESIGN">Макет / Дизайн</option>
            <option value="PRINTING">Печать</option>
            <option value="ASSEMBLY">Сборка</option>
            <option value="MOUNTING">Монтаж</option>
            <option value="READY">Готовы к выдаче</option>
            <option value="COMPLETED">Сданы</option>
          </select>

          <button
            type="button"
            onClick={exportToExcel}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition flex items-center gap-1.5 shrink-0"
            title="Скачать реестр нарядов в формате Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Экспорт Excel</span>
          </button>
        </div>
      </div>

      {/* Быстрые фильтры: Срочность, Долги, Вид изделия */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
              filterUrgentOnly
                ? "bg-red-500 text-white border-red-600"
                : "bg-white text-slate-700 border-slate-200 hover:border-red-300 hover:text-red-700"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${filterUrgentOnly ? "text-white" : "text-red-500"}`} />
            <span>Срочные</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterUrgentOnly ? "bg-red-700 text-white" : "bg-red-100 text-red-700"}`}>
              {urgentCount}
            </span>
          </button>

          {!isWorkshop && (
            <button
              type="button"
              onClick={() => setFilterDebtOnly(!filterDebtOnly)}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
                filterDebtOnly
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:text-amber-800"
              }`}
            >
              <span>С долгом</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterDebtOnly ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800"}`}>
                {debtCount}
              </span>
            </button>
          )}

          <select
            value={filterProductType}
            onChange={(e) => setFilterProductType(e.target.value)}
            className="px-3 py-1.5 font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Все виды изделий</option>
            <option value="STAND">Стенды и таблички</option>
            <option value="BANNER">Баннеры</option>
            <option value="LETTERS">Световые буквы</option>
            <option value="LIGHTBOX">Лайтбоксы</option>
            <option value="ORACAL">Плёнка Oracal</option>
            <option value="AUTO_BRANDING">Брендирование авто</option>
            <option value="INSTALL">Только монтаж</option>
          </select>
        </div>

        <div className="text-slate-500 text-[11px] font-medium">
          Показано: <b className="text-slate-900">{filteredOrders.length}</b> из {orders.length} нарядов
        </div>
      </div>

      {/* Список нарядов: карточки на телефоне, таблица на компьютере */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <ul className="md:hidden divide-y divide-slate-100">
          {filteredOrders.map((order) => {
            const deadlineInfo = getDeadlineInfo(order.deadline, order.status === "COMPLETED");
            const statusCfg = STATUS_CONFIG[order.status];
            const done = order.status === "READY" || order.status === "COMPLETED" || !!order.completedBy;
            const doneBy = order.completedBy || order.assignedTo?.name;
            return (
              <li key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-bold text-slate-500">{order.orderNumber}</span>
                      {order.priority === "URGENT" && <span className="font-bold text-red-600">Срочный</span>}
                      {order.deadline && order.status !== "COMPLETED" && (
                        <span className={deadlineInfo.isUrgent && !done ? "font-bold text-red-600" : "text-slate-500"}>
                          {deadlineInfo.label}
                        </span>
                      )}
                    </div>
                    <Link href={`/orders/${order.id}`} className="block mt-1 text-[15px] font-bold text-slate-900 truncate">
                      {order.title}
                    </Link>
                    <div className="text-sm text-slate-500 truncate">
                      {order.client?.name || "Без клиента"}
                      {order.assignedTo ? `, мастер ${order.assignedTo.name}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[15px] font-extrabold text-slate-900 whitespace-nowrap">{formatCurrency(order.totalAmount)}</div>
                    {!isWorkshop &&
                      (order.debtAmount > 0 ? (
                        <div className="text-xs font-bold text-red-600 whitespace-nowrap">долг {formatCurrency(order.debtAmount)}</div>
                      ) : (
                        <div className="text-xs text-emerald-700">оплачен</div>
                      ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    aria-label={`Этап наряда ${order.orderNumber}`}
                    className={`h-10 flex-1 min-w-0 px-3 rounded-xl border font-semibold ${statusCfg?.bg || "bg-slate-50"} ${statusCfg?.color || "text-slate-700"} ${statusCfg?.border || "border-slate-300"} focus:outline-none`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => toggleCompletion(order)}
                    aria-pressed={done}
                    className={`h-10 px-3.5 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 active:scale-95 transition ${
                      done ? "bg-emerald-50 text-emerald-800" : "border border-slate-300 text-slate-700"
                    }`}
                  >
                    {done ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span className="max-w-[110px] truncate">{done ? (doneBy ? `Сделал ${doneBy}` : "Готово") : "Готово"}</span>
                  </button>
                </div>
              </li>
            );
          })}
          {filteredOrders.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-slate-500">
              Заказы не найдены. Измените фильтры или создайте новый наряд.
            </li>
          )}
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-5">Наряд</th>
                <th className="py-3 px-4">Клиент / Объект</th>
                <th className="py-3 px-4">Изделие / Задача</th>
                <th className="py-3 px-4">Мастер</th>
                <th className="py-3 px-4 text-center">Статус</th>
                <th className="py-3 px-4 text-center bg-emerald-50/60 text-emerald-900 border-x border-emerald-200">
                  Готово
                </th>
                <th className="py-3 px-4">Срок</th>
                <th className="py-3 px-4 text-right">{isWorkshop ? "Сумма наряда" : "Сумма / Оплата"}</th>
                <th className="py-3 px-5 text-center">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const deadlineInfo = getDeadlineInfo(order.deadline, order.status === "COMPLETED");
                const statusCfg = STATUS_CONFIG[order.status] || {
                  label: order.status,
                  color: "text-slate-700",
                  bg: "bg-slate-100",
                  border: "border-slate-300",
                };

                return (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition">
                    {/* Номер наряда и приоритет */}
                    <td className="py-3.5 px-5 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-blue-700 hover:text-blue-900 hover:underline text-sm font-bold"
                        >
                          {order.orderNumber}
                        </Link>
                        {order.priority === "URGENT" && (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold flex items-center gap-0.5" title="Срочный заказ!">
                            <Flame className="w-3 h-3 fill-red-600 text-red-600" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Заказчик */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{order.client?.name}</div>
                      <div className="text-[11px] text-slate-500">{order.client?.company || order.client?.phone || "—"}</div>
                    </td>

                    {/* Название изделия */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate" title={order.title}>
                        {order.title}
                      </div>
                      {order.items?.length > 0 && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {order.items.map((it: any) => it.title).join(", ")}
                        </div>
                      )}
                    </td>

                    {/* Мастер */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {order.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center text-white ${
                            order.assignedTo.name === "Альберт" ? "bg-purple-600" :
                            order.assignedTo.name === "Абзал" ? "bg-orange-600" :
                            order.assignedTo.name === "Жалгас" ? "bg-blue-600" : "bg-slate-700"
                          }`}>
                            {order.assignedTo.name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{order.assignedTo.name}</div>
                            <div className="text-[10px] text-slate-400">{order.assignedTo.roleTitle.split("&")[0]}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Не назначен</span>
                      )}
                    </td>

                    {/* Статус заказа с быстрым переключением */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} focus:outline-none`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Колонка «Готово»: кто выполнил заказ ставит галочку */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap bg-emerald-50/20 border-x border-emerald-100/60">
                      {order.status === "READY" || order.status === "COMPLETED" || order.completedBy ? (
                        <button
                          type="button"
                          onClick={() => toggleCompletion(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold text-xs transition active:scale-95 group"
                          title={`Выполнено! Нажмите, если нужно снять галочку. Отметил: ${order.completedBy || order.assignedTo?.name || "Мастер"}`}
                        >
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-extrabold">
                            {order.completedBy ? `Сделал ${order.completedBy}` : (order.assignedTo?.name ? `Сделал ${order.assignedTo.name}` : "Готово")}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleCompletion(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-400 font-semibold text-xs transition active:scale-95 group"
                          title={`Готово: Я выполнил этот наряд (${currentUser?.name || "Мастер"})`}
                        >
                          <Square className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                          <span className="group-hover:font-bold">Готово</span>
                        </button>
                      )}
                    </td>

                    {/* Время исполнения / дедлайн */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-700 font-semibold">
                            {formatDateTime(order.deadline)}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${deadlineInfo.badgeClass}`}>
                            {deadlineInfo.label}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Финансы */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatCurrency(order.totalAmount)}
                      </div>
                      {isWorkshop ? (
                        <div className="text-[11px] text-slate-400 font-medium">
                          {order.items?.length ? `${order.items.length} поз.` : "Наряд цеха"}
                        </div>
                      ) : (
                        <div className="text-[11px]">
                          {order.debtAmount > 0 ? (
                            <span className="text-red-600 font-bold">
                              Долг: {formatCurrency(order.debtAmount)}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Оплачен 100%</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Кнопка действия: Открыть карточку наряда */}
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <Link
                        href={`/orders/${order.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition inline-flex items-center gap-0.5"
                      >
                        <span>Открыть</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-sm">Заказы не найдены</p>
                    <p className="text-xs mt-1">Попробуйте изменить параметры фильтрации или создать новый наряд</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
