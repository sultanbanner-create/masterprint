"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, X, Send, Copy, Check, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ClientWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    name: string;
    phone?: string | null;
    company?: string | null;
  };
  order?: {
    id?: number;
    orderNumber: string;
    title: string;
    totalAmount: number;
    debtAmount: number;
    installAddress?: string | null;
  };
}

export function ClientWhatsAppModal({
  isOpen,
  onClose,
  client,
  order,
}: ClientWhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<"READY" | "TRACK" | "REVIEW" | "DEBT" | "CUSTOM">("READY");
  const [messageText, setMessageText] = useState("");
  const [copied, setCopied] = useState(false);

  // Очистка номера телефона (для Узбекистана +998)
  const cleanPhone = (phone?: string | null) => {
    if (!phone) return "";
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length === 9) {
      cleaned = "998" + cleaned;
    }
    return cleaned;
  };

  const formattedPhone = cleanPhone(client?.phone);

  useEffect(() => {
    if (!isOpen || !client) return;

    const name = client.name || "Уважаемый клиент";
    const orderNum = order?.orderNumber || "№";
    const title = order?.title || "Рекламная конструкция";
    const total = order ? formatCurrency(order.totalAmount) : "";
    const debt = order ? formatCurrency(order.debtAmount) : "";
    const address = order?.installAddress ? ` по адресу: ${order.installAddress}` : "";

    if (selectedTemplate === "READY") {
      setMessageText(
        `Здравствуйте, ${name}!\n\n` +
        `Ваш заказ № ${orderNum} («${title}») готов в цехе наружной рекламы!\n` +
        (order?.installAddress
          ? `Монтажная бригада готова к выезду на объект${address}.\n\n`
          : `Вы можете забрать готовое изделие из нашего цеха.\n\n`) +
        (order && order.debtAmount > 0
          ? `Остаток к оплате при получении/сдаче: ${debt}.\n\n`
          : `Заказ полностью оплачен. Спасибо за сотрудничество!\n\n`) +
        `С уважением, рекламно-производственная компания Master Print.`
      );
    } else if (selectedTemplate === "TRACK") {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const trackUrl = order?.id ? `${origin}/track/${order.id}` : "";
      setMessageText(
        `Здравствуйте, ${name}!\n\n` +
        `Ваш заказ № ${orderNum} («${title}») находится в работе в нашем цехе.\n\n` +
        `Вы можете отслеживать статус готовности, фото с производства и гарантийный паспорт онлайн:\n` +
        `🔗 ${trackUrl}\n\n` +
        `С уважением, рекламно-производственная компания Master Print.`
      );
    } else if (selectedTemplate === "REVIEW") {
      setMessageText(
        `Здравствуйте, ${name}!\n\n` +
        `Мы завершили монтаж вашей рекламной конструкции «${title}»${address}.\n` +
        `На всю светотехнику и конструктив действует официальная гарантия 12 месяцев!\n\n` +
        `Пожалуйста, уделите полминуты и оцените качество нашей работы — для нас это очень важно:\n` +
        `⭐ Ссылка для отзыва: https://maps.google.com\n\n` +
        `Будем рады новым проектам и оформлению ваших новых филиалов!\n` +
        `Мастер монтажа Абзал и команда Master Print.`
      );
    } else if (selectedTemplate === "DEBT") {
      setMessageText(
        `Здравствуйте, ${name}!\n\n` +
        `Напоминаем об остатке оплаты по наряду № ${orderNum} («${title}»).\n` +
        `Общая сумма заказа: ${total}\n` +
        `Остаток долга: ${debt}\n\n` +
        `Просим произвести расчет наличными, перечислением или через Payme/Click.\n\n` +
        `Благодарим за понимание!\n` +
        `С уважением, Директор Тимур.`
      );
    }
  }, [selectedTemplate, isOpen, client, order]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const telegramUrl = formattedPhone
    ? `https://t.me/+${formattedPhone}`
    : `https://t.me/`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Сообщение заказчику: {client.name}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {client.phone || "Телефон не указан"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Быстрые шаблоны */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Готовые шаблоны цеха наружки:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate("READY")}
                className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                  selectedTemplate === "READY"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                ✅ Готовность
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate("TRACK")}
                className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                  selectedTemplate === "TRACK"
                    ? "bg-purple-50 border-purple-300 text-purple-800 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                🔗 Трекер
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate("REVIEW")}
                className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                  selectedTemplate === "REVIEW"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                ⭐ Запрос отзыва
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate("DEBT")}
                className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                  selectedTemplate === "DEBT"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                💰 Напоминание долга
              </button>
            </div>
          </div>

          {/* Текстовое поле с сообщением */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Текст сообщения (можно редактировать):
              </label>
              <button
                onClick={handleCopy}
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Скопировано!" : "Копировать"}</span>
              </button>
            </div>
            <textarea
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
            />
          </div>

          {/* Действия отправки */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl w-full sm:w-auto"
            >
              Закрыть
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram</span>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md shadow-emerald-600/30"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>В WhatsApp &rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
