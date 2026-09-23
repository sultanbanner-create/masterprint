"use client";

import React, { useState } from "react";
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
  Award
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, getDeadlineInfo, STATUS_CONFIG } from "@/lib/utils";

interface OrderListProps {
  initialOrders: any[];
  employees: any[];
  currentUser?: any;
}

export function OrderList({ initialOrders, employees, currentUser }: OrderListProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  
  const isDirector = currentUser?.role === "DIRECTOR";
  const isWorkshop = currentUser?.role === "WORKSHOP_ASSEMBLY" || currentUser?.role === "WORKSHOP_PRINTING";

  // Для мастеров и менеджера по умолчанию показываем их собственные наряды
  const [filterEmployee, setFilterEmployee] = useState<string>(() => {
    if (currentUser && currentUser.role !== "DIRECTOR") {
      const match = employees.find((e) => e.id === currentUser.id || e.name === currentUser.name);
      if (match) return match.id;
    }
    return "ALL";
  });

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [filterProductType, setFilterProductType] = useState<string>("ALL");
  const [search, setSearch] = useState("");

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
    if (filterEmployee !== "ALL" && order.assignedToId !== filterEmployee) return false;
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
          "№ Наряда",
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
          "№ Наряда",
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
    link.setAttribute("download", `orders_outdoor_erp_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Личный блок мастера: только его заказы и сумма выполненной работы */}
      {!isDirector && currentUser && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Выработка: {currentUser.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {currentUser.roleTitle || "Мастер цеха"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black font-mono text-emerald-700">
                  {formatCurrency(myCompletedSum)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  (сдано / готово: <b>{myCompletedOrders.length}</b> нарядов)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 shadow-2xs">
              В работе: <b className="text-slate-900">{myActiveOrders.length}</b> нарядов
            </div>
            {myUrgentOrders.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-1 shadow-2xs">
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
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              {filterEmployee === currentUser?.id || filterEmployee === employees.find((e) => e.name === currentUser?.name)?.id
                ? "Показать все наряды цеха"
                : "Только мои наряды"}
            </button>
          </div>
        </div>
      )}

      {/* Верхний блок фильтрации: по сотруднику и строке поиска */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Фильтр по мастерам */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase mr-1 flex items-center gap-1 shrink-0">
            <User className="w-3.5 h-3.5" /> Мастер:
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
            Все мастера ({orders.length})
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
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{emp.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? "bg-teal-800 text-white" : "bg-slate-200 text-slate-600"}`}>
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
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-600 focus:outline-none"
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
                ? "bg-red-500 text-white border-red-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:border-red-300 hover:text-red-700"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${filterUrgentOnly ? "text-white" : "text-red-500"}`} />
            <span>Срочные 🔥</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterUrgentOnly ? "bg-red-700 text-white" : "bg-red-100 text-red-700"}`}>
              {urgentCount}
            </span>
          </button>

          {!isWorkshop && (
            <button
              type="button"
              onClick={() => setFilterDebtOnly(!filterDebtOnly)}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border ${
                filterDebtOnly
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:text-amber-800"
              }`}
            >
              <span>💰 С остатком долга</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterDebtOnly ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800"}`}>
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
            <option value="BANNER">🖨️ Баннеры</option>
            <option value="LETTERS">💡 Световые буквы LED</option>
            <option value="LIGHTBOX">📦 Лайтбоксы</option>
            <option value="ORACAL">✂️ Пленка Oracal</option>
            <option value="AUTO_BRANDING">🚗 Брендирование авто</option>
            <option value="INSTALL">🔨 Только монтаж</option>
          </select>
        </div>

        <div className="text-slate-500 text-[11px] font-medium">
          Показано: <b className="text-slate-900">{filteredOrders.length}</b> из {orders.length} нарядов
        </div>
      </div>

      {/* Таблица реестра нарядов */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <th className="py-3 px-5">№ Наряда</th>
                <th className="py-3 px-4">Клиент / Объект</th>
                <th className="py-3 px-4">Изделие / Задача</th>
                <th className="py-3 px-4">Ответственный мастер</th>
                <th className="py-3 px-4 text-center">Статус</th>
                <th className="py-3 px-4">Время исполнения (Дедлайн)</th>
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
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-teal-700 hover:text-teal-900 hover:underline text-sm font-bold"
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

                    {/* Ответственный мастер */}
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
                        <option value="NEW">Новый</option>
                        <option value="DESIGN">Макет (Жалгас)</option>
                        <option value="PRINTING">Печать (Альберт)</option>
                        <option value="ASSEMBLY">Сборка (Абзал)</option>
                        <option value="MOUNTING">Монтаж (Абзал)</option>
                        <option value="READY">Готов к сдаче</option>
                        <option value="COMPLETED">Сдан & Оплачен</option>
                      </select>
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
                        {order.status !== "READY" && order.status !== "COMPLETED" && deadlineInfo.isUrgent && (
                          <div className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded animate-pulse">
                            <Flame className="w-3 h-3 fill-red-600 text-red-600 shrink-0" />
                            <span>ГОРИТ ДЕДЛАЙН!</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Финансы */}
                    <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
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

                    {/* Кнопки действия: быстрая отметка готовности для Альберта/мастеров + Открыть */}
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {order.status !== "READY" && order.status !== "COMPLETED" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(order.id, "READY")}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition inline-flex items-center gap-1 shadow-xs active:scale-95"
                            title="Отметить заказ как готовый (снимает тревогу дедлайна)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{order.assignedTo?.name === "Альберт" ? "Напечатан" : "Готов"}</span>
                          </button>
                        ) : order.status === "READY" ? (
                          <span className="px-2 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Готов</span>
                          </span>
                        ) : null}

                        <Link
                          href={`/orders/${order.id}`}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition inline-flex items-center gap-0.5 shadow-2xs"
                        >
                          <span>Открыть</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
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
