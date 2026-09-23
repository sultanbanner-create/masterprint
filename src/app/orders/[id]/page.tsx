"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Printer, 
  Flame, 
  MapPin, 
  Phone, 
  Clock, 
  Plus, 
  Trash2, 
  User, 
  Wallet,
  Calendar,
  Image as ImageIcon,
  Package,
  Check,
  CheckCircle2,
  FileText,
  ShieldCheck,
  MessageSquare,
  Compass,
  Navigation as NavIcon,
  Copy,
  FolderOpen,
  FileCode,
  ExternalLink,
  Zap
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, getDeadlineInfo, STATUS_CONFIG } from "@/lib/utils";
import { PrintReceipt } from "@/components/PrintReceipt";
import { CommercialProposal } from "@/components/CommercialProposal";
import { AcceptanceAct } from "@/components/AcceptanceAct";
import { ClientWhatsAppModal } from "@/components/ClientWhatsAppModal";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isActOpen, setIsActOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  // Списание материалов со склада
  const [isDeductingStock, setIsDeductingStock] = useState(false);
  const [stockMessage, setStockMessage] = useState<string | null>(null);

  // Оплата
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER">("CASH");
  const [paymentNote, setPaymentNote] = useState<string>("");

  // Комментарии и фотоотчеты
  const [commentAuthor, setCommentAuthor] = useState("Абзал (Мастер сборки & Монтаж)");
  const [newCommentText, setNewCommentText] = useState("");
  const [commentPhoto, setNewCommentPhoto] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Сжатие фото перед отправкой с камеры смартфона (чтобы 12МБ фото не перегружали сеть и базу)
  const compressImage = (file: File, maxWidth = 1280, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const elem = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          elem.width = width;
          elem.height = height;
          const ctx = elem.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(elem.toDataURL("image/jpeg", quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Файлы макета (TIFF / CorelDRAW) для печати и ЧПУ
  const [filePathInput, setFilePathInput] = useState("");
  const [savedFilePath, setSavedFilePath] = useState("");
  const [savingFile, setSavingFile] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedTracker, setCopiedTracker] = useState(false);
  const [qaChecks, setQaChecks] = useState<boolean[]>([false, false, false, false, false, false]);

  const toggleQaCheck = (idx: number) => {
    setQaChecks((prev) => {
      const copy = [...prev];
      copy[idx] = !copy[idx];
      return copy;
    });
  };

  const copyTrackerLink = () => {
    if (!order) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/track/${order.id}`;
    navigator.clipboard.writeText(url);
    setCopiedTracker(true);
    setTimeout(() => setCopiedTracker(false), 2000);
  };

  const loadData = async () => {
    try {
      const [orderRes, empRes, meRes] = await Promise.all([
        fetch(`/api/orders/${params.id}`),
        fetch("/api/employees"),
        fetch("/api/auth/me"),
      ]);

      if (!orderRes.ok) throw new Error("Заказ не найден");
      const orderData = await orderRes.json();
      const empData = await empRes.json();
      const meData = meRes.ok ? await meRes.json() : null;

      setOrder(orderData);
      setEmployees(Array.isArray(empData) ? empData : []);
      if (meData?.user) {
        setCurrentUser(meData.user);
        if (meData.user.name) {
          setCommentAuthor(`${meData.user.name} (${meData.user.roleTitle || "Сотрудник"})`);
        }
      }

      if (orderData?.notes) {
        const match = orderData.notes.match(/\[ФАЙЛ_МАКЕТА\]:\s*(.*)/);
        const path = match ? match[1].trim() : "";
        setSavedFilePath(path);
        setFilePathInput(path);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const updateField = async (fieldPatch: any) => {
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldPatch),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveFilePath = async () => {
    if (!order) return;
    setSavingFile(true);
    try {
      let cleanNotes = (order.notes || "").replace(/\[ФАЙЛ_МАКЕТА\]:\s*.*(\n|$)/g, "").trim();
      const finalNotes = filePathInput.trim()
        ? cleanNotes ? `${cleanNotes}\n[ФАЙЛ_МАКЕТА]: ${filePathInput.trim()}` : `[ФАЙЛ_МАКЕТА]: ${filePathInput.trim()}`
        : cleanNotes;
      await updateField({ notes: finalNotes });
      setSavedFilePath(filePathInput.trim());
    } finally {
      setSavingFile(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          amount,
          method: paymentMethod,
          notes: paymentNote.trim() || null,
          receivedBy: currentUser?.name || "Жалгас",
        }),
      });

      if (res.ok) {
        setPaymentAmount("");
        setPaymentNote("");
        setIsPaymentModalOpen(false);
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() && !commentPhoto) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: commentAuthor.split(" ")[0],
          text: newCommentText.trim(),
          photoUrl: commentPhoto,
        }),
      });

      if (res.ok) {
        setNewCommentText("");
        setNewCommentPhoto(null);
        await loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeductStock = async () => {
    if (!confirm("Списать баннерную ткань, люверсы, диоды и оракал со склада по этому заказу?")) return;
    setIsDeductingStock(true);
    setStockMessage(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/deduct-stock`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setStockMessage(data.message);
        await loadData();
      } else {
        alert(data.error || "Ошибка списания со склада");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeductingStock(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этот наряд?")) return;
    try {
      const res = await fetch(`/api/orders/${params.id}`, { method: "DELETE" });
      if (res.ok) router.push("/orders");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Загрузка данных наряда...</div>;
  if (!order) return <div className="py-20 text-center text-slate-500">Заказ не найден.</div>;

  const deadlineInfo = getDeadlineInfo(order.deadline, order.status === "COMPLETED");
  const statusCfg = STATUS_CONFIG[order.status] || {
    label: order.status,
    color: "text-slate-800",
    bg: "bg-slate-100",
    border: "border-slate-300",
  };

  return (
    <div className="space-y-6">
      {/* Верхняя строка управления */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {order.orderNumber}
              </h1>
              {order.priority === "URGENT" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 border border-red-200">
                  <Flame className="w-3.5 h-3.5 text-red-600 fill-red-600" /> Срочно 🔥
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold">{order.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Смена мастера */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Мастер:</span>
            <select
              value={order.assignedToId || ""}
              onChange={(e) => updateField({ assignedToId: e.target.value || null })}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Не назначен</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.roleTitle.split("&")[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Смена статуса */}
          <select
            value={order.status}
            onChange={(e) => updateField({ status: e.target.value })}
            className={`px-3 py-2 text-xs font-bold rounded-xl border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} focus:outline-none cursor-pointer`}
          >
            <option value="NEW">Новый</option>
            <option value="DESIGN">Макет (Жалгас)</option>
            <option value="PRINTING">Печать (Альберт)</option>
            <option value="ASSEMBLY">Сборка (Абзал)</option>
            <option value="MOUNTING">Монтаж (Абзал)</option>
            <option value="READY">Готов к сдаче</option>
            <option value="COMPLETED">Сдан & Оплачен</option>
          </select>

          {/* Кнопка списания материалов со склада */}
          {order.movements && order.movements.length > 0 ? (
            <span className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5" title="Материалы уже списаны со склада">
              <Check className="w-4 h-4 text-emerald-600" />
              Склад списан ({order.movements.length})
            </span>
          ) : (
            <button
              onClick={handleDeductStock}
              disabled={isDeductingStock}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Автоматически списать баннер, оракал, диоды и люверсы"
            >
              <Package className="w-4 h-4 text-amber-100" />
              {isDeductingStock ? "Списание..." : "Списать материалы"}
            </button>
          )}

          {/* Трекер для заказчика */}
          <div className="flex items-center gap-1">
            <a
              href={`/track/${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Открыть публичный онлайн-трекер для заказчика (без внутренних цен и маржи)"
            >
              <ExternalLink className="w-4 h-4 text-purple-600" />
              Трекер
            </a>
            <button
              onClick={copyTrackerLink}
              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition"
              title="Скопировать ссылку на трекер для отправки заказчику"
            >
              {copiedTracker ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-purple-600" />
              )}
            </button>
          </div>

          <button
            onClick={() => setIsProposalOpen(true)}
            className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="Открыть Коммерческое предложение для клиента с макетом и сметой"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            КП клиенту
          </button>

          <button
            onClick={() => setIsActOpen(true)}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="Открыть Акт сдачи-приемки работ и Гарантийный талон на 12 месяцев"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Акт & Гарантия
          </button>

          {order.status !== "READY" && order.status !== "COMPLETED" ? (
            <button
              onClick={() => updateField({ status: "READY" })}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 active:scale-95"
              title="Отметить заказ как готовый к выдаче (снимает тревогу дедлайна)"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{order.assignedTo?.name === "Альберт" ? "✅ Напечатан (Готов)" : "✅ Отметить готовым"}</span>
            </button>
          ) : order.status === "READY" ? (
            <span className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Готов к выдаче</span>
            </span>
          ) : null}

          <button
            onClick={() => setIsPrintOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            Наряд цеха
          </button>

          {currentUser?.role === "DIRECTOR" && (
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              title="Удалить наряд (только Директор)"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левые 2/3: Спецификация, Дедлайн, Клиент */}
        <div className="lg:col-span-2 space-y-6">
          {/* Информационный блок дедлайна и заказчика */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Клиент */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Заказчик:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copyTrackerLink}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[10px] transition"
                      title="Скопировать ссылку на онлайн-трекер для отправки клиенту"
                    >
                      {copiedTracker ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-purple-600" />}
                      <span>{copiedTracker ? "Скопировано!" : "Трекер"}</span>
                    </button>
                    <button
                      onClick={() => setIsWhatsAppOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[10px] transition"
                      title="Отправить сообщение о готовности или запросить отзыв"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-700" />
                      <span>WhatsApp / TG</span>
                    </button>
                  </div>
                </div>
                <div className="font-bold text-sm text-slate-900">{order.client?.name}</div>
                {order.client?.company && <div className="text-slate-600">{order.client.company}</div>}
                {order.client?.phone && <div className="font-mono text-slate-700">{order.client.phone}</div>}
              </div>

              {/* Срок сдачи (Дедлайн) */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                order.status !== "READY" && order.status !== "COMPLETED" && deadlineInfo.isUrgent
                  ? "bg-red-50/80 border-red-300"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Срок исполнения (Дедлайн):</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-sm">
                  <Clock className="w-4 h-4 text-teal-600" />
                  {formatDateTime(order.deadline)}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs border font-bold ${deadlineInfo.badgeClass}`}>
                    {deadlineInfo.label}
                  </span>
                  {order.status !== "READY" && order.status !== "COMPLETED" && deadlineInfo.isUrgent && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded animate-pulse">
                      <Flame className="w-3 h-3 fill-red-600 text-red-600 shrink-0" />
                      ГОРИТ ДЕДЛАЙН (НЕ ГОТОВ!)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(order.installAddress || order.notes) && (
              <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                {order.installAddress && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>Адрес монтажа: <b>{order.installAddress}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://yandex.ru/maps/?text=${encodeURIComponent(order.installAddress)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition"
                        title="Построить маршрут для Chevrolet Labo"
                      >
                        <Compass className="w-3.5 h-3.5 text-amber-600" />
                        <span>Яндекс Навигатор</span>
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.installAddress)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition"
                      >
                        <NavIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google Maps</span>
                      </a>
                    </div>
                  </div>
                )}
                {order.notes && (
                  <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200 text-slate-700">
                    Примечание цеху: {order.notes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Превью эскиза макета (если загружен) */}
          {order.previewUrl && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-teal-600" />
                Эскиз макета / Чертеж изделия
              </h3>
              <img src={order.previewUrl} alt="Эскиз" className="max-h-72 mx-auto rounded-xl shadow-xs border" />
            </div>
          )}

          {/* Файлы макета для печати и ЧПУ (CorelDRAW, TIFF 150 DPI) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-teal-600" />
                Файлы макета для печати & ЧПУ (CorelDRAW, TIFF, PDF)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Для печатника Альберта & ЧПУ
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <FolderOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Путь к файлу (D:\МАКЕТЫ\2026\Вывеска.cdr) или ссылка (TG, Drive)..."
                    value={filePathInput}
                    onChange={(e) => setFilePathInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveFilePath}
                  disabled={savingFile}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shrink-0 shadow-xs disabled:opacity-50"
                >
                  {savingFile ? "..." : "Сохранить"}
                </button>
              </div>

              {savedFilePath && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 text-slate-700">
                  <div className="truncate font-mono text-[11px] text-slate-800">
                    📂 Файл: <b>{savedFilePath}</b>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(savedFilePath);
                        setCopiedPath(true);
                        setTimeout(() => setCopiedPath(false), 2000);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPath ? "Скопирован!" : "Копировать путь"}</span>
                    </button>
                    {savedFilePath.startsWith("http") && (
                      <a
                        href={savedFilePath}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>Открыть</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Цеховой чек-лист допечатной подготовки */}
              <div className="pt-1.5 flex flex-wrap gap-2 text-[10px] text-slate-500 border-t border-slate-200/60">
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">✓ CMYK</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">✓ 150 DPI без слоев</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">✓ Тексты в кривых (Curves)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">✓ Припуск под люверсы 5 см</span>
              </div>
            </div>
          </div>

          {/* Спецификация изделий */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Спецификация заказа ({order.items?.length || 0} поз.)
              </h3>
            </div>

            <div className="space-y-3">
              {order.items?.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-200 font-bold text-xs flex items-center justify-center text-slate-700 shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                      {item.options && <div className="text-xs text-slate-500 mt-0.5">{item.options}</div>}
                      {item.letterText && (
                        <div className="text-xs font-semibold text-orange-700 mt-0.5">
                          Текст букв: &laquo;{item.letterText}&raquo;
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                        {item.area ? <span>Площадь: {item.area} м²</span> : null}
                        {item.letterCount ? (
                          <span>Символов: {item.letterCount} шт × {item.letterHeight} см</span>
                        ) : null}
                        <span>Тариф: {formatCurrency(item.unitPrice)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Итого:</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Списанные материалы со склада */}
            {order.movements && order.movements.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Списанные материалы со склада цеха ({order.movements.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {order.movements.map((mov: any) => (
                    <div key={mov.id} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-emerald-950">{mov.material?.name || "Материал"}</div>
                        <div className="text-[10px] text-emerald-700">{mov.description}</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 text-xs shrink-0 ml-2">
                        -{mov.quantity} {mov.material?.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Чек-лист контроля качества цеха (ОТК перед сдачей) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Контроль качества цеха (Чек-лист перед сдачей)
                </h3>
              </div>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                qaChecks.every(Boolean)
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}>
                {qaChecks.filter(Boolean).length} из 6 проверено {qaChecks.every(Boolean) && "✓"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { title: "💡 Светотехника", desc: "Все диоды горят ровно, нет мерцания и темных углов" },
                { title: "💧 Блоки питания IP67", desc: "Герметичные соединения, термоусадка, запас по мощности" },
                { title: "📐 Металлокаркас", desc: "Швы зачищены, прогрунтован от коррозии, геометрия верна" },
                { title: "🎯 Лицевой акрил & Пленка", desc: "Защитная пленка снята, царапины и пузыри отсутствуют" },
                { title: "⚓ Надежность крепежа", desc: "Анкерные болты затянуты, выдержит ветровую нагрузку" },
                { title: "📄 Акт & Гарантия 12 мес", desc: "Документы переданы заказчику, электронный паспорт активен" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleQaCheck(idx)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    qaChecks[idx]
                      ? "bg-teal-50/70 border-teal-300 text-teal-950"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                    qaChecks[idx] ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300 bg-white"
                  }`}>
                    {qaChecks[idx] && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs block">{item.title}</span>
                    <span className="text-[11px] text-slate-500">{item.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Рабочий чат / Фотоотчеты цеха и монтажа */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
                Фотоотчеты цеха и ход работ ({order.comments?.length || 0})
              </h3>
              <span className="text-[11px] text-slate-400">Отчеты мастеров со смартфона</span>
            </div>

            {/* Список отчетов / комментариев */}
            <div className="space-y-3">
              {order.comments && order.comments.length > 0 ? (
                order.comments.map((comm: any) => (
                  <div key={comm.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center">
                          {comm.authorName ? comm.authorName[0] : "М"}
                        </span>
                        <span className="font-bold text-slate-900">{comm.authorName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTime(comm.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 whitespace-pre-wrap pl-8">{comm.text}</p>

                    {comm.photoUrl && (
                      <div className="pl-8 pt-1">
                        <img
                          src={comm.photoUrl}
                          alt="Фотоотчет"
                          className="max-h-60 rounded-xl border border-slate-200 object-cover shadow-xs cursor-pointer hover:opacity-95 transition"
                          onClick={() => window.open(comm.photoUrl, "_blank")}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  Пока нет отчетов мастеров. Добавьте первый статус ниже!
                </div>
              )}
            </div>

            {/* Форма добавления отчета / фото */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Добавить отчет мастера:</span>
              
              {/* Быстрые шаблоны */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "🖨️ Баннер отпечатан, сохнет",
                  "🔨 Каркас сварен, люверсы установлены",
                  "💡 Буквы склеены, диоды горят",
                  "🚚 Выехали на монтаж",
                  "✅ Монтаж на объекте завершен",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewCommentText(preset)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none"
                >
                  <option value="Абзал (Мастер сборки & Монтаж)">Абзал (Сборка & Монтаж)</option>
                  <option value="Альберт (Мастер & Печатник)">Альберт (Печатник)</option>
                  <option value="Жалгас (Дизайнер & Продажи)">Жалгас (Менеджер/Дизайн)</option>
                  <option value="Тимур (Директор)">Тимур (Директор)</option>
                </select>

                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Напишите комментарий или статус..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Прикрепление фото с камеры / галереи */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    <span>{commentPhoto ? "Фото выбрано ✓" : "Прикрепить фото / камеру"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImage(file);
                            setNewCommentPhoto(compressed);
                          } catch (err) {
                            console.error("Image compression error", err);
                          }
                        }
                      }}
                    />
                  </label>
                  {commentPhoto && (
                    <button
                      type="button"
                      onClick={() => setNewCommentPhoto(null)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Удалить фото
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={submittingComment || (!newCommentText.trim() && !commentPhoto)}
                  onClick={handleAddComment}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs"
                >
                  {submittingComment ? "Отправка..." : "Отправить отчет"}
                </button>
              </div>

              {commentPhoto && (
                <div className="pt-2">
                  <img src={commentPhoto} alt="Превью" className="max-h-36 rounded-xl border border-slate-200" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Правая колонка: Для мастеров — параметры цеха, для директора и менеджера — оплаты */}
        <div className="space-y-6">
          {currentUser?.role === "WORKSHOP_ASSEMBLY" || currentUser?.role === "WORKSHOP_PRINTING" ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-teal-600" />
                Параметры наряда цеха
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Сумма наряда:</span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Ответственный мастер:</span>
                  <span className="font-bold text-slate-800">
                    {order.assignedTo?.name || "Не назначен"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Позиций в наряде:</span>
                  <span className="font-bold font-mono text-slate-800">
                    {order.items?.length || 0} поз.
                  </span>
                </div>

                {order.installAddress && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Адрес монтажа:</div>
                    <div className="font-semibold text-slate-800">{order.installAddress}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-teal-600" />
                Финансовый баланс наряда
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Сумма заказа:</span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 font-semibold">Оплачено (Аванс):</span>
                  <span className="text-base font-black font-mono text-emerald-700">
                    {formatCurrency(order.paidAmount)}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl border ${order.debtAmount > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-slate-600 font-semibold">Остаток долга:</span>
                  <span className={`text-base font-black font-mono ${order.debtAmount > 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {formatCurrency(order.debtAmount)}
                  </span>
                </div>
              </div>

              {order.debtAmount > 0 && (
                <button
                  onClick={() => {
                    setPaymentAmount(String(order.debtAmount));
                    setIsPaymentModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Внести оплату ({formatCurrency(order.debtAmount)})
                </button>
              )}

              {/* Журнал платежей */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  История оплат ({order.payments?.length || 0})
                </span>

                <div className="space-y-2">
                  {order.payments?.map((p: any) => (
                    <div
                      key={p.id}
                      className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold font-mono text-emerald-700">
                          +{formatCurrency(p.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.method === "CASH" ? "Наличные" : p.method === "CARD" ? "Click / Карта" : "Безнал"}
                          {p.notes ? ` • ${p.notes}` : ""}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(p.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модалка внесения оплаты */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">
              Принять оплату по наряду {order.orderNumber}
            </h3>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Сумма платежа
                </label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Способ платежа
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(["CASH", "CARD", "TRANSFER"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2 rounded-lg font-bold border transition ${
                        paymentMethod === m
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {m === "CASH" ? "Нал" : m === "CARD" ? "Click/Карта" : "Безнал"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Примечание / Назначение
                </label>
                <input
                  type="text"
                  placeholder="Окончательный расчёт"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              {currentUser?.role === "SALES_DESIGNER" && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] leading-relaxed">
                  ℹ️ Платеж от клиента получит статус <b>«Ожидает подтверждения»</b> и поступит на утверждение директору (Тимуру) для официального зачисления в кассу.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
                >
                  {currentUser?.role === "SALES_DESIGNER" ? "Зафиксировать оплату" : "Внести в кассу"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Печать наряда цеха */}
      <PrintReceipt
        order={order}
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
      />

      {/* Коммерческое предложение для клиента */}
      <CommercialProposal
        order={order}
        isOpen={isProposalOpen}
        onClose={() => setIsProposalOpen(false)}
      />

      {/* Акт приема-передачи и гарантия 12 месяцев */}
      <AcceptanceAct
        order={order}
        isOpen={isActOpen}
        onClose={() => setIsActOpen(false)}
      />

      {/* Модальное окно сообщений клиенту в WhatsApp / Telegram */}
      {order.client && (
        <ClientWhatsAppModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          client={order.client}
          order={order}
        />
      )}
    </div>
  );
}
