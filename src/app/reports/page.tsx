"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Printer, 
  DollarSign, 
  Package, 
  User, 
  Users, 
  Layers, 
  PieChart, 
  Award, 
  Clock, 
  ArrowLeft,
  Flame,
  CheckCircle2,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"ALL" | "THIS_MONTH" | "LAST_30_DAYS">("ALL");

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/stock").then((r) => r.json()),
    ])
      .then(([ordersData, clientsData, stockData]) => {
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setMaterials(stockData?.materials || []);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  // Фильтрация по периоду
  const filteredOrders = useMemo(() => {
    if (period === "ALL") return orders;

    const now = new Date();
    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (period === "THIS_MONTH") {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (period === "LAST_30_DAYS") {
        const diffMs = now.getTime() - orderDate.getTime();
        return diffMs <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [orders, period]);

  // Финансовые показатели
  const totalOrderValue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [filteredOrders]);

  const totalPaidRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  }, [filteredOrders]);

  const totalDebts = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.debtAmount || 0), 0);
  }, [filteredOrders]);

  const averageCheck = useMemo(() => {
    return filteredOrders.length > 0 ? Math.round(totalOrderValue / filteredOrders.length) : 0;
  }, [totalOrderValue, filteredOrders]);

  // Расчет себестоимости материалов и сдельной оплаты мастеров
  const { materialCost, laborCost, albertM2, abzalLetters, jalgasSales } = useMemo(() => {
    let mat = 0;
    let labor = 0;
    let m2 = 0;
    let letters = 0;
    let sales = 0;

    filteredOrders.forEach((o) => {
      sales += o.totalAmount || 0;
      o.items?.forEach((item: any) => {
        if (item.serviceType === "BANNER") {
          const area = item.area || 0;
          mat += area * 15000; // Баннерная ткань + люверсы
          labor += area * 3000; // Альберт
          m2 += area;
        } else if (item.serviceType === "LETTERS") {
          const count = item.letterCount || 0;
          const h = item.letterHeight || 0;
          const qty = item.quantity || 1;
          const cmTotal = count * h * qty;
          mat += cmTotal * 2500; // Акрил, ПВХ, диоды
          labor += cmTotal * 1200; // Абзал
          letters += count * qty;
        } else if (item.serviceType === "LIGHTBOX") {
          const area = item.area || 0;
          mat += area * 350000;
          labor += area * 120000;
        } else if (item.serviceType === "ORACAL") {
          const area = item.area || 0;
          mat += area * 22000;
          labor += area * 3000;
          m2 += area;
        } else if (item.serviceType === "AUTO_BRANDING") {
          mat += (item.unitPrice || 0) * 0.35;
          labor += (item.unitPrice || 0) * 0.25;
        } else {
          mat += (item.totalPrice || 0) * 0.4;
          labor += (item.totalPrice || 0) * 0.2;
        }
      });
    });

    return {
      materialCost: Math.round(mat),
      laborCost: Math.round(labor),
      albertM2: Math.round(m2 * 10) / 10,
      abzalLetters: letters,
      jalgasSales: sales,
    };
  }, [filteredOrders]);

  const netProfit = Math.max(0, totalPaidRevenue - materialCost - laborCost);
  const profitMarginPercent = totalPaidRevenue > 0 ? Math.round((netProfit / totalPaidRevenue) * 100) : 0;

  // Структура выручки по категориям
  const categoryStats = useMemo(() => {
    const stats: Record<string, { label: string; count: number; total: number; icon: string }> = {
      LETTERS: { label: "Световые буквы LED", count: 0, total: 0, icon: "💡" },
      BANNER: { label: "Широкоформатный баннер", count: 0, total: 0, icon: "🖨️" },
      LIGHTBOX: { label: "Световые короба (Лайтбоксы)", count: 0, total: 0, icon: "📦" },
      ORACAL: { label: "Пленка Oracal / Резка", count: 0, total: 0, icon: "✂️" },
      AUTO_BRANDING: { label: "Брендирование авто (Labo/Damas)", count: 0, total: 0, icon: "🚗" },
      INSTALL: { label: "Монтажные работы", count: 0, total: 0, icon: "🔨" },
      CUSTOM: { label: "Прочие нестандартные конструкции", count: 0, total: 0, icon: "🏷️" },
    };

    filteredOrders.forEach((o) => {
      o.items?.forEach((item: any) => {
        const cat = stats[item.serviceType] ? item.serviceType : "CUSTOM";
        stats[cat].count += item.quantity || 1;
        stats[cat].total += item.totalPrice || 0;
      });
    });

    return Object.entries(stats).filter(([_, s]) => s.total > 0).sort((a, b) => b[1].total - a[1].total);
  }, [filteredOrders]);

  // Топ клиенты по LTV
  const topClients = useMemo(() => {
    const map: Record<string, { name: string; company?: string; phone?: string; ordersCount: number; totalSpent: number; debt: number }> = {};

    filteredOrders.forEach((o) => {
      const clientId = o.client?.id || o.clientId || "unknown";
      if (!map[clientId]) {
        map[clientId] = {
          name: o.client?.name || "Клиент",
          company: o.client?.company,
          phone: o.client?.phone,
          ordersCount: 0,
          totalSpent: 0,
          debt: 0,
        };
      }
      map[clientId].ordersCount += 1;
      map[clientId].totalSpent += o.totalAmount || 0;
      map[clientId].debt += o.debtAmount || 0;
    });

    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 7);
  }, [filteredOrders]);

  return (
    <div className="space-y-6 pb-12">
      {/* Шапка аналитики */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition no-print"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-gradient-to-tr from-teal-600 to-emerald-500 rounded-xl text-white shadow-md shadow-teal-500/20">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Финансовая аналитика & Отчеты производства
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Экономика мастерской, маржинальность, LTV заказчиков и выработка мастеров
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap no-print">
          {/* Период */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setPeriod("ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === "ALL" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Всё время
            </button>
            <button
              onClick={() => setPeriod("THIS_MONTH")}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === "THIS_MONTH" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Этот месяц
            </button>
            <button
              onClick={() => setPeriod("LAST_30_DAYS")}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === "LAST_30_DAYS" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              За 30 дней
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            Распечатать отчет
          </button>
        </div>
      </div>

      {/* Ключевой блок: Финансовый баланс & Чистая прибыль */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-700">
          <div>
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Финансовый результат цеха
            </span>
            <h2 className="text-xl font-black mt-0.5">
              Сводная прибыль и рентабельность
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl">
              Рентабельность: ~{profitMarginPercent}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">1. Поступило в кассу:</span>
            <div className="text-xl font-black font-mono text-emerald-400 mt-1">
              +{formatCurrency(totalPaidRevenue)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Из {formatCurrency(totalOrderValue)} по сметам
            </span>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">2. Себестоимость материалов:</span>
            <div className="text-xl font-black font-mono text-rose-400 mt-1">
              -{formatCurrency(materialCost)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Баннеры, акрил, диоды, пленка
            </span>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">3. Сдельный ФОТ мастеров:</span>
            <div className="text-xl font-black font-mono text-amber-400 mt-1">
              -{formatCurrency(laborCost)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Выработка Альберта, Абзала, Жалгаса
            </span>
          </div>

          <div className="p-4 bg-emerald-950/40 rounded-xl border border-emerald-500/40">
            <span className="text-emerald-400 block text-[10px] uppercase font-bold">4. Чистая прибыль (Тимур):</span>
            <div className="text-2xl font-black font-mono text-emerald-300 mt-1">
              {formatCurrency(netProfit)}
            </div>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">
              Итог после вычета всех расходов
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-700/60 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Всего заказов в выборке:</span>
            <b className="font-mono text-white text-sm">{filteredOrders.length} нарядов</b>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Средний чек заказа:</span>
            <b className="font-mono text-white text-sm">{formatCurrency(averageCheck)}</b>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Остаток долгов заказчиков:</span>
            <b className="font-mono text-red-400 text-sm">{formatCurrency(totalDebts)}</b>
          </div>
        </div>
      </div>

      {/* Блок выработки мастеров и структуры заказов */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Выработка команды мастеров */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            Выработка и производственный вклад мастеров
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Альберт */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                  А
                </div>
                <div>
                  <div className="font-bold text-slate-900">Альберт</div>
                  <div className="text-[10px] text-slate-500">Широкоформатная печать</div>
                </div>
              </div>
              <div className="pt-2 border-t border-purple-200/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Отпечатано:</span>
                  <span className="font-bold font-mono text-purple-900">{albertM2} м²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ставка:</span>
                  <span className="font-mono text-slate-700">3 000 сум/м²</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-purple-200/40 font-bold text-purple-950">
                  <span>Сдельный доход:</span>
                  <span className="font-mono">~{formatCurrency(Math.round(albertM2 * 3000))}</span>
                </div>
              </div>
            </div>

            {/* Абзал */}
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-600 text-white font-bold flex items-center justify-center text-xs">
                  А
                </div>
                <div>
                  <div className="font-bold text-slate-900">Абзал</div>
                  <div className="text-[10px] text-slate-500">Сборка LED & Монтаж</div>
                </div>
              </div>
              <div className="pt-2 border-t border-orange-200/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Световых букв:</span>
                  <span className="font-bold font-mono text-orange-900">{abzalLetters} шт</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ставка:</span>
                  <span className="font-mono text-slate-700">1200 сум/см + 30%</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-orange-200/40 font-bold text-orange-950">
                  <span>Сдельный доход:</span>
                  <span className="font-mono">~{formatCurrency(Math.round(laborCost * 0.65))}</span>
                </div>
              </div>
            </div>

            {/* Жалгас */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  Ж
                </div>
                <div>
                  <div className="font-bold text-slate-900">Жалгас</div>
                  <div className="text-[10px] text-slate-500">Менеджер & Дизайнер</div>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Объем сделок:</span>
                  <span className="font-bold font-mono text-blue-900">{formatCurrency(jalgasSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Комиссия:</span>
                  <span className="font-mono text-slate-700">5% + макеты</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-blue-200/40 font-bold text-blue-950">
                  <span>Вознаграждение:</span>
                  <span className="font-mono">~{formatCurrency(Math.round(jalgasSales * 0.05 + filteredOrders.length * 50000))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Структура видов рекламных конструкций */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-600" />
            Выручка по видам конструкций
          </h2>

          <div className="space-y-3">
            {categoryStats.map(([key, stat]) => {
              const pct = totalOrderValue > 0 ? Math.round((stat.total / totalOrderValue) * 100) : 0;
              return (
                <div key={key} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{stat.icon}</span>
                      <span>{stat.label}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(stat.total)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Рейтинг ТОП-клиентов по объему заказов (LTV) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              ТОП заказчиков по объему оплат (LTV)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Клиенты, приносящие наибольшую прибыль производству наружки
            </p>
          </div>
          <Link
            href="/clients"
            className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1 no-print"
          >
            Все клиенты в CRM &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <th className="py-3 px-5">Клиент</th>
                <th className="py-3 px-4">Организация / Бренд</th>
                <th className="py-3 px-4 text-center">Заказов</th>
                <th className="py-3 px-4 text-right">Всего оформлено</th>
                <th className="py-3 px-4 text-right">Остаток долга</th>
                <th className="py-3 px-4 text-center no-print">Связь</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topClients.map((client, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-5 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>{client.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {client.company || "Частное лицо"}
                  </td>
                  <td className="py-3 px-4 text-center font-bold font-mono text-slate-700">
                    {client.ordersCount}
                  </td>
                  <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                    {formatCurrency(client.totalSpent)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-mono">
                    {client.debt > 0 ? (
                      <span className="text-red-600">{formatCurrency(client.debt)}</span>
                    ) : (
                      <span className="text-emerald-700">Оплачен 100%</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center no-print">
                    {client.phone && (
                      <a
                        href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        title="Написать в WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
