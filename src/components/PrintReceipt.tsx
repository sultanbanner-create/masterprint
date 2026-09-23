"use client";

import React, { useState, useEffect } from "react";
import { Printer, X, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface PrintReceiptProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export function PrintReceipt({ order, isOpen, onClose }: PrintReceiptProps) {
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
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeData(url))
        .catch((err) => console.error("QR Code generation error", err));
    }
  }, [order?.id]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="font-bold text-sm flex items-center gap-2">
            <Printer className="w-4 h-4 text-teal-400" />
            Печать наряда: {order.orderNumber}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              Распечатать
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 text-slate-900 bg-white">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                ПРОИЗВОДСТВЕННЫЙ НАРЯД-ЗАКАЗ № {order.orderNumber}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Цех наружной рекламы &bull; Мастера: Альберт, Абзал, Жалгас
              </p>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono text-slate-600">Дата: {formatDateTime(order.createdAt)}</div>
              {order.deadline && (
                <div className="font-bold text-red-700 mt-1">
                  Срок сдачи: {formatDateTime(order.deadline)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 items-center">
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Заказчик:</span>
              <span className="font-bold text-sm text-slate-900">{order.client?.name}</span>
              {order.client?.company && <div className="text-slate-600">{order.client.company}</div>}
              {order.client?.phone && <div className="font-mono text-slate-700">{order.client.phone}</div>}
            </div>

            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Мастер / Монтаж:</span>
              <span className="font-bold text-sm text-slate-900">
                Ответственный: {order.assignedTo ? order.assignedTo.name : "Не назначен"}
              </span>
              <div className="text-slate-600 mt-0.5">
                Адрес: {order.installAddress || "Самовывоз из цеха"}
              </div>
            </div>

            {qrCodeData && (
              <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 justify-self-start sm:justify-self-end">
                <img src={qrCodeData} alt="QR наряда" className="w-16 h-16 rounded" />
                <div className="text-[10px] leading-tight">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-teal-600" /> Скан наряда
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Откроет фотоотчет и статус на телефоне
                  </div>
                </div>
              </div>
            )}
          </div>

          {order.previewUrl && (
            <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                Эскиз изделия / макет:
              </span>
              <img src={order.previewUrl} alt="Эскиз" className="max-h-48 mx-auto rounded shadow-xs" />
            </div>
          )}

          <div>
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="p-2 border border-slate-300">№</th>
                  <th className="p-2 border border-slate-300">Наименование и параметры</th>
                  <th className="p-2 border border-slate-300 text-center">Объем / Размеры</th>
                  <th className="p-2 border border-slate-300 text-right">Тариф</th>
                  <th className="p-2 border border-slate-300 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, i: number) => (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="p-2 border border-slate-300 text-center font-bold text-slate-500">{i + 1}</td>
                    <td className="p-2 border border-slate-300">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      {item.options && <div className="text-[10px] text-slate-500">{item.options}</div>}
                      {item.letterText && (
                        <div className="text-[10px] text-orange-800 font-semibold">
                          Текст букв: &laquo;{item.letterText}&raquo;
                        </div>
                      )}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-mono">
                      {item.area ? `${item.area} м²` : ""}
                      {item.letterCount ? `${item.letterCount} букв × ${item.letterHeight} см` : ""}
                      {!item.area && !item.letterCount ? `${item.quantity} шт.` : ""}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-bold">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-1">
              <div className="flex justify-between py-1 border-b">
                <span>Итого по наряду:</span>
                <span className="font-bold font-mono text-sm">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b text-emerald-700 font-semibold">
                <span>Внесённый аванс:</span>
                <span className="font-mono">{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-sm text-slate-900">
                <span>Остаток долга:</span>
                <span className={`font-mono ${order.debtAmount > 0 ? "text-red-600 font-black" : "text-emerald-700"}`}>
                  {formatCurrency(order.debtAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t grid grid-cols-2 gap-8 text-xs text-slate-700">
            <div>
              <div className="mb-6">Заказчик: __________________ / {order.client?.name} /</div>
              <div className="text-[10px] text-slate-400">Претензий к макету и качеству не имею</div>
            </div>
            <div>
              <div className="mb-6">Мастер цеха: __________________</div>
              <div className="text-[10px] text-slate-400">Отметка о готовности к отгрузке / монтажу</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
