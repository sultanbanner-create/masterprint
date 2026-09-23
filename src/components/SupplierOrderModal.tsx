"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  X, 
  Printer, 
  Copy, 
  Check, 
  Send, 
  MessageSquare, 
  AlertTriangle, 
  ShoppingCart,
  Plus,
  Trash2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StockMaterial {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  costPerUnit: number;
}

interface OrderItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  orderQuantity: number;
  costPerUnit: number;
}

interface SupplierOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: StockMaterial[];
}

export function SupplierOrderModal({
  isOpen,
  onClose,
  materials,
}: SupplierOrderModalProps) {
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierName, setSupplierName] = useState("Поставщик материалов (Реклама)");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Автоматически отбираем материалы с дефицитом (или все, если дефицита нет)
    const lowStock = materials.filter((m) => m.quantity <= m.minThreshold);
    const targetMaterials = lowStock.length > 0 ? lowStock : materials.slice(0, 5);

    const initialItems = targetMaterials.map((m) => {
      const def = Math.max(1, (m.minThreshold * 2) - m.quantity);
      return {
        id: m.id,
        name: m.name,
        unit: m.unit,
        currentStock: m.quantity,
        orderQuantity: def,
        costPerUnit: m.costPerUnit,
      };
    });

    setOrderItems(initialItems);
  }, [isOpen, materials]);

  if (!isOpen) return null;

  const updateQuantity = (id: string, qty: number) => {
    setOrderItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, orderQuantity: Math.max(1, qty) } : i))
    );
  };

  const removeItem = (id: string) => {
    setOrderItems((prev) => prev.filter((i) => i.id !== id));
  };

  const totalEstimatedCost = orderItems.reduce(
    (sum, i) => sum + i.orderQuantity * i.costPerUnit,
    0
  );

  const generateOrderText = () => {
    let text = `Здравствуйте, ${supplierName}!\n`;
    text += `Заявка на материалы для цеха наружной рекламы Outdoor Production:\n\n`;

    orderItems.forEach((item, index) => {
      text += `${index + 1}. ${item.name} — ${item.orderQuantity} ${item.unit}\n`;
    });

    text += `\nОриентировочная сумма: ${formatCurrency(totalEstimatedCost)}\n`;
    text += `Прошу подтвердить наличие на складе и выставить счет / сообщить итоговую стоимость.\n`;
    text += `Спасибо!`;
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateOrderText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = (phone: string) => {
    let cl = phone.replace(/[^0-9]/g, "");
    if (cl.length === 9) cl = "998" + cl;
    return cl;
  };

  const formattedPhone = cleanPhone(supplierPhone);
  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(generateOrderText())}`
    : `https://wa.me/?text=${encodeURIComponent(generateOrderText())}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* Шапка модалки */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">
                Заявка поставщику материалов (Дефицитная ведомость)
              </h2>
              <p className="text-xs text-slate-400">
                Формирование закупки рулонов, акрила, светодиодов для пополнения склада
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Распечатать
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Тело заявки */}
        <div className="p-6 space-y-5">
          {/* Данные поставщика */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs no-print">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Название поставщика / Оптовой базы:
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Например: Oracal Tashkent, Asia Reklama"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Номер телефона поставщика (для WhatsApp):
              </label>
              <input
                type="text"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Таблица закупки */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Позиции к заказу ({orderItems.length})
              </span>
              <span className="text-xs text-slate-500">
                Остаток на складе &bull; Требуемое количество
              </span>
            </div>

            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                Все материалы на складе в достаточном объеме. Дефицита нет.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Материал</th>
                      <th className="p-3 text-center">Остаток</th>
                      <th className="p-3 text-center">В заказ</th>
                      <th className="p-3 text-right">Цена ед.</th>
                      <th className="p-3 text-right">Сумма</th>
                      <th className="p-3 text-center no-print"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="p-3 text-center text-slate-500 font-mono">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={item.orderQuantity}
                              onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                              className="w-16 text-center font-bold font-mono py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            <span className="text-slate-500 text-[11px]">{item.unit}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {formatCurrency(item.costPerUnit)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.orderQuantity * item.costPerUnit)}
                        </td>
                        <td className="p-3 text-center no-print">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Убрать из заявки"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={4} className="p-3 text-right font-bold uppercase text-slate-700">
                        Итоговая расчетная стоимость закупки:
                      </td>
                      <td className="p-3 text-right font-black font-mono text-sm text-teal-700">
                        {formatCurrency(totalEstimatedCost)}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Превью готового текста заявки */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs no-print">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" /> Готовое сообщение для отправки:
              </span>
              <button
                onClick={handleCopy}
                className="text-teal-700 hover:text-teal-800 font-bold text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Скопировано!" : "Копировать текст"}</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
              {generateOrderText()}
            </pre>
          </div>

          {/* Действия внизу */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 no-print">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 w-full sm:w-auto"
            >
              Закрыть
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md shadow-emerald-600/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Отправить в WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
