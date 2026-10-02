"use client";

import React, { useState } from "react";
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Layers, 
  AlertCircle,
  Clock,
  MapPin,
  User,
  Calculator,
  Flame,
  Check
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface EditOrderModalProps {
  order: any;
  employees: any[];
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: any) => void;
}

const SERVICE_TYPES = [
  { value: "BANNER", label: "Печать баннера 3.2м" },
  { value: "ORACAL", label: "Пленка Oracal / накатка" },
  { value: "LIGHTBOX", label: "Лайтбокс / Световой короб" },
  { value: "LETTERS", label: "Объемные буквы LED" },
  { value: "STAND", label: "Стенд (Фомекс / Оргстекло)" },
  { value: "INSTALL", label: "Монтажные работы" },
  { value: "AUTO_BRANDING", label: "Брендирование авто" },
  { value: "CUSTOM", label: "Прочее / Дизайн" },
];

export function EditOrderModal({
  order,
  employees,
  isOpen,
  onClose,
  onOrderUpdated,
}: EditOrderModalProps) {
  if (!isOpen || !order) return null;

  // Форма заказа
  const [title, setTitle] = useState(order.title || "");
  const [clientName, setClientName] = useState(order.client?.name || "");
  const [clientPhone, setClientPhone] = useState(order.client?.phone || "");
  const [clientCompany, setClientCompany] = useState(order.client?.company || "");
  const [assignedToId, setAssignedToId] = useState(order.assignedToId || "");
  const [status, setStatus] = useState(order.status || "NEW");
  const [priority, setPriority] = useState(order.priority || "NORMAL");
  const [deadline, setDeadline] = useState(
    order.deadline ? new Date(order.deadline).toISOString().slice(0, 16) : ""
  );
  const [installAddress, setInstallAddress] = useState(order.installAddress || "");
  const [notes, setNotes] = useState(order.notes || "");

  // Позиции заказа (Items)
  const [items, setItems] = useState<any[]>(
    (order.items || []).map((it: any) => ({
      id: it.id,
      serviceType: it.serviceType || "CUSTOM",
      title: it.title || "",
      width: it.width ?? "",
      height: it.height ?? "",
      area: it.area ?? "",
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || 0,
      totalPrice: it.totalPrice || 0,
      options: it.options || "",
    }))
  );

  // Финансы
  const [totalAmount, setTotalAmount] = useState<number>(order.totalAmount || 0);
  const [paidAmount, setPaidAmount] = useState<number>(order.paidAmount || 0);
  const [autoCalculateTotal, setAutoCalculateTotal] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Обновление одной позиции
  const handleItemChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const it = { ...next[index], [field]: val };

      // Автоматический пересчет площади и цены
      const w = parseFloat(it.width) || 0;
      const h = parseFloat(it.height) || 0;
      const q = Math.max(1, parseInt(it.quantity) || 1);
      const unit = parseFloat(it.unitPrice) || 0;

      if (field === "width" || field === "height" || field === "quantity" || field === "unitPrice") {
        if (w > 0 && h > 0) {
          const areaPerItem = Math.round(w * h * 100) / 100;
          it.area = Math.round(areaPerItem * q * 100) / 100;
        }
        if (unit > 0) {
          if (w > 0 && h > 0 && it.area) {
            it.totalPrice = Math.round(it.area * unit);
          } else {
            it.totalPrice = Math.round(unit * q);
          }
        }
      }

      next[index] = it;

      // Пересчет общей суммы если включен автоподсчет
      if (autoCalculateTotal) {
        const sum = next.reduce((acc, curr) => acc + (parseFloat(curr.totalPrice) || 0), 0);
        setTotalAmount(sum);
      }

      return next;
    });
  };

  // Добавить позицию
  const addItem = () => {
    const newItem = {
      serviceType: "STAND",
      title: "Стенд из фомекса",
      width: "",
      height: "",
      area: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      options: "",
    };
    setItems([...items, newItem]);
  };

  // Удалить позицию
  const removeItem = (idx: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (autoCalculateTotal) {
        const sum = next.reduce((acc, curr) => acc + (parseFloat(curr.totalPrice) || 0), 0);
        setTotalAmount(sum);
      }
      return next;
    });
  };

  // Отправка формы на сервер
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        title: title.trim(),
        client: {
          name: clientName.trim(),
          phone: clientPhone.trim() || null,
          company: clientCompany.trim() || null,
        },
        assignedToId: assignedToId || null,
        status,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        installAddress: installAddress.trim() || null,
        notes: notes.trim() || null,
        totalAmount: Number(totalAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        debtAmount: Math.max(0, (Number(totalAmount) || 0) - (Number(paidAmount) || 0)),
        items: items.map((it) => ({
          serviceType: it.serviceType,
          title: it.title || "Позиция заказа",
          width: it.width ? parseFloat(it.width) : null,
          height: it.height ? parseFloat(it.height) : null,
          area: it.area ? parseFloat(it.area) : null,
          quantity: Math.max(1, parseInt(it.quantity) || 1),
          unitPrice: parseFloat(it.unitPrice) || 0,
          totalPrice: parseFloat(it.totalPrice) || 0,
          options: it.options || null,
        })),
      };

      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось сохранить изменения");
      }

      onOrderUpdated(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка при сохранении наряда");
    } finally {
      setSaving(false);
    }
  };

  const currentDebt = Math.max(0, (totalAmount || 0) - (paidAmount || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Шапка модального окна */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  Редактирование наряда: {order.orderNumber}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Только для Администратора
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Полный доступ к изменению позиций, цен, оплат, клиента и цехового маршрута
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело формы */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 font-semibold">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Блок 1: Основные реквизиты */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              1. Основная информация наряда
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Название изделия */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Название изделия / проекта *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                  placeholder="Вывеска из букв LED, Стенд из фомекса..."
                />
              </div>

              {/* Статус */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Статус наряда
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="NEW">Новый</option>
                  <option value="DESIGN">Макет (Жалгас)</option>
                  <option value="PRINTING">Печать (Альберт)</option>
                  <option value="ASSEMBLY">Сборка (Абзал)</option>
                  <option value="MOUNTING">Монтаж (Абзал)</option>
                  <option value="READY">Готов к сдаче</option>
                  <option value="COMPLETED">Сдан & Оплачен</option>
                </select>
              </div>

              {/* Мастер цеха */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ответственный мастер
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="">Не назначен</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roleTitle})
                    </option>
                  ))}
                </select>
              </div>

              {/* Приоритет */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Приоритет
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority("NORMAL")}
                    className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl border transition ${
                      priority === "NORMAL"
                        ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Обычный
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("URGENT")}
                    className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition ${
                      priority === "URGENT"
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : "bg-white text-red-600 border-red-200 hover:bg-red-50"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>Срочно 🔥</span>
                  </button>
                </div>
              </div>

              {/* Срок сдачи (Дедлайн) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Срок сдачи (Дедлайн)
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Адрес монтажа */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Адрес монтажа / доставки
                </label>
                <input
                  type="text"
                  value={installAddress}
                  onChange={(e) => setInstallAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                  placeholder="г. Нукус, ул. ..."
                />
              </div>

              {/* Примечания цеху */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Технические примечания для мастеров цеха
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                  placeholder="Особенности сборки, цвет профиля, марка оракала..."
                />
              </div>
            </div>
          </div>

          {/* Блок 2: Данные клиента */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              2. Данные заказчика (Клиент)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ФИО клиента *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                  placeholder="Имя заказчика"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Номер телефона
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none font-mono"
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Организация / Компания
                </label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                  placeholder="ООО, Кафе, Магазин..."
                />
              </div>
            </div>
          </div>

          {/* Блок 3: Позиции заказа (Смета) */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-purple-600" />
                3. Позиции заказа (Смета и изделия)
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Добавить позицию</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-800">
                      Позиция #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                    {/* Тип услуги */}
                    <div className="lg:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Тип изделия
                      </label>
                      <select
                        value={it.serviceType}
                        onChange={(e) => handleItemChange(idx, "serviceType", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                      >
                        {SERVICE_TYPES.map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Название */}
                    <div className="lg:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Наименование позиции
                      </label>
                      <input
                        type="text"
                        value={it.title}
                        onChange={(e) => handleItemChange(idx, "title", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                        placeholder="Стенд из фомекса 5мм, Баннер..."
                      />
                    </div>

                    {/* Ширина */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Ширина (м)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={it.width}
                        onChange={(e) => handleItemChange(idx, "width", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-mono"
                        placeholder="0.60"
                      />
                    </div>

                    {/* Высота */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Высота (м)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={it.height}
                        onChange={(e) => handleItemChange(idx, "height", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-mono"
                        placeholder="0.90"
                      />
                    </div>

                    {/* Количество (шт) с квадратиком */}
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-0.5">
                        Кол-во (шт) *
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleItemChange(idx, "quantity", Math.max(1, (it.quantity || 1) - 1))}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0 border border-slate-300"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className="w-full py-1 text-xs font-black text-center bg-emerald-50 border-2 border-emerald-500 rounded-lg focus:outline-none text-emerald-900 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleItemChange(idx, "quantity", (it.quantity || 1) + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0 border border-slate-300"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Квадратура (м²) */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Площадь (м²)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={it.area}
                        onChange={(e) => handleItemChange(idx, "area", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-mono"
                        placeholder="0.54"
                      />
                    </div>

                    {/* Цена за ед. */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Цена за ед./м²
                      </label>
                      <input
                        type="number"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-mono"
                        placeholder="180000"
                      />
                    </div>

                    {/* Итого за позицию */}
                    <div>
                      <label className="block text-[10px] font-bold text-blue-700 uppercase mb-0.5">
                        Итоговая сумма
                      </label>
                      <input
                        type="number"
                        value={it.totalPrice}
                        onChange={(e) => handleItemChange(idx, "totalPrice", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-black bg-blue-50 border border-blue-400 rounded-lg focus:outline-none text-blue-900 font-mono"
                        placeholder="0"
                      />
                    </div>

                    {/* Опции */}
                    <div className="lg:col-span-6">
                      <input
                        type="text"
                        value={it.options || ""}
                        onChange={(e) => handleItemChange(idx, "options", e.target.value)}
                        className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        placeholder="Опции (люверсы по периметру, проклейка карманов, толщина фомекса 5мм, LED модули...)"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Блок 4: Финансы и расчет долга */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                4. Финансовые расчеты заказа
              </h3>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCalculateTotal}
                  onChange={(e) => setAutoCalculateTotal(e.target.checked)}
                  className="rounded text-blue-500 cursor-pointer"
                />
                <span>Авто-расчет суммы из позиций</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Общая сумма заказа (UZS)
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  disabled={autoCalculateTotal}
                  onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-black bg-white/10 border border-white/20 rounded-xl focus:outline-none font-mono text-white disabled:opacity-80"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 uppercase mb-1">
                  Фактически оплачено (UZS)
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-black bg-emerald-500/20 border border-emerald-400/40 rounded-xl focus:outline-none font-mono text-emerald-300"
                />
                <span className="text-[10px] text-emerald-400/80 mt-1 block">
                  {formatCurrency(paidAmount)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-300 uppercase mb-1">
                  Остаток долга (UZS)
                </label>
                <div className="px-3 py-2 text-sm font-black bg-amber-500/20 border border-amber-400/40 rounded-xl font-mono text-amber-300 flex items-center justify-between">
                  <span>{formatCurrency(currentDebt)}</span>
                  {currentDebt === 0 && (
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                      Оплачен
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Автоматически: Сумма - Оплачено
                </span>
              </div>
            </div>
          </div>

          {/* Кнопки сохранения */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md shadow-purple-600/30 transition flex items-center gap-2 disabled:opacity-50 active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Сохранение наряда..." : "Сохранить изменения (Админ)"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
