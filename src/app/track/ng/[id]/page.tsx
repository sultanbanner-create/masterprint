"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
  Printer,
  Share2,
  MessageCircle,
  FileText,
  Calendar,
  Phone,
  User,
  Building,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Receipt,
  ExternalLink,
  History,
  Archive,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface NukusInvoicePageProps {
  params: { id: string };
}

export default function NukusGulleriInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const orderIdParam = params.id;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [clientNote, setClientNote] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/nukus-gulleri/${orderIdParam}`);
      if (!res.ok) throw new Error("Не удалось загрузить данные накладной");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка загрузки страницы");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orderIdParam]);

  const handleConfirmAcceptance = async () => {
    try {
      setConfirming(true);
      const res = await fetch(`/api/nukus-gulleri/${orderIdParam}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: clientNote }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Ошибка при подтверждении");
      }

      setIsConfirmModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Не удалось отправить подтверждение");
    } finally {
      setConfirming(false);
    }
  };

  const getTelegramMessage = () => {
    if (!data?.order) return "";
    const { order, isStatement, statement } = data;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://masterprint-sultanbanner-9247s-projects.vercel.app";
    const currentUrl = `${origin}/track/ng/${order.id}`;

    if (isStatement) {
      return `🌸 Здравствуйте, Улугбек!\nНаправляем вам СВОДНЫЙ РЕЕСТР & АКТ СВЕРКИ по всем отгруженным партиям цветочных коробок «Нукус гуллери».\n📊 Всего отгружено: ${statement?.totalBoxesAllTime || 0} шт. на сумму ${formatCurrency(statement?.totalOrderedAmount || 0)}\n💰 Оплачено: ${formatCurrency(statement?.totalPaidAmount || 0)}\n⚖️ Текущее сальдо (долг): ${formatCurrency(statement?.totalDebtAmount || 0)}\n\nОфициальный электронный документ:\n${origin}/track/ng/statement`;
    }

    const isAccepted = !!order.completedAt || order.completedBy?.includes("Улугбек");
    const totalQty = order.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 0;

    if (isAccepted) {
      const confirmTime = order.completedAt ? formatDateTime(order.completedAt) : "ранее";
      return `🌸 Здравствуйте, Улугбек!\nНаправляем вам электронную копию подтвержденной накладной (счет-фактуры) «Нукус гуллери».\n📦 Накладная № ${order.orderNumber}\n📊 Объем: ${totalQty} коробок\n💰 Сумма: ${formatCurrency(order.totalAmount)}\n✅ Статус: Принято заказчиком (Улугбек, ${confirmTime})\n\nСсылка на официальный счет-акт:\n${currentUrl}`;
    }

    return `🌸 Здравствуйте, Улугбек!\nЦех Master Print отгрузил партию коробок «Нукус гуллери».\n📦 Накладная: ${order.orderNumber}\n📊 Количество: ${totalQty} шт.\n💰 Сумма: ${formatCurrency(order.totalAmount)}\n\nПожалуйста, ознакомьтесь со спецификацией и подтвердите приемку:\n${currentUrl}`;
  };

  const handleSendToTelegram = () => {
    const text = getTelegramMessage();
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      window.open("https://t.me/+998934856006", "_blank");
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-[#F3E5AB] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative w-24 h-24 animate-pulse">
          <Image
            src="/images/nukus-gulleri-logo.png"
            alt="Nukus Gulleri"
            fill
            className="object-contain"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#D4AF37] font-medium tracking-widest uppercase">
          <Sparkles className="w-4 h-4 animate-spin text-[#D4AF37]" />
          Загрузка накладной Nukus Gulleri...
        </div>
      </div>
    );
  }

  if (error || !data || !data.order) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-[#F3E5AB] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#131418] border border-[#D4AF37]/30 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-20 h-20 relative mx-auto opacity-70">
            <Image
              src="/images/nukus-gulleri-logo.png"
              alt="Nukus Gulleri"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-serif font-bold text-[#F6D365]">Накладная не найдена</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || "Возможно, номер партии указан неверно или наряд еще формируется мастером цеха."}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/track/ng/statement"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1E2028] border border-[#D4AF37]/40 text-xs text-[#F6D365] font-semibold hover:bg-[#282B36] transition-all"
            >
              <Receipt className="w-4 h-4" />
              Сводный акт сверки
            </Link>
            <Link
              href="https://t.me/+998934856006"
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#AA771C] text-black font-semibold text-xs shadow-lg hover:brightness-110 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Telegram
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { order, client, statement, isStatement } = data;
  const isAccepted = !!order.completedAt || order.completedBy?.includes("Улугбек");
  const totalItemsCount = order.items?.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-[#090A0C] text-slate-100 font-sans selection:bg-[#D4AF37] selection:text-black relative pb-20">
      {/* Background radial gold glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] bg-gradient-to-b from-[#D4AF37]/15 via-transparent to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Floating Action Bar (Top) */}
      <div className="sticky top-0 z-30 bg-[#0E0F13]/95 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 py-3 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Dropdown Switcher */}
          <div className="flex items-center gap-2.5 relative">
            <Link href="/track/ng/latest" className="w-7 h-7 relative rounded-full overflow-hidden border border-[#D4AF37]/40 shrink-0">
              <Image
                src="/images/nukus-gulleri-logo.png"
                alt="NG"
                fill
                className="object-contain"
              />
            </Link>

            <button
              onClick={() => setIsArchiveOpen(!isArchiveOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#16171D] hover:bg-[#20222A] border border-[#D4AF37]/30 text-xs text-[#F6D365] font-serif transition-all"
              title="Переключить накладную или открыть архив"
            >
              <Archive className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-bold font-mono">
                {isStatement ? "Сводный акт сверки" : order.orderNumber}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Invoices Dropdown Menu */}
            {isArchiveOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#14151B] border-2 border-[#D4AF37] shadow-2xl p-2 z-50 space-y-1 animate-scale-up">
                <div className="p-2 border-b border-slate-800 text-[11px] font-mono text-[#D4AF37] font-bold flex items-center justify-between">
                  <span>АРХИВ НАКЛАДНЫХ УЛУГБЕКА</span>
                  <span className="text-[10px] text-slate-400">{statement?.orders?.length || 0} шт.</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  <Link
                    href="/track/ng/statement"
                    onClick={() => setIsArchiveOpen(false)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                      isStatement ? "bg-[#2A2415] text-[#F6D365] font-bold border border-[#D4AF37]/40" : "hover:bg-[#1E2028] text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#D4AF37]" />
                      <span>📑 Сводный акт сверки (Все)</span>
                    </div>
                    <span className="font-mono text-[11px] text-amber-300">
                      {formatCurrency(statement?.totalOrderedAmount || 0)}
                    </span>
                  </Link>

                  {statement?.orders?.map((stOrder: any) => (
                    <Link
                      key={stOrder.id}
                      href={`/track/ng/${stOrder.id}`}
                      onClick={() => setIsArchiveOpen(false)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                        stOrder.id === order.id
                          ? "bg-[#2A2415] text-[#F6D365] font-bold border border-[#D4AF37]/40"
                          : "hover:bg-[#1E2028] text-slate-300"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold">{stOrder.orderNumber}</span>
                          {stOrder.completedAt && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              Принято
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {formatDateTime(stOrder.createdAt).split(",")[0]} &bull; {stOrder.boxesCount} шт.
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-slate-200">
                        {formatCurrency(stOrder.totalAmount)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons (Right) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18191E] hover:bg-[#22242B] border border-[#D4AF37]/30 text-xs text-[#F3E5AB] font-medium transition-all cursor-pointer"
              title="Скопировать ссылку накладной"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Ссылка</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18191E] hover:bg-[#22242B] border border-[#D4AF37]/30 text-xs text-[#F3E5AB] font-medium transition-all cursor-pointer"
              title="Распечатать накладную"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Печать</span>
            </button>

            <button
              onClick={handleSendToTelegram}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:brightness-110 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              title="Отправить Улугбеку в Telegram (+998934856006)"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>В Telegram</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">

        {/* Hero Card: Nukus Gulleri Luxury Header */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#16171D] via-[#111216] to-[#0D0E12] border border-[#D4AF37]/35 p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden text-center space-y-5">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

          {/* Logo Showcase */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 mx-auto drop-shadow-[0_10px_20px_rgba(212,175,55,0.35)]">
            <Image
              src="/images/nukus-gulleri-logo.png"
              alt="Nukus Gulleri Official Logo"
              fill
              priority
              className="object-contain"
            />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F6D365] text-[10px] sm:text-xs font-serif tracking-[0.2em] uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>FLOWER & GIFT ATELIER &bull; NUKUS GULLERI</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5D0] via-[#E6C665] to-[#B38728]">
              {isStatement ? "Сводный Акт Сверки" : "Электронный Акт Приемки"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-light tracking-wide max-w-lg mx-auto">
              {isStatement
                ? "Полный реестр всех отгруженных партий коробок и сверка взаиморасчетов"
                : "Счет-фактура и спецификация партии подарочных цветочных коробок"}
            </p>
          </div>

          {/* Status Badge */}
          <div className="pt-2">
            {isStatement ? (
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-2xl bg-amber-950/70 border border-[#D4AF37]/50 text-amber-200 text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(212,175,55,0.25)]">
                <Receipt className="w-5 h-5 text-[#F6D365]" />
                <span>РЕЕСТР ВСЕХ ОТГРУЗОК ({statement?.totalOrdersCount || 0} ПАРТИЙ)</span>
              </div>
            ) : isAccepted ? (
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>ПРИЕМКА ПОДТВЕРЖДЕНА ЗАКАЗЧИКОМ (УЛУГБЕК)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                <span>ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ ПРИЕМКИ</span>
              </div>
            )}
          </div>

          {/* Key Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 text-left border-t border-[#D4AF37]/20">
            <div className="p-3 rounded-2xl bg-[#16181F]/70 border border-[#D4AF37]/15">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                {isStatement ? "Документ" : "Накладная №"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#F6D365] font-mono">
                {order.orderNumber}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#16181F]/70 border border-[#D4AF37]/15">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                Дата
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-200">
                {formatDateTime(order.createdAt).split(",")[0]}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#16181F]/70 border border-[#D4AF37]/15">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                Заказчик
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate block">
                {client?.name || "Улугбек"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#16181F]/70 border border-[#D4AF37]/15">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                Поставщик
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[#E6C665] truncate block">
                MASTER PRINT
              </span>
            </div>
          </div>
        </div>

        {/* Direct Send to Telegram Banner for ANY order (Old, New or Statement) */}
        <div className="rounded-3xl bg-gradient-to-r from-[#17202C] via-[#141822] to-[#12141A] border border-[#229ED9]/40 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#229ED9] shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Отправить эту накладную Улугбеку в Telegram
              </h4>
              <p className="text-xs text-slate-300">
                {isStatement
                  ? "Сводный акт сверки всех отгруженных партий и текущее сальдо"
                  : isAccepted
                  ? `Электронная копия уже подтвержденной накладной ${order.orderNumber}`
                  : `Ссылка для подтверждения приемки накладной ${order.orderNumber}`}
              </p>
            </div>
          </div>

          <button
            onClick={handleSendToTelegram}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span>В Telegram (+998934856006)</span>
          </button>
        </div>

        {/* Call to Action: Confirm Button Box (If Not Accepted and not general statement) */}
        {!isAccepted && !isStatement && (
          <div className="rounded-3xl bg-gradient-to-r from-[#1A1812] via-[#211E16] to-[#1A1812] border-2 border-[#D4AF37] p-6 sm:p-8 shadow-[0_10px_35px_rgba(212,175,55,0.2)] text-center space-y-4 print:hidden animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center mx-auto text-[#F6D365]">
              <Package className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF2C2]">
                Уважаемый Улугбек!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Пожалуйста, сверьте количество и модели коробок, доставленных в салон «Нукус гуллери», и подтвердите получение партии:
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F6D365] via-[#D4AF37] to-[#AA771C] text-black font-extrabold text-sm sm:text-base tracking-wide shadow-[0_10px_25px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-black" />
                <span>ПОДТВЕРДИТЬ ПРИЕМКУ ПАРТИИ</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Электронная фиксация даты и времени приемки в базе Master Print</span>
            </div>
          </div>
        )}

        {/* Accepted Certificate Badge (If Already Confirmed) */}
        {isAccepted && !isStatement && (
          <div className="rounded-3xl bg-[#0D1512] border-2 border-emerald-500/60 p-6 sm:p-7 shadow-[0_10px_35px_rgba(16,185,129,0.2)] space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-200 font-serif">
                    Партия успешно принята заказчиком
                  </h3>
                  <p className="text-xs text-slate-300">
                    Утвердил: <b className="text-emerald-300">{order.completedBy || "Улугбек (Нукус гуллери)"}</b>
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right shrink-0">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                  Дата приемки
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {order.completedAt ? formatDateTime(order.completedAt) : "Подтверждено"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 text-xs text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Претензий по качеству и количеству нет. Копия счета-фактуры сохранена в архиве.
              </span>
            </div>
          </div>
        )}

        {/* Table of Shipped Boxes: Полный объем отгруженной продукции */}
        <div className="rounded-3xl bg-[#121317] border border-[#D4AF37]/30 shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[#F6D365] text-xs font-bold uppercase tracking-wider font-mono">
                <Package className="w-4 h-4" />
                <span>Спецификация отгрузки</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-slate-100">
                {isStatement ? "Все отгруженные цветочные коробки" : "Отгруженные цветочные коробки"}
              </h3>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1B1D24] border border-[#D4AF37]/20 text-xs font-mono text-[#F3E5AB]">
              <span>Всего коробок:</span>
              <b className="text-[#F6D365] text-sm">{totalItemsCount} шт.</b>
            </div>
          </div>

          {/* Items List */}
          <div className="divide-y divide-[#D4AF37]/15">
            {order.items?.map((item: any, idx: number) => {
              const isBlack = (item.options || "").toLowerCase().includes("черн");
              const isWhite = (item.options || "").toLowerCase().includes("бел");

              return (
                <div
                  key={item.id || idx}
                  className="p-4 sm:p-5 hover:bg-[#181920] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-[#1E2028] border border-[#D4AF37]/30 flex items-center justify-center text-[#F6D365] text-xs font-bold shrink-0 font-mono mt-0.5">
                      {idx + 1}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm sm:text-base font-semibold text-slate-100 font-serif">
                        {item.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            isBlack
                              ? "bg-black text-[#F3E5AB] border-[#D4AF37]/40"
                              : isWhite
                              ? "bg-white text-slate-900 border-slate-300 font-bold"
                              : "bg-[#252219] text-[#F6D365] border-[#D4AF37]/50"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isBlack ? "bg-black border border-gold" : isWhite ? "bg-white" : "bg-[#D4AF37]"
                            }`}
                          />
                          {item.options || "Стандарт"}
                        </span>

                        <span className="text-slate-400 font-mono">
                          {formatCurrency(item.unitPrice)} / шт.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pl-11 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                        Количество
                      </span>
                      <span className="text-base font-bold text-slate-100 font-mono">
                        {item.quantity} шт.
                      </span>
                    </div>

                    <div className="text-right min-w-[110px]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                        Сумма
                      </span>
                      <span className="text-base font-bold text-[#F6D365] font-mono">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals Footer */}
          <div className="bg-[#17181F] p-5 sm:p-6 border-t border-[#D4AF37]/30 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
              <span>Итого коробок:</span>
              <span className="font-bold text-slate-100 text-sm">{totalItemsCount} шт.</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D4AF37]/20">
              <div className="space-y-0.5">
                <span className="text-xs uppercase tracking-wider font-mono text-[#D4AF37] font-bold block">
                  {isStatement ? "Общая стоимость всех отгрузок" : "Сумма к оплате по накладной"}
                </span>
                <span className="text-[11px] text-slate-400">
                  Валюта: Узбекский сум (UZS)
                </span>
              </div>

              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5D0] via-[#F6D365] to-[#AA771C]">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Statement & Archive Section */}
        {statement && statement.orders && (
          <div className="rounded-3xl bg-[#121317] border border-[#D4AF37]/20 overflow-hidden shadow-lg">
            <button
              onClick={() => setShowStatement(!showStatement)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-[#181920] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1B1D24] border border-[#D4AF37]/25 flex items-center justify-center text-[#F6D365]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-serif">
                    Акт сверки и архив всех накладных
                  </h4>
                  <p className="text-xs text-slate-400">
                    Всего за все время: <b>{statement.totalBoxesAllTime} шт.</b> на сумму <b>{formatCurrency(statement.totalOrderedAmount)}</b> ({statement.orders.length} накладных)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-medium">
                <span className="hidden sm:inline">
                  {showStatement ? "Скрыть архив" : "Показать все накладные"}
                </span>
                {showStatement ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showStatement && (
              <div className="p-5 border-t border-[#D4AF37]/15 space-y-4 bg-[#0E0F13]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2 border-b border-[#D4AF37]/15 text-center">
                  <div className="p-3 rounded-2xl bg-[#14161C] border border-[#D4AF37]/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Всего отгружено</span>
                    <span className="text-sm font-bold text-[#F6D365] font-mono">{formatCurrency(statement.totalOrderedAmount)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#14161C] border border-[#D4AF37]/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Оплачено</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">{formatCurrency(statement.totalPaidAmount)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#14161C] border border-[#D4AF37]/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Текущее сальдо (долг)</span>
                    <span className="text-sm font-bold text-amber-300 font-mono">{formatCurrency(statement.totalDebtAmount)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider">
                    <span>Все накладные салона («Нукус гуллери»):</span>
                    <Link
                      href="/track/ng/statement"
                      className="text-[#F6D365] hover:underline flex items-center gap-1 font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Открыть общий акт сверки
                    </Link>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {statement.orders.map((stOrder: any) => (
                      <div
                        key={stOrder.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                          stOrder.id === order.id
                            ? "bg-[#252219] border-[#D4AF37] text-white"
                            : "bg-[#14151B] border-slate-800 text-slate-300 hover:border-[#D4AF37]/40"
                        }`}
                      >
                        <Link
                          href={`/track/ng/${stOrder.id}`}
                          className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:text-white"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#F6D365]">{stOrder.orderNumber}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span>{stOrder.boxesCount} шт.</span>
                            {stOrder.completedAt ? (
                              <span className="text-emerald-400 text-[10px] flex items-center gap-1 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                <Check className="w-3 h-3" /> Принято {formatDateTime(stOrder.completedAt).split(",")[0]}
                              </span>
                            ) : (
                              <span className="text-amber-400 text-[10px] bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                                Ожидает приемки
                              </span>
                            )}
                          </div>

                          <div className="font-mono font-bold text-slate-200">
                            {formatCurrency(stOrder.totalAmount)}
                          </div>
                        </Link>

                        <button
                          onClick={() => {
                            const origin = typeof window !== "undefined" ? window.location.origin : "https://masterprint-sultanbanner-9247s-projects.vercel.app";
                            const msg = `🌸 Здравствуйте, Улугбек!\nНаправляем накладную № ${stOrder.orderNumber} на сумму ${formatCurrency(stOrder.totalAmount)} (${stOrder.boxesCount} шт.).\nСсылка: ${origin}/track/ng/${stOrder.id}`;
                            navigator.clipboard.writeText(msg);
                            window.open("https://t.me/+998934856006", "_blank");
                          }}
                          className="ml-3 p-1.5 rounded-lg bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border border-[#229ED9]/30 transition-all"
                          title="Отправить эту накладную Улугбеку в Telegram"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contacts & Requisites Section */}
        <div className="p-6 rounded-3xl bg-[#121317] border border-[#D4AF37]/20 text-xs text-slate-400 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="font-bold text-[#F6D365] uppercase font-serif tracking-wider block">
                Заказчик:
              </span>
              <p className="text-slate-200 font-medium">Цветочный салон «Nukus Gulleri»</p>
              <p>Улугбек: <a href="tel:+998934856006" className="text-[#D4AF37] underline">+998 93 485-60-06</a></p>
              <p>Telegram: <a href="https://t.me/+998934856006" target="_blank" className="text-[#D4AF37] underline">@nukus.gulleri</a></p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-[#F6D365] uppercase font-serif tracking-wider block">
                Исполнитель:
              </span>
              <p className="text-slate-200 font-medium">Рекламно-производственная компания «MASTER PRINT»</p>
              <p>Цех производства подарочной упаковки и наружной рекламы</p>
              <p>г. Нукус &bull; Мастер цеха: Абзал &bull; Директор: Тимур</p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D4AF37]/15 text-[11px] text-center text-slate-500 font-mono">
            Документ сформирован в автоматизированной ERP-системе Master Print.
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#16171E] border-2 border-[#D4AF37] p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-5 animate-scale-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center mx-auto text-[#F6D365]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#FFF5D0]">
                Подтверждение приемки
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Вы подтверждаете, что приняли партию из <b className="text-[#F6D365]">{totalItemsCount} коробок</b> на сумму <b className="text-[#F6D365]">{formatCurrency(order.totalAmount)}</b> по накладной <b className="text-white">{order.orderNumber}</b>?
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 block">
                Примечание или пожелание цеху (необязательно):
              </label>
              <input
                type="text"
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                placeholder="Например: все коробки целые, спасибо!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F1014] border border-[#D4AF37]/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={confirming}
                className="flex-1 py-3 rounded-xl bg-[#22242C] hover:bg-[#2C2E38] text-xs font-semibold text-slate-300 transition-colors"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handleConfirmAcceptance}
                disabled={confirming}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#F6D365] via-[#D4AF37] to-[#AA771C] text-black text-xs font-extrabold shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {confirming ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-black" />
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black stroke-[3]" />
                    <span>Да, подтверждаю</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print-only CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
