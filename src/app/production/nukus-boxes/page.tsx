"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Banknote,
  CreditCard,
  Building,
  User,
  History,
  ShieldCheck,
  Award,
  ChevronRight,
  TrendingUp,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Share2,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { NUKUS_BOX_CATALOG, NukusBoxModel } from "@/lib/nukus-boxes-catalog";
import { ULUGPEK_PHONE, ULUGPEK_TELEGRAM_LINK } from "@/lib/nukus-boxes";

interface BatchItemSelection {
  [boxId: string]: {
    [color: string]: number;
  };
}

export default function NukusBoxesProductionPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [productionData, setProductionData] = useState<any>(null);
  const [selectedQuantities, setSelectedQuantities] = useState<BatchItemSelection>({});
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newBatchSuccess, setNewBatchSuccess] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Модалка оплаты для директора
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMethod, setPayMethod] = useState<"CASH" | "CARD" | "TRANSFER">("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  // Инициализация пустых количеств для каталога
  const resetQuantities = () => {
    const init: BatchItemSelection = {};
    NUKUS_BOX_CATALOG.forEach((box) => {
      init[box.id] = {};
      box.colors.forEach((col) => {
        init[box.id][col] = 0;
      });
    });
    setSelectedQuantities(init);
    setNotes("");
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, prodRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/production/nukus-boxes"),
      ]);

      const userData = await userRes.json();
      if (userData.user) setCurrentUser(userData.user);

      const pData = await prodRes.json();
      if (pData.success) {
        setProductionData(pData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resetQuantities();
    loadData();
  }, []);

  const updateQuantity = (boxId: string, color: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const currentVal = prev[boxId]?.[color] || 0;
      const nextVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [boxId]: {
          ...prev[boxId],
          [color]: nextVal,
        },
      };
    });
  };

  const setExactQuantity = (boxId: string, color: string, value: number) => {
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    setSelectedQuantities((prev) => ({
      ...prev,
      [boxId]: {
        ...prev[boxId],
        [color]: safeVal,
      },
    }));
  };

  // Расчет итогов текущей формируемой партии
  let totalBatchCount = 0;
  let totalBatchSum = 0;
  const itemsToSubmit: Array<{ boxId: string; color: string; quantity: number }> = [];

  NUKUS_BOX_CATALOG.forEach((box) => {
    box.colors.forEach((col) => {
      const qty = selectedQuantities[box.id]?.[col] || 0;
      if (qty > 0) {
        totalBatchCount += qty;
        totalBatchSum += qty * box.price;
        itemsToSubmit.push({
          boxId: box.id,
          color: col,
          quantity: qty,
        });
      }
    });
  });

  // Отправка сданной партии в базу
  const handleSubmitBatch = async () => {
    if (itemsToSubmit.length === 0) {
      setFeedback({ type: "error", text: "Сначала выберите хотя бы 1 изготовленную коробку!" });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch("/api/production/nukus-boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToSubmit,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка при сохранении партии");
      }

      setFeedback({
        type: "success",
        text: `🎉 Партия успешно принята! ${totalBatchCount} коробок на сумму ${formatCurrency(totalBatchSum)}. Накладная готова для отправки Улугбеку.`,
      });

      if (data.order) {
        setNewBatchSuccess(data.order);
      }

      resetQuantities();
      await loadData();
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getInvoiceUrl = (orderId: number | string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://master-print-erp.vercel.app";
    return `${origin}/track/ng/${orderId}`;
  };

  const handleShareTelegram = (batch: any) => {
    const url = getInvoiceUrl(batch.id);
    const totalQty = batch.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 0;
    const text = `🌸 Здравствуйте, Улугбек!\nЦех Master Print отгрузил партию коробок «Нукус гуллери».\n📦 Накладная: ${batch.orderNumber}\n📊 Количество: ${totalQty} шт.\n💰 Сумма: ${formatCurrency(batch.totalAmount)}\n\nПожалуйста, ознакомьтесь со спецификацией и подтвердите приемку:\n${url}`;

    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.open(shareUrl, "_blank");
    }
  };

  const handleDirectTelegramUlugbek = (batch: any) => {
    const url = getInvoiceUrl(batch.id);
    const totalQty = batch.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 0;
    const text = `🌸 Здравствуйте, Улугбек!\nЦех Master Print отгрузил партию коробок «Нукус гуллери».\n📦 Накладная: ${batch.orderNumber}\n📊 Количество: ${totalQty} шт.\n💰 Сумма: ${formatCurrency(batch.totalAmount)}\n\nПожалуйста, ознакомьтесь со спецификацией и подтвердите приемку:\n${url}`;

    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      window.open("https://t.me/+998934856006", "_blank");
    }
  };

  const handleCopyInvoiceLink = (orderId: number) => {
    if (typeof window !== "undefined") {
      const url = getInvoiceUrl(orderId);
      navigator.clipboard.writeText(url);
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Внесение оплаты от Улугбека (Директор)
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;

    try {
      setIsPaying(true);
      const res = await fetch("/api/production/nukus-boxes/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payAmount),
          method: payMethod,
          notes: payNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка при регистрации оплаты");
      }

      setFeedback({
        type: "success",
        text: `✅ ${data.message}`,
      });

      setIsPayModalOpen(false);
      setPayAmount("");
      setPayNotes("");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsPaying(false);
    }
  };

  const isDirector = currentUser?.role === "DIRECTOR";
  const isAbzal = currentUser?.role === "WORKSHOP_ASSEMBLY" || currentUser?.name === "Абзал";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Шапка страницы */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              Линия цеха
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Спецзаказ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Производство коробок: «Нукус гуллери»
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Мастер производства: <strong className="text-slate-800">Абзал</strong> • Заказчик:{" "}
            <strong className="text-slate-800">Улугбек (Нукус гуллери)</strong>
          </p>
        </div>

        {/* Быстрые действия в шапке */}
        <div className="flex items-center gap-2">
          {isDirector && productionData?.client?.totalDebt > 0 && (
            <button
              onClick={() => {
                setPayAmount(productionData.client.totalDebt);
                setIsPayModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
            >
              <Banknote className="w-4 h-4" />
              Принять оплату от Улугбека
            </button>
          )}

          <Link
            href="/orders"
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
          >
            Все наряды
          </Link>
        </div>
      </div>

      {/* Уведомление об успехе/ошибке */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold transition ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-75"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* 3 Главные сводные карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Карточка 1: Выработка мастера Абзала */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              Выработка Абзала (Коробки)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black">
              Сдельная работа
            </span>
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono mt-3">
            {formatCurrency(productionData?.abzalStats?.completedSum || 0)}
          </div>
          <div className="flex items-center justify-between text-xs text-amber-900/80 mt-1">
            <span>Всего сдано коробок:</span>
            <span className="font-bold font-mono text-slate-900">
              {productionData?.abzalStats?.boxesCount || 0} шт.
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-amber-900/80 mt-0.5">
            <span>Сдано партий:</span>
            <span className="font-bold font-mono text-slate-900">
              {productionData?.abzalStats?.batchesCount || 0} нарядов
            </span>
          </div>
        </div>

        {/* Карточка 2: Суммированный долг Улугбека («Нукус гуллери») */}
        <div
          className={`border rounded-2xl p-4 shadow-xs transition ${
            (productionData?.client?.totalDebt || 0) > 0
              ? "bg-gradient-to-br from-red-500/10 via-red-500/5 to-white border-red-200"
              : "bg-emerald-50/50 border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <AlertCircle
                className={`w-4 h-4 ${
                  (productionData?.client?.totalDebt || 0) > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              />
              Суммарный долг Улугбека
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                (productionData?.client?.totalDebt || 0) > 0
                  ? "bg-red-100 text-red-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {(productionData?.client?.totalDebt || 0) > 0 ? "Идет накопление" : "Оплачено 100%"}
            </span>
          </div>
          <div
            className={`text-2xl font-black font-mono mt-3 ${
              (productionData?.client?.totalDebt || 0) > 0 ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {formatCurrency(productionData?.client?.totalDebt || 0)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
            <span>Всего заказано коробок на:</span>
            <span className="font-bold font-mono text-slate-900">
              {formatCurrency(productionData?.client?.totalOrdered || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-0.5">
            <span>Оплачено в кассу:</span>
            <span className="font-bold font-mono text-emerald-700">
              {formatCurrency(productionData?.client?.totalPaid || 0)}
            </span>
          </div>
        </div>

        {/* Карточка 3: Всего поставлено коробок клиенту */}
        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white border border-blue-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              Отгружено коробок
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black">
              7 моделей
            </span>
          </div>
          <div className="text-2xl font-black text-blue-950 font-mono mt-3">
            {productionData?.stats?.totalBoxesCount || 0}{" "}
            <span className="text-sm font-bold text-blue-700">штук</span>
          </div>
          <div className="flex items-center justify-between text-xs text-blue-900/80 mt-1">
            <span>Клиент:</span>
            <span className="font-bold text-slate-900">Улугбек (Нукус гуллери)</span>
          </div>
          <div className="flex items-center justify-between text-xs text-blue-900/80 mt-0.5">
            <span>Телефон:</span>
            <span className="font-mono text-slate-700">{productionData?.client?.phone || "+998 90 735-00-11"}</span>
          </div>
        </div>
      </div>

      {/* Основной блок: Сдача новой партии коробок (Абзал) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Сдача партии коробок мастером
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Выберите количество изготовленных коробок по каждой модели и цвету (Черный / Белый / Симфония).
            </p>
          </div>

          <button
            type="button"
            onClick={resetQuantities}
            className="text-xs text-slate-400 hover:text-slate-700 font-semibold self-start sm:self-auto transition"
          >
            Сбросить выбор
          </button>
        </div>

        {/* Сетка 7 моделей коробок */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NUKUS_BOX_CATALOG.map((box, index) => {
            const isSymphony = box.id === "moon_symphony";
            const boxTotalQty = box.colors.reduce(
              (sum, col) => sum + (selectedQuantities[box.id]?.[col] || 0),
              0
            );

            return (
              <div
                key={box.id}
                className={`relative rounded-2xl p-4 border transition flex flex-col justify-between ${
                  boxTotalQty > 0
                    ? "bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20"
                    : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Номер и Заголовок модели */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 text-slate-700 text-[11px] font-black">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-black text-emerald-700 font-mono">
                      {formatCurrency(box.price)}
                    </span>
                  </div>

                  <div className="mt-2">
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {box.name}
                    </h3>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Размер: <span className="text-slate-800">{box.dimensions}</span>
                    </div>
                  </div>

                  {box.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {box.description}
                    </p>
                  )}
                </div>

                {/* Селекторы цветов и количества */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-2.5">
                  {box.colors.map((color) => {
                    const qty = selectedQuantities[box.id]?.[color] || 0;
                    const isBlack = color.toLowerCase().includes("черн");
                    const isWhite = color.toLowerCase().includes("бел");

                    return (
                      <div
                        key={color}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs"
                      >
                        {/* Бейдж цвета */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isBlack && (
                            <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700" />
                          )}
                          {isWhite && (
                            <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 shadow-xs" />
                          )}
                          {isSymphony && (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-slate-800">{color}</span>
                        </div>

                        {/* Кнопки плюс-минус и поле ввода */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(box.id, color, -1)}
                            disabled={qty <= 0}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 font-bold transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) =>
                              setExactQuantity(box.id, color, parseInt(e.target.value, 10))
                            }
                            className="w-12 h-8 text-center font-mono font-black text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                          />

                          <button
                            type="button"
                            onClick={() => updateQuantity(box.id, color, 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center font-bold shadow-xs transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Быстрые кнопки +5 для скорости в цехе */}
                          <button
                            type="button"
                            onClick={() => updateQuantity(box.id, color, 5)}
                            className="px-1.5 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-600 transition hidden sm:block"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Примечание цеха */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Примечание мастера Абзала (необязательно)
          </label>
          <input
            type="text"
            placeholder="Например: Сдано к 18:00, упаковано в стретч-пленку..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Нижняя плавающая панель подтверждения и сдачи партии */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Партия к сдаче:
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black text-sm border border-emerald-500/30">
                {totalBatchCount} коробок
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {formatCurrency(totalBatchSum)}
            </div>
            <p className="text-[11px] text-slate-400">
              Заказ перейдет в статус <strong className="text-slate-200">READY</strong> и добавит долг Улугбеку
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmitBatch}
            disabled={totalBatchCount === 0 || submitting}
            className="px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>Сохранение партии...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
                <span>Сдать партию коробок</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* История ранее сданных партий коробок */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Журнал сданных партий («Нукус гуллери»)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Все партии коробок, изготовленные мастером Абзалом
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {productionData?.recentBatches?.length || 0} партий
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {productionData?.recentBatches?.map((batch: any) => (
            <div
              key={batch.id}
              className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/orders/${batch.id}`}
                    className="font-mono font-bold text-blue-600 hover:underline text-sm"
                  >
                    {batch.orderNumber}
                  </Link>
                  <span className="font-black text-slate-900 text-sm">{batch.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      batch.debtAmount > 0
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {batch.debtAmount > 0 ? "Не оплачено" : "Оплачено"}
                  </span>

                  {batch.completedAt ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Принято Улугбеком
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-300">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Ожидает приемки
                    </span>
                  )}
                </div>

                {/* Список коробок в партии */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {batch.items.map((it: any) => (
                    <span
                      key={it.id}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                    >
                      {it.title} ({it.options}):{" "}
                      <strong className="text-slate-900 font-mono">{it.quantity} шт.</strong>
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-3">
                  <span>Мастер: <strong>{batch.assignedToName}</strong></span>
                  <span>• Дата: {formatDateTime(batch.createdAt)}</span>
                </div>
              </div>

              {/* Финансовый статус наряда и действия */}
              <div className="text-right shrink-0 flex flex-col items-end gap-2.5 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                <div>
                  <div className="text-base font-black font-mono text-slate-900">
                    {formatCurrency(batch.totalAmount)}
                  </div>
                  {batch.debtAmount > 0 ? (
                    <span className="text-xs font-mono font-bold text-red-600 block">
                      Долг: {formatCurrency(batch.debtAmount)}
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-bold text-emerald-600 block">
                      Полностью закрыт
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    onClick={() => handleDirectTelegramUlugbek(batch)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9] hover:text-white text-[#229ED9] border border-[#229ED9]/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Отправить ссылку Улугбеку в Telegram (+998 93 485 60 06)"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>В Telegram</span>
                  </button>

                  <Link
                    href={`/track/ng/${batch.id}`}
                    target="_blank"
                    className="px-2.5 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-[#F6D365] border border-[#D4AF37]/50 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    title="Открыть роскошный акт-счет Nukus Gulleri"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Акт NG</span>
                  </Link>

                  <button
                    onClick={() => handleCopyInvoiceLink(batch.id)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                    title="Скопировать ссылку для отправки"
                  >
                    {copiedId === batch.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <Link
                    href={`/orders/${batch.id}`}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                    title="Перейти в карточку наряда цеха"
                  >
                    <span>Цех</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {(!productionData?.recentBatches || productionData.recentBatches.length === 0) && (
            <div className="p-12 text-center text-slate-400 text-sm">
              Пока не сдано ни одной партии коробок. Выберите модели выше и нажмите «Сдать партию коробок»!
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно: Прием оплаты от Улугбека (Для директора) */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Принять оплату от Улугбека</h3>
                <p className="text-xs text-slate-500">Погашение задолженности клиента «Нукус гуллери»</p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex justify-between items-center">
                <span>Текущий общий долг Улугбека:</span>
                <span className="font-mono font-black text-sm text-red-700">
                  {formatCurrency(productionData?.client?.totalDebt || 0)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Сумма оплаты (UZS)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={productionData?.client?.totalDebt || 100000000}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Например: 500 000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-black font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Форма оплаты
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod("CASH")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      payMethod === "CASH"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Наличные
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod("CARD")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      payMethod === "CARD"
                        ? "bg-purple-50 border-purple-500 text-purple-900 ring-1 ring-purple-500"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Click / Карта
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod("TRANSFER")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      payMethod === "TRANSFER"
                        ? "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    Безнал
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Примечание
                </label>
                <input
                  type="text"
                  placeholder="Отдал в цехе / перевод на карту"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isPaying || !payAmount}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
                >
                  {isPaying ? "Проведение..." : "Зачислить в кассу и погасить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Успешное создание партии и быстрая отправка Улугбеку */}
      {newBatchSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121318] text-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 border-2 border-[#D4AF37] animate-scale-up">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center mx-auto text-[#F6D365]">
                <Package className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block">
                Партия коробок сохранена в ERP
              </span>
              <h3 className="text-xl font-serif font-black text-[#FFF5D0]">
                Накладная {newBatchSuccess.orderNumber}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Сумма партии: <b className="text-[#F6D365] font-mono">{formatCurrency(newBatchSuccess.totalAmount)}</b>. Отправьте ссылку Улугбеку для подтверждения приемки в Telegram:
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleDirectTelegramUlugbek(newBatchSuccess)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Отправить Улугбеку в Telegram (+998 93 485 60 06)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/track/ng/${newBatchSuccess.id}`}
                  target="_blank"
                  className="py-2.5 px-3 rounded-xl bg-black hover:bg-zinc-900 text-[#F6D365] border border-[#D4AF37]/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Открыть акт NG</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleCopyInvoiceLink(newBatchSuccess.id)}
                  className="py-2.5 px-3 rounded-xl bg-[#1C1E26] hover:bg-[#252833] text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedId === newBatchSuccess.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setNewBatchSuccess(null)}
                className="text-xs text-slate-400 hover:text-slate-200 underline font-medium cursor-pointer"
              >
                Закрыть окно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
