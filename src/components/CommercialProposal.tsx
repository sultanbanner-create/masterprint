"use client";

import React from "react";
import { Printer, X, FileText, CheckCircle, Phone, MapPin, Calendar, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CommercialProposalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export function CommercialProposal({ order, isOpen, onClose }: CommercialProposalProps) {
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
        {/* Панель действий модалки */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-sm">
              Коммерческое предложение для клиента (КП-{order.orderNumber})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Распечатать / Сохранить в PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Лист коммерческого предложения формата А4 */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 printable-area space-y-6">
          {/* Шапка КП: Master Print */}
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
                  Рекламное агентство & Производственный цех
                </p>
                <div className="text-xs text-slate-600 mt-1.5 space-y-0.5 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Отдел продаж & заказов: <b>+998 (90) 123-45-67</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Адрес производства: г. Ташкент / цех Master Print</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black uppercase rounded-lg">
                КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ
              </span>
              <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                № КП-{order.orderNumber}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Дата: {todayStr}
              </div>
              <div className="text-[11px] text-amber-600 font-medium">
                Действительно: 14 календарных дней
              </div>
            </div>
          </div>

          {/* Информация о заказчике */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Заказчик:</span>
              <div className="font-bold text-sm text-slate-900">{order.client?.name}</div>
              {order.client?.company && (
                <div className="text-slate-700 font-semibold mt-0.5">{order.client.company}</div>
              )}
              {order.client?.phone && (
                <div className="font-mono text-slate-600 mt-0.5">{order.client.phone}</div>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Объект / Адрес монтажа:</span>
              <div className="font-semibold text-slate-800">
                {order.installAddress || "Самовывоз со склада производства"}
              </div>
              <div className="text-slate-500 mt-1">
                Проект: <b>{order.title}</b>
              </div>
            </div>
          </div>

          {/* Эскиз / 3D макет (если прикреплен) */}
          {order.previewUrl && (
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Визуализация рекламной конструкции на фасаде:
              </span>
              <img
                src={order.previewUrl}
                alt="Эскиз вывески"
                className="max-h-64 mx-auto rounded-lg border border-slate-200 object-contain shadow-xs"
              />
            </div>
          )}

          {/* Спецификация и расчет стоимости */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Спецификация рекламных конструкций и сметный расчет:
            </h3>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-left">
                  <th className="p-2.5 border-r border-slate-300 text-center w-10">№</th>
                  <th className="p-2.5 border-r border-slate-300">Наименование конструкции / услуги</th>
                  <th className="p-2.5 border-r border-slate-300">Характеристики & Опции</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-20">Объем / Кол-во</th>
                  <th className="p-2.5 border-r border-slate-300 text-right w-28">Цена (UZS)</th>
                  <th className="p-2.5 text-right w-32">Итого (UZS)</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="p-2.5 border-r border-slate-300 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 border-r border-slate-300">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      {item.letterText && (
                        <div className="text-[11px] text-orange-700 font-semibold mt-0.5">
                          Текст букв: &laquo;{item.letterText}&raquo;
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-slate-600 text-[11px]">
                      {item.options || "—"}
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-center font-mono">
                      {item.area ? `${item.area} м²` : item.letterCount ? `${item.letterCount} шт × ${item.letterHeight} см` : `${item.quantity || 1} шт`}
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-right font-mono text-slate-600">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                  <td colSpan={5} className="p-3 text-right text-xs uppercase tracking-wider border-r border-slate-300">
                    Общая стоимость предложения:
                  </td>
                  <td className="p-3 text-right font-mono text-base font-black text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Условия выполнения проекта */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Условия оплаты и гарантии:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li><b>Порядок расчётов:</b> Предоплата 50% при согласовании макета, окончательный расчет 50% после монтажа.</li>
              <li><b>Срок изготовления:</b> 2–4 рабочих дня с момента внесения аванса и утверждения дизайн-макета.</li>
              <li><b>Гарантия качества:</b> <b>12 месяцев (1 год)</b> на светорассеивающий акрил, светодиодные модули LED и герметичные блоки питания IP67.</li>
              <li><b>Монтаж:</b> Включает доставку, подъём на высоту, анкерное крепление к фасаду и подключение к готовой электроточке.</li>
            </ul>
          </div>

          {/* Подписи сторон */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-1">Исполнитель:</span>
              <div className="text-slate-600">OUTDOOR PRODUCTION</div>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <div className="text-[10px] text-slate-400 mt-1">Директор: Тимур / М.П.</div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1">С предложением ознакомлен:</span>
              <div className="text-slate-600">{order.client?.company || order.client?.name}</div>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <div className="text-[10px] text-slate-400 mt-1">Подпись заказчика / Дата</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
