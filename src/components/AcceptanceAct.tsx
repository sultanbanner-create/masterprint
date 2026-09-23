"use client";

import React, { useState, useEffect } from "react";
import { Printer, X, Award, ShieldCheck, Phone, MapPin, CheckCircle, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AcceptanceActProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export function AcceptanceAct({ order, isOpen, onClose }: AcceptanceActProps) {
  const [qrCodeData, setQrCodeData] = useState<string>("");

  useEffect(() => {
    if (order?.id) {
      const targetUrl = typeof window !== "undefined"
        ? `${window.location.origin}/orders/${order.id}`
        : `/orders/${order.id}`;

      QRCode.toDataURL(targetUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: "#064e3b",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeData(url))
        .catch((err) => console.error("QR Code error", err));
    }
  }, [order?.id]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-2 sm:p-4 no-print-bg">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-slate-200">
        {/* Панель действий */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm">
              Акт сдачи-приемки работ и Гарантийный талон (12 мес.)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Распечатать Акт
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Печатный лист А4 */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 printable-area space-y-6">
          {/* Шапка: Master Print */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Master Print" 
                className="w-14 h-14 rounded-xl object-cover ring-1 ring-slate-200 shadow-sm" 
              />
              <div>
                <div className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  MASTER <span className="text-blue-600">PRINT</span>
                </div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                  Рекламно-производственная компания «Master Print»
                </p>
                <div className="text-xs text-slate-600 mt-1 font-medium">
                  г. Ташкент • Гарантия на изделия 12 месяцев
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase rounded-lg">
                АКТ ПРИЕМА-ПЕРЕДАЧИ
              </span>
              <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                К наряду № {order.orderNumber}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                г. Нукус, {todayStr}
              </div>
            </div>
          </div>

          <h2 className="text-center text-sm font-black uppercase tracking-wider border-y border-slate-200 py-2">
            АКТ СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ РАБОТ И ГАРАНТИЙНЫЙ СЕРТИФИКАТ
          </h2>

          {/* Стороны договора */}
          <div className="text-xs space-y-2 text-slate-800 leading-relaxed">
            <p>
              Мы, нижеподписавшиеся, представитель Исполнителя (мастер монтажа <b>{order.assignedTo?.name || "Абзал"}</b>) 
              с одной стороны, и представитель Заказчика <b>{order.client?.name}</b> {order.client?.company ? `(${order.client.company})` : ""}, 
              составили настоящий акт о том, что Исполнитель полностью и надлежащим образом выполнил комплекс работ по изготовлению и монтажу рекламных конструкций по адресу:
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
              📍 {order.installAddress || "г. Нукус, объект Заказчика"}
            </div>
          </div>

          {/* Список принятых работ */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Перечень сданных в эксплуатацию конструкций:
            </h3>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 text-center w-10">№</th>
                  <th className="p-2 border-r border-slate-300 text-left">Наименование и параметры</th>
                  <th className="p-2 border-r border-slate-300 text-center w-28">Объем</th>
                  <th className="p-2 text-right w-36">Стоимость (UZS)</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      {item.options && <span className="text-slate-500 text-[11px] block">{item.options}</span>}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">
                      {item.area ? `${item.area} м²` : item.letterCount ? `${item.letterCount} букв` : `${item.quantity || 1} шт`}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                  <td colSpan={3} className="p-2.5 text-right uppercase border-r border-slate-300">
                    Общая стоимость работ:
                  </td>
                  <td className="p-2.5 text-right font-mono text-sm font-black text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Гарантийные обязательства */}
          <div className="border-2 border-emerald-500/50 bg-emerald-50/40 rounded-xl p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА — СРОК 12 МЕСЯЦЕВ (1 ГОД)</span>
              </div>
              <p className="text-emerald-950 leading-relaxed text-[11px]">
                Настоящим Исполнитель гарантирует бесперебойную работу светотехнической части (линзованные LED модули, влагозащитные блоки питания IP67) 
                и устойчивость несущих металлических креплений в течение <b>12 месяцев</b> со дня подписания настоящего акта.
              </p>
              <p className="text-emerald-900 text-[11px]">
                <b>Условия сохранения гарантии:</b> стабильное напряжение питания 220V, отсутствие механических повреждений, 
                попадания посторонних предметов и несанкционированного вскрытия конструкции третьими лицами.
              </p>
            </div>

            {qrCodeData && (
              <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-emerald-300 shadow-xs shrink-0 self-center sm:self-auto text-center">
                <img src={qrCodeData} alt="QR Гарантии" className="w-20 h-20 rounded" />
                <span className="text-[9px] font-black text-emerald-900 uppercase mt-1">
                  Электронный паспорт
                </span>
                <span className="text-[8px] text-emerald-700">
                  Проверка гарантии по QR
                </span>
              </div>
            )}
          </div>

          {/* Претензий нет */}
          <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
            Работы выполнены в полном объеме, в установленные сроки и в строгом соответствии с утвержденным дизайн-макетом. 
            Качество монтажа и подсветки проверено в присутствии Заказчика. Претензий по объему, качеству и срокам Заказчик не имеет.
          </div>

          {/* Подписи сторон */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-1">Работу сдал (Монтажник):</span>
              <div className="text-slate-600">{order.assignedTo?.name || "Абзал"} (Мастер сборки & Монтаж)</div>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <div className="text-[10px] text-slate-400 mt-1">Подпись исполнителя / Дата</div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1">Работу принял (Заказчик):</span>
              <div className="text-slate-600">{order.client?.name}</div>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <div className="text-[10px] text-slate-400 mt-1">Подпись заказчика / Дата</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
