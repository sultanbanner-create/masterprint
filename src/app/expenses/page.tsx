"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Package,
  Wrench,
  Truck,
  FileText,
  Trash2,
  ExternalLink,
  Calendar,
  User,
  DollarSign,
  TrendingDown,
  Building,
  CheckCircle2,
  X,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface ExpenseItem {
  id: string;
  orderId: number | null;
  title: string;
  amount: number;
  category: "MATERIALS" | "CONSUMABLES" | "TRANSPORT" | "OTHER" | string;
  spentByName: string;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  order?: {
    id: number;
    orderNumber: string;
    title: string;
    status: string;
    client?: { name: string };
  } | null;
}

interface ExpenseSummary {
  totalAmount: number;
  materialsAmount: number;
  consumablesAmount: number;
  transportAmount: number;
  otherAmount: number;
  orderSpecificAmount: number;
  overheadAmount: number;
  count: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [orderFilter, setOrderFilter] = useState<string>("ALL"); // ALL, ORDER, OVERHEAD
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form Fields
  const [formOrderId, setFormOrderId] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("CONSUMABLES");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formSpender, setFormSpender] = useState<string>("Абзал");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formReceiptBase64, setFormReceiptBase64] = useState<string | null>(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      const [resExp, resOrders] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/orders?limit=30"),
      ]);

      if (resExp.ok) {
        const data = await resExp.json();
        setExpenses(data.expenses || []);
        setSummary(data.summary || null);
      }

      if (resOrders.ok) {
        const orderData = await resOrders.json();
        setOrders(orderData.orders || []);
      }
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Image compressor
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        setFormReceiptBase64(canvas.toDataURL("image/jpeg", 0.75));
      };
    };
    reader.readAsDataURL(file);
  };

  // Add Expense
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || Number(formAmount) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: formOrderId ? Number(formOrderId) : null,
          category: formCategory,
          title: formTitle.trim(),
          amount: Number(formAmount),
          spentByName: formSpender,
          receiptUrl: formReceiptBase64,
          notes: formNotes ? formNotes.trim() : null,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        // Reset form
        setFormTitle("");
        setFormAmount("");
        setFormOrderId("");
        setFormNotes("");
        setFormReceiptBase64(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Не удалось сохранить расход");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка при сохранении расхода");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Expense
  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись о расходе?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenses((prev) => prev.filter((item) => item.id !== id));
        fetchData();
      } else {
        alert("Не удалось удалить расход");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при удалении");
    }
  };

  // Filtered List
  const filteredExpenses = expenses.filter((item) => {
    // Category filter
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
      return false;
    }
    // Order filter
    if (orderFilter === "ORDER" && !item.orderId) return false;
    if (orderFilter === "OVERHEAD" && item.orderId) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSpender = item.spentByName.toLowerCase().includes(q);
      const matchOrder = item.order?.orderNumber.toLowerCase().includes(q);
      const matchClient = item.order?.client?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchSpender && !matchOrder && !matchClient) {
        return false;
      }
    }
    return true;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "MATERIALS":
        return {
          label: "Материалы",
          icon: Package,
          bg: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "CONSUMABLES":
        return {
          label: "Расходники",
          icon: Wrench,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "TRANSPORT":
        return {
          label: "Транспорт",
          icon: Truck,
          bg: "bg-purple-50 text-purple-700 border-purple-200",
        };
      default:
        return {
          label: "Прочее",
          icon: FileText,
          bg: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                <Receipt className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Производственные расходы
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Учет затрат на краску, шурупы, диоды, акрил, фомекс и доставку по нарядам и цеху
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить расход</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Всего расходов */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Всего расходов
                </span>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-slate-900">
                {formatCurrency(summary.totalAmount)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span>Записей: {summary.count} шт</span>
              </div>
            </div>

            {/* Материалы */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Материалы (акрил/диоды)
                </span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-blue-700">
                {formatCurrency(summary.materialsAmount)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {summary.totalAmount > 0
                  ? `${Math.round((summary.materialsAmount / summary.totalAmount) * 100)}% от общих расходов`
                  : "0%"}
              </div>
            </div>

            {/* Расходники */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Расходники (краска/шурупы)
                </span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Wrench className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-amber-700">
                {formatCurrency(summary.consumablesAmount)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {summary.totalAmount > 0
                  ? `${Math.round((summary.consumablesAmount / summary.totalAmount) * 100)}% от общих расходов`
                  : "0%"}
              </div>
            </div>

            {/* Транспорт & Доставка */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Транспорт / Доставка
                </span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-purple-700">
                {formatCurrency(summary.transportAmount)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {summary.totalAmount > 0
                  ? `${Math.round((summary.transportAmount / summary.totalAmount) * 100)}% от общих расходов`
                  : "0%"}
              </div>
            </div>
          </div>
        )}

        {/* Telegram Bot Helper Info Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 rounded-2xl border border-blue-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-bold text-xs text-slate-900">
                Мгновенное внесение расходов через Telegram-бота цеха
              </div>
              <p className="text-[11px] text-slate-600">
                Мастера могут просто отправить боту сообщение:{" "}
                <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono text-rose-600 font-bold border border-slate-200">
                  Расход 101 45000 Шурупы и краска
                </code>{" "}
                или прислать фото чека с подписью.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-blue-700 font-bold text-xs rounded-xl border border-blue-200 shadow-xs shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Интеграция активна
          </span>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "ALL", label: "Все" },
              { id: "MATERIALS", label: "📦 Материалы" },
              { id: "CONSUMABLES", label: "🛠️ Расходники" },
              { id: "TRANSPORT", label: "🚚 Транспорт" },
              { id: "OTHER", label: "🧾 Прочее" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Order/Overhead selector */}
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">Все расходы</option>
              <option value="ORDER">Только по нарядам</option>
              <option value="OVERHEAD">Только цеховые (без наряда)</option>
            </select>

            {/* Search */}
            <div className="relative w-full md:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Поиск по названию или мастеру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Список расходов ({filteredExpenses.length})</span>
            {filteredExpenses.length > 0 && (
              <span className="font-mono text-slate-700">
                Итого отфильтровано:{" "}
                <b className="text-rose-600">
                  {formatCurrency(filteredExpenses.reduce((s, i) => s + i.amount, 0))}
                </b>
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Загрузка данных по расходам...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <span className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </span>
              <div className="text-slate-800 font-bold text-sm">
                Расходов не найдено
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                В этой категории пока нет записей. Добавьте первый расход через кнопку выше или в Telegram-боте.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => {
                const badge = getCategoryBadge(exp.category);
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={exp.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Category Icon */}
                      <span className={`p-2.5 rounded-xl border shrink-0 ${badge.bg}`}>
                        <BadgeIcon className="w-4 h-4" />
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {exp.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          {exp.order ? (
                            <Link
                              href={`/orders/${exp.order.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold hover:bg-blue-100 transition"
                            >
                              <span>{exp.order.orderNumber}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                              Общецеховой
                            </span>
                          )}
                        </div>

                        {exp.order?.title && (
                          <div className="text-[11px] text-slate-500">
                            Наряд: <b>{exp.order.title}</b>
                            {exp.order.client?.name && ` (${exp.order.client.name})`}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1 text-slate-600">
                            <User className="w-3 h-3 text-slate-400" />
                            {exp.spentByName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDateTime(exp.createdAt)}
                          </span>
                          {exp.notes && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 italic">{exp.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pl-12 sm:pl-0">
                      {/* Photo Thumbnail */}
                      {exp.receiptUrl && (
                        <button
                          onClick={() => setPreviewImage(exp.receiptUrl)}
                          className="relative group rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition"
                          title="Посмотреть фото чека"
                        >
                          <img
                            src={exp.receiptUrl}
                            alt="Чек"
                            className="w-10 h-10 object-cover group-hover:scale-105 transition"
                          />
                          <span className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <ImageIcon className="w-4 h-4 text-white" />
                          </span>
                        </button>
                      )}

                      {/* Amount */}
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-black font-mono text-rose-600 block">
                          -{formatCurrency(exp.amount)}
                        </span>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="Удалить расход"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Добавить расход */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-900">
                  Внести производственный расход
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Привязка к наряду */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Привязать к наряду (заказу)
                </label>
                <select
                  value={formOrderId}
                  onChange={(e) => setFormOrderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none font-medium"
                >
                  <option value="">🏢 Общий расход цеха (без привязки к наряду)</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} • {o.title} ({o.client?.name || "Клиент"})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Если расход относится к конкретной вывеске (диоды, акрил), выберите наряд — себестоимость будет списана на него.
                </span>
              </div>

              {/* Категория */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Категория</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "MATERIALS", label: "📦 Материалы (акрил/диоды)" },
                    { id: "CONSUMABLES", label: "🛠️ Расходники (краска/шурупы)" },
                    { id: "TRANSPORT", label: "🚚 Транспорт и доставка" },
                    { id: "OTHER", label: "🧾 Прочее" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left font-bold transition text-[11px] ${
                        formCategory === cat.id
                          ? "bg-rose-50 border-rose-300 text-rose-900"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Наименование расхода */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Наименование расхода *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Шурупы 3.5x25 (2 пачки), Краска матовая, Диоды 100 шт"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Сумма и Кто списал */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Сумма (UZS) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="45 000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none text-rose-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Кто списал / купил
                  </label>
                  <select
                    value={formSpender}
                    onChange={(e) => setFormSpender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none font-medium"
                  >
                    <option value="Абзал">Абзал (Сборка & Монтаж)</option>
                    <option value="Альберт">Альберт (Печать)</option>
                    <option value="Жалгас">Жалгас (Менеджер & Дизайн)</option>
                    <option value="Тимур">Тимур (Директор)</option>
                  </select>
                </div>
              </div>

              {/* Фото чека / накладной */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Фото чека / накладной (опционально)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 transition">
                    <Camera className="w-4 h-4 text-rose-600" />
                    <span>Прикрепить чек</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                  {formReceiptBase64 && (
                    <div className="flex items-center gap-2">
                      <img
                        src={formReceiptBase64}
                        alt="Чек"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormReceiptBase64(null)}
                        className="text-red-500 hover:underline text-[11px]"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Примечание */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Примечание / Комментарий
                </label>
                <input
                  type="text"
                  placeholder="Где куплено, магазин, количество..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Кнопки */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Сохранение..." : "Сохранить расход"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Просмотр чека во весь размер */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Чек полный размер"
              className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
