"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ClipboardList, 
  PlusCircle, 
  Calculator, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Phone, 
  Search, 
  CheckSquare, 
  Square, 
  Send, 
  Layers, 
  Sparkles, 
  Box, 
  Zap, 
  Hammer, 
  Printer, 
  ChevronRight,
  Share2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Users
} from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export default function TelegramMiniApp() {
  const [activeTab, setActiveTab] = useState<"orders" | "new" | "calc" | "stats">("orders");
  const [tgUser, setTgUser] = useState<any>(null);
  const [isTgReady, setIsTgReady] = useState(false);

  // Список заказов
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [search, setSearch] = useState("");
  const [filterWorker, setFilterWorker] = useState<"ALL" | "ALBERT" | "ABZAL" | "JALGAS">("ALL");

  // Статистика
  const [stats, setStats] = useState({
    activeCount: 0,
    totalRev: 0,
    totalDebt: 0,
    printM2: 0,
    lettersCount: 0,
  });

  // Форма нового наряда в TMA
  const [newTitle, setNewTitle] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newServiceType, setNewServiceType] = useState<"LIGHTBOX" | "BANNER" | "LETTERS" | "ORACAL" | "INSTALL">("LIGHTBOX");
  const [newWidth, setNewWidth] = useState("2");
  const [newHeight, setNewHeight] = useState("1");
  const [newQuantity, setNewQuantity] = useState(1);
  const [newRatePerUnit, setNewRatePerUnit] = useState(850000); // Ручная цена за м2 или за букву
  const [newOptions, setNewOptions] = useState("Светорассеивающий акрил молочный, LED модули 12V IP67");
  const [newAdvance, setNewAdvance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Калькулятор в TMA
  const [calcService, setCalcService] = useState<"LIGHTBOX" | "BANNER" | "LETTERS" | "ORACAL">("LIGHTBOX");
  const [calcW, setCalcW] = useState("2");
  const [calcH, setCalcH] = useState("1");
  const [calcQty, setCalcQty] = useState(1);
  const [calcRate, setCalcRate] = useState(850000);
  const [copiedEstimate, setCopiedEstimate] = useState(false);

  // Виброотклик Telegram Haptic Feedback
  const triggerHaptic = (type: "light" | "medium" | "heavy" | "success" | "warning") => {
    try {
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
        if (type === "success" || type === "warning") {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
        } else {
          window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
        }
      }
    } catch (e) {}
  };

  // Инициализация Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      setIsTgReady(true);

      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user);
      }

      // Цвет шапки Telegram WebApp
      if (tg.setHeaderColor) tg.setHeaderColor("#0f172a");
      if (tg.setBackgroundColor) tg.setBackgroundColor("#0f172a");
    }

    // Проверяем параметр URL tab
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "new" || tabParam === "calc" || tabParam === "stats") {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  // Загрузка и живая авто-синхронизация заказов (каждые 4 секунды)
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);

          // Пересчет статистики
          const active = data.filter((o) => o.status !== "COMPLETED");
          const rev = data.reduce((s, o) => s + (o.paidAmount || 0), 0);
          const debt = data.reduce((s, o) => s + (o.debtAmount || 0), 0);

          let pM2 = 0;
          let lCount = 0;
          active.forEach((o) => {
            o.items?.forEach((it: any) => {
              if (it.serviceType === "BANNER" || it.serviceType === "ORACAL") {
                pM2 += it.area || (Number(it.width || 0) * Number(it.height || 0) * (it.quantity || 1));
              }
              if (it.serviceType === "LETTERS") {
                lCount += it.letterCount || 0;
              }
            });
          });

          setStats({
            activeCount: active.length,
            totalRev: rev,
            totalDebt: debt,
            printM2: pM2,
            lettersCount: lCount,
          });
        }
      }
    } catch (e) {
      console.error("TMA fetch orders error:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    const onFocus = () => fetchOrders();
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // Фильтрация заказов
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === "COMPLETED") return false;

      // Поиск
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = o.title?.toLowerCase().includes(q);
        const matchesClient = o.client?.name?.toLowerCase().includes(q) || o.client?.phone?.includes(q);
        const matchesNumber = o.orderNumber?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesClient && !matchesNumber) return false;
      }

      // Фильтр по мастеру
      if (filterWorker === "ALBERT") {
        return (
          o.assignedTo?.name === "Альберт" ||
          o.status === "PRINTING" ||
          o.items?.some((i: any) => i.serviceType === "BANNER" || i.serviceType === "ORACAL")
        );
      }
      if (filterWorker === "ABZAL") {
        return (
          o.assignedTo?.name === "Абзал" ||
          ["ASSEMBLY", "MOUNTING"].includes(o.status) ||
          o.items?.some((i: any) => ["LIGHTBOX", "LETTERS", "STAND", "INSTALL"].includes(i.serviceType))
        );
      }
      if (filterWorker === "JALGAS") {
        return (
          o.assignedTo?.name === "Жалгас" ||
          o.status === "NEW" ||
          o.status === "DESIGN"
        );
      }

      return true;
    });
  }, [orders, search, filterWorker]);

  // Переключение выполнения наряда прямо в Telegram
  const handleToggleDone = async (order: any) => {
    triggerHaptic("medium");
    const isDone = order.status === "READY" || order.status === "COMPLETED";
    const nextStatus = isDone ? "PRINTING" : "READY";
    const performer = tgUser?.first_name || "Мастер цеха";

    // Оптимистичное обновление
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: nextStatus,
              completedBy: !isDone ? performer : null,
              completedAt: !isDone ? new Date().toISOString() : null,
            }
          : o
      )
    );

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          completedBy: !isDone ? performer : null,
          completedAt: !isDone ? new Date().toISOString() : null,
        }),
      });
      if (res.ok) {
        triggerHaptic("success");
      }
    } catch (e) {
      console.error(e);
      fetchOrders();
    }
  };

  // Расчет суммы в форме нового наряда
  const newCalculatedArea = (parseFloat(newWidth) || 0) * (parseFloat(newHeight) || 0);
  const newCalculatedTotal = Math.round(
    newServiceType === "LETTERS"
      ? (parseFloat(newWidth) || 1) * newRatePerUnit * newQuantity
      : newCalculatedArea * newRatePerUnit * newQuantity
  );

  // Создание нового наряда из TMA
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    triggerHaptic("light");

    const defaultTitle = 
      newServiceType === "LIGHTBOX" ? `Короб из акрила (свет) ${newWidth}x${newHeight}м` :
      newServiceType === "BANNER" ? `Баннер ${newWidth}x${newHeight}м` :
      newServiceType === "LETTERS" ? `Буквы световые LED (${newQuantity} шт)` :
      newServiceType === "ORACAL" ? `Пленка Oracal ${newWidth}x${newHeight}м` :
      `Монтажные работы`;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            name: newClientName.trim(),
            phone: newClientPhone.trim() || null,
          },
          title: newTitle.trim() || defaultTitle,
          priority: "NORMAL",
          totalAmount: newCalculatedTotal,
          advanceAmount: Number(newAdvance) || 0,
          paymentMethod: "CASH",
          items: [
            {
              serviceType: newServiceType,
              title: newTitle.trim() || defaultTitle,
              width: parseFloat(newWidth) || 0,
              height: parseFloat(newHeight) || 0,
              area: newCalculatedArea || null,
              quantity: Number(newQuantity) || 1,
              unitPrice: Number(newRatePerUnit) || 0,
              totalPrice: newCalculatedTotal,
              options: newOptions || null,
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error("Не удалось создать наряд");
      }

      triggerHaptic("success");
      setSubmitSuccess("✅ Наряд успешно отправлен в производство!");
      setNewTitle("");
      setNewClientName("");
      setNewClientPhone("");
      setNewAdvance(0);
      fetchOrders();

      setTimeout(() => {
        setSubmitSuccess(null);
        setActiveTab("orders");
      }, 1500);
    } catch (err: any) {
      triggerHaptic("warning");
      alert(err.message || "Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Расчет в быстром калькуляторе
  const calcArea = (parseFloat(calcW) || 0) * (parseFloat(calcH) || 0);
  const calcTotal = Math.round(
    calcService === "LETTERS"
      ? (parseFloat(calcW) || 1) * calcRate * calcQty
      : calcArea * calcRate * calcQty
  );

  const handleCopyQuote = () => {
    const text = 
      `📋 *РПК «MASTER PRINT» • Расчет стоимости*\n\n` +
      `🏷 *Изделие:* ${calcService === "LIGHTBOX" ? "Короб из акрила (свет)" : calcService === "BANNER" ? "Баннер 3.2м" : calcService === "LETTERS" ? "Объемные буквы LED" : "Пленка Oracal"}\n` +
      `📐 *Размер:* ${calcW}м × ${calcH}м (${calcArea.toFixed(2)} м²)\n` +
      `📦 *Количество:* ${calcQty} шт.\n` +
      `💵 *Тариф:* ${calcRate.toLocaleString()} сум / м²\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `💰 *Итого к оплате:* ${calcTotal.toLocaleString()} UZS\n\n` +
      `📞 Контакты: +998 (90) 000-00-00\n` +
      `📍 Цех рекламы: Master Print`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      triggerHaptic("success");
      setCopiedEstimate(true);
      setTimeout(() => setCopiedEstimate(false), 2000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-slate-950 text-slate-100 font-sans">
      {/* 1. Верхняя панель Telegram WebApp */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-blue-500/20">
            MP
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              MASTER PRINT
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                ERP
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              {tgUser ? `Привет, ${tgUser.first_name}! 👋` : "Цех наружки & Полиграфия"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              triggerHaptic("light");
              fetchOrders();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Обновить данные"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="https://masterprint-erp.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
            title="Открыть полную версию в браузере"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* 2. Основное содержимое в зависимости от вкладки */}
      <main className="flex-1 p-3.5 space-y-3.5">
        {/* ВКЛАДКА 1: НАРЯДЫ ЦЕХА */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            {/* Поиск и быстрые фильтры мастеров */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск по наряду, клиенту или телефону..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Чипы фильтра мастеров */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {[
                  { id: "ALL", label: `Все (${stats.activeCount})` },
                  { id: "ABZAL", label: "🛠️ Абзал (Сборка)" },
                  { id: "ALBERT", label: "🖨️ Альберт (Печать)" },
                  { id: "JALGAS", label: "🎨 Жалгас (Дизайн)" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      triggerHaptic("light");
                      setFilterWorker(f.id as any);
                    }}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-[11px] transition ${
                      filterWorker === f.id
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Экспресс-сводка загрузки цеха */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Очередь печати:</span>
                <span className="text-base font-black font-mono text-amber-400">
                  {stats.printM2.toFixed(1)} м²
                </span>
                <span className="text-[10px] text-slate-500 block">Альберт</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Букв на сборку:</span>
                <span className="text-base font-black font-mono text-cyan-400">
                  {stats.lettersCount} шт.
                </span>
                <span className="text-[10px] text-slate-500 block">Абзал</span>
              </div>
            </div>

            {/* Список нарядов */}
            <div className="space-y-2.5">
              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  Загрузка нарядов цеха...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                  <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  Нарядов не найдено
                </div>
              ) : (
                filteredOrders.map((o) => {
                  const isDone = o.status === "READY" || o.status === "COMPLETED";
                  const isUrgent = o.priority === "URGENT";

                  return (
                    <div
                      key={o.id}
                      className={`p-3.5 rounded-2xl border transition relative ${
                        isDone
                          ? "bg-slate-900/50 border-emerald-900/40 opacity-70"
                          : isUrgent
                          ? "bg-gradient-to-r from-red-950/20 to-slate-900 border-red-500/40 shadow-xs shadow-red-500/10"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Номер и статус */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="font-mono font-black text-xs text-blue-400">
                              {o.orderNumber}
                            </span>
                            {isUrgent && (
                              <span className="px-1.5 py-0.2 rounded-md bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30 flex items-center gap-0.5">
                                <Flame className="w-3 h-3" /> СРОЧНО
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${
                                o.status === "PRINTING"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : o.status === "ASSEMBLY"
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : o.status === "READY"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {o.status === "PRINTING"
                                ? "🖨️ Печать"
                                : o.status === "ASSEMBLY"
                                ? "🛠️ Сборка"
                                : o.status === "READY"
                                ? "✅ Готов"
                                : o.status === "DESIGN"
                                ? "🎨 Макет"
                                : o.status}
                            </span>
                          </div>

                          {/* Название изделия */}
                          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                            {o.title}
                          </h3>

                          {/* Заказчик и мастер */}
                          <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>
                              Клиент: <b className="text-slate-200">{o.client?.name}</b>
                            </span>
                            {o.assignedTo && (
                              <span>
                                Мастер: <b className="text-blue-300">{o.assignedTo.name}</b>
                              </span>
                            )}
                          </div>

                          {/* Сумма и долг */}
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="font-mono font-bold text-slate-200">
                              {o.totalAmount?.toLocaleString()} сум
                            </span>
                            {o.debtAmount > 0 && (
                              <span className="font-mono text-red-400 text-[11px]">
                                Долг: {o.debtAmount?.toLocaleString()} сум
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Кнопка 1-клик отметки готовности (галочка) */}
                        <button
                          type="button"
                          onClick={() => handleToggleDone(o)}
                          className={`p-2.5 rounded-xl border transition shrink-0 ${
                            isDone
                              ? "bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-500/30"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700"
                          }`}
                          title="Отметить готовность"
                        >
                          {isDone ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {/* Если есть телефон клиента - быстрая кнопка звонка */}
                      {o.client?.phone && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <a
                            href={`tel:${o.client.phone}`}
                            className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" /> {o.client.phone}
                          </a>
                          <span className="text-[10px] text-slate-500">
                            {new Date(o.createdAt).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: СОЗДАНИЕ НАХОДУ НОВОГО НАРЯДА */}
        {activeTab === "new" && (
          <form onSubmit={handleCreateOrder} className="space-y-3.5 bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-500" />
                Новый наряд в производство
              </h2>
              <p className="text-xs text-slate-400">
                Заполните параметры изделия — наряд сразу появится у мастеров цеха
              </p>
            </div>

            {submitSuccess && (
              <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold text-center">
                {submitSuccess}
              </div>
            )}

            {/* Выбор услуги */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Вид изделия
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: "LIGHTBOX", label: "📦 Короб из акрила (свет)", rate: 850000, master: "Абзал" },
                  { id: "BANNER", label: "🖨️ Баннер 3.2м", rate: 35000, master: "Альберт" },
                  { id: "LETTERS", label: "💡 Буквы LED", rate: 6000, master: "Абзал" },
                  { id: "ORACAL", label: "🎨 Пленка Oracal", rate: 50000, master: "Альберт" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setNewServiceType(s.id as any);
                      setNewRatePerUnit(s.rate);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newServiceType === s.id
                        ? "bg-blue-600 text-white border-blue-500 font-bold shadow-sm"
                        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Мастер: {s.master}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Размеры */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Ширина (м)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={newWidth}
                  onChange={(e) => setNewWidth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Высота (м)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={newHeight}
                  onChange={(e) => setNewHeight(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Кол-во (шт)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-white text-xs font-bold"
                />
              </div>
            </div>

            {/* СУММА ЗА КВАДРАТНЫЙ МЕТР (ВРУЧНУЮ) */}
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-[11px] font-bold text-amber-300 uppercase">
                  Сумма за 1 м² (вручную в UZS) *
                </label>
                <span className="text-amber-400 font-mono font-bold">
                  {newCalculatedArea.toFixed(2)} м²
                </span>
              </div>
              <input
                type="number"
                step="10000"
                value={newRatePerUnit}
                onChange={(e) => setNewRatePerUnit(Number(e.target.value) || 0)}
                placeholder="Сумма за м²"
                className="w-full px-3 py-2 bg-slate-900 border-2 border-amber-500 rounded-xl font-mono text-amber-300 text-sm font-black focus:outline-none"
              />

              {/* Пресеты для короба и других услуг */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[750000, 850000, 950000, 1200000].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setNewRatePerUnit(rate);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                      newRatePerUnit === rate
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-black"
                        : "bg-slate-900 text-amber-200 border-amber-500/30"
                    }`}
                  >
                    {(rate / 1000).toFixed(0)}k сум
                  </button>
                ))}
              </div>
            </div>

            {/* Клиент */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Имя заказчика *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Имя клиента"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Телефон клиента
                </label>
                <input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold"
                />
              </div>
            </div>

            {/* Итоговая сумма и кнопка отправки */}
            <div className="p-3 bg-slate-800/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">ИТОГО К ОПЛАТЕ:</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  {newCalculatedTotal.toLocaleString()} сум
                </span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition shadow-md shadow-blue-600/30 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Отправка..." : "В производство"}
              </button>
            </div>
          </form>
        )}

        {/* ВКЛАДКА 3: МОБИЛЬНЫЙ КАЛЬКУЛЯТОР ТЗ */}
        {activeTab === "calc" && (
          <div className="space-y-3.5 bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-500" />
                Мобильный калькулятор сметы
              </h2>
              <p className="text-xs text-slate-400">
                Быстрый расчет сметы прямо в чате с клиентом
              </p>
            </div>

            {/* Выбор изделия для расчета */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: "LIGHTBOX", label: "📦 Короб из акрила (свет)", rate: 850000 },
                { id: "BANNER", label: "🖨️ Баннер 3.2м", rate: 35000 },
                { id: "LETTERS", label: "💡 Буквы LED", rate: 6000 },
                { id: "ORACAL", label: "🎨 Пленка Oracal", rate: 50000 },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setCalcService(s.id as any);
                    setCalcRate(s.rate);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    calcService === s.id
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold">{s.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{s.rate.toLocaleString()} сум</div>
                </button>
              ))}
            </div>

            {/* Параметры калькулятора */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Ширина (м)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={calcW}
                  onChange={(e) => setCalcW(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Высота (м)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={calcH}
                  onChange={(e) => setCalcH(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Тариф / м²
                </label>
                <input
                  type="number"
                  step="10000"
                  value={calcRate}
                  onChange={(e) => setCalcRate(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-amber-300 text-xs font-bold"
                />
              </div>
            </div>

            {/* Результат расчета */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Площадь изделия:</span>
                <span className="font-mono text-white font-bold">{calcArea.toFixed(2)} м²</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Цена за 1 м²:</span>
                <span className="font-mono text-white font-bold">{calcRate.toLocaleString()} сум</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black text-slate-300">ИТОГОВАЯ СМЕТА:</span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  {calcTotal.toLocaleString()} UZS
                </span>
              </div>
            </div>

            {/* Кнопка отправки сметы клиенту */}
            <button
              type="button"
              onClick={handleCopyQuote}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700"
            >
              {copiedEstimate ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Смета скопирована! Вставьте в чат</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-400" />
                  <span>Скопировать смету для клиента в Telegram</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ВКЛАДКА 4: СВОДКА СМЕНЫ И ЦЕХ */}
        {activeTab === "stats" && (
          <div className="space-y-3.5">
            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Сводка производства
              </h2>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">В работе:</span>
                  <span className="text-xl font-black font-mono text-white">{stats.activeCount} шт</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Касса (оплата):</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {(stats.totalRev / 1000000).toFixed(1)} млн
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Печать баннеров:</span>
                  <span className="text-base font-black font-mono text-amber-400">
                    {stats.printM2.toFixed(1)} м²
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Световых букв:</span>
                  <span className="text-base font-black font-mono text-cyan-400">
                    {stats.lettersCount} шт
                  </span>
                </div>
              </div>
            </div>

            {/* Команда мастеров */}
            <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                Мастера цеха Master Print
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  { name: "Тимур", role: "Директор цеха", phone: "+998 90 111 22 33" },
                  { name: "Жалгас", role: "Менеджер & Дизайнер", phone: "+998 91 222 33 44" },
                  { name: "Абзал", role: "Мастер сборки & Монтаж", phone: "+998 90 999 88 77" },
                  { name: "Альберт", role: "Мастер печати (Баннеры)", phone: "+998 93 333 44 55" },
                ].map((m) => (
                  <div
                    key={m.name}
                    className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{m.name}</div>
                      <div className="text-[10px] text-slate-400">{m.role}</div>
                    </div>
                    <a
                      href={`tel:${m.phone}`}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-500/30 flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> Позвонить
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Нижняя фиксированная навигационная панель Telegram Mini App */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 flex items-center justify-around">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("orders");
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
            activeTab === "orders"
              ? "text-blue-400 font-bold"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px]">Наряды</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("new");
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
            activeTab === "new"
              ? "text-blue-400 font-bold"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px]">Новый</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("calc");
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
            activeTab === "calc"
              ? "text-blue-400 font-bold"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px]">Калькулятор</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setActiveTab("stats");
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
            activeTab === "stats"
              ? "text-blue-400 font-bold"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Смена</span>
        </button>
      </nav>
    </div>
  );
}
